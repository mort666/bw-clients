import { Subscription } from "rxjs";

import { PhishingApiServiceAbstraction } from "@bitwarden/common/abstractions/phishing-api.service.abstraction";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { AbstractStorageService } from "@bitwarden/common/platform/abstractions/storage.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { ScheduledTaskNames } from "@bitwarden/common/platform/scheduling";
import { TaskSchedulerService } from "@bitwarden/common/platform/scheduling/task-scheduler.service";

import { BrowserApi } from "../browser/browser-api";

export class PhishingDetectionService {
  private static knownPhishingDomains = new Set<string>();
  private static lastUpdateTime: number = 0;
  private static readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly STORAGE_KEY = "phishing_domains_cache";
  private static phishingApiService: PhishingApiServiceAbstraction;
  private static logService: LogService;
  private static storageService: AbstractStorageService;
  private static taskSchedulerService: TaskSchedulerService;
  private static updateCacheSubscription: Subscription | null = null;
  private static isUpdating = false;

  static initialize(
    phishingApiService: PhishingApiServiceAbstraction,
    logService: LogService,
    storageService: AbstractStorageService,
    taskSchedulerService: TaskSchedulerService,
  ) {
    PhishingDetectionService.phishingApiService = phishingApiService;
    PhishingDetectionService.logService = logService;
    PhishingDetectionService.storageService = storageService;
    PhishingDetectionService.taskSchedulerService = taskSchedulerService;

    // Register the update task
    this.taskSchedulerService.registerTaskHandler(
      ScheduledTaskNames.phishingDomainUpdate,
      async () => {
        try {
          await this.updateKnownPhishingDomains();
        } catch (error) {
          this.logService.error("Failed to update phishing domains in task handler:", error);
        }
      },
    );

    // Initial load of cached domains
    void this.loadCachedDomains();

    // Set up periodic updates every 24 hours
    this.setupPeriodicUpdates();
  }

  private static setupPeriodicUpdates() {
    // Clean up any existing subscription
    if (this.updateCacheSubscription) {
      this.updateCacheSubscription.unsubscribe();
    }

    this.updateCacheSubscription = this.taskSchedulerService.setInterval(
      ScheduledTaskNames.phishingDomainUpdate,
      this.UPDATE_INTERVAL,
    );
  }

  private static async loadCachedDomains() {
    try {
      const cachedData = await this.storageService.get<{ domains: string[]; timestamp: number }>(
        this.STORAGE_KEY,
      );
      if (cachedData) {
        this.knownPhishingDomains = new Set(cachedData.domains);
        this.lastUpdateTime = cachedData.timestamp;
      }

      // If cache is empty or expired, trigger an immediate update
      if (
        this.knownPhishingDomains.size === 0 ||
        Date.now() - this.lastUpdateTime >= this.UPDATE_INTERVAL
      ) {
        await this.updateKnownPhishingDomains();
      }
    } catch (error) {
      this.logService.error("Failed to load cached phishing domains:", error);
    }
  }

  static checkUrl(url: string): boolean {
    const domain = Utils.getDomain(url);
    return domain ? PhishingDetectionService.knownPhishingDomains.has(domain) : false;
  }

  static async updateKnownPhishingDomains(): Promise<void> {
    // Prevent concurrent updates
    if (this.isUpdating) {
      this.logService.warning("Update already in progress, skipping...");
      return;
    }

    this.isUpdating = true;
    try {
      const domains = await PhishingDetectionService.phishingApiService.getKnownPhishingDomains();

      // Clear old domains to prevent memory leaks
      PhishingDetectionService.knownPhishingDomains.clear();

      // Add new domains
      domains.forEach((domain: string) => {
        if (domain) {
          // Only add valid domains
          PhishingDetectionService.knownPhishingDomains.add(domain);
        }
      });

      PhishingDetectionService.lastUpdateTime = Date.now();

      // Cache the updated domains
      await this.storageService.save(this.STORAGE_KEY, {
        domains: Array.from(this.knownPhishingDomains),
        timestamp: this.lastUpdateTime,
      });
    } catch (error) {
      PhishingDetectionService.logService.error("Failed to update phishing domains:", error);
    } finally {
      this.isUpdating = false;
    }
  }

  static cleanup() {
    if (this.updateCacheSubscription) {
      this.updateCacheSubscription.unsubscribe();
      this.updateCacheSubscription = null;
    }
    this.knownPhishingDomains.clear();
    this.lastUpdateTime = 0;
    this.isUpdating = false;
  }

  static async getActiveUrl(): Promise<string> {
    const win = await BrowserApi.getCurrentWindow();
    const currentWindow = await BrowserApi.tabsQuery({ windowId: win.id, active: true });

    // @TODO: Account for cases with no active windows.
    return currentWindow[0].url;
  }

  // @TODO: WIP. We can have a pop-up or send a notification to other services.
  static notifyUser(url: string) {}

  /*
    This listener will check the URL when the tab has finished loading.
  */
  setupTabEventListeners(): void {
    BrowserApi.addListener(chrome.tabs.onUpdated, async (tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete") {
        const activeUrl = await PhishingDetectionService.getActiveUrl();
        const isPhishingDomain = PhishingDetectionService.checkUrl(activeUrl);

        if (isPhishingDomain) {
          PhishingDetectionService.notifyUser(activeUrl);
        }
      }
    });
  }
}
