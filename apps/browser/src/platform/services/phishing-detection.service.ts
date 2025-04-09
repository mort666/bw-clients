import { Subscription } from "rxjs";

import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { AbstractStorageService } from "@bitwarden/common/platform/abstractions/storage.service";
import { ScheduledTaskNames } from "@bitwarden/common/platform/scheduling";
import { TaskSchedulerService } from "@bitwarden/common/platform/scheduling/task-scheduler.service";

import { PhishingDetectionCommands } from "../../phishing-detection/phishing-detection.enum";
import { BrowserApi } from "../browser/browser-api";
export class PhishingDetectionService {
  private static knownPhishingDomains = new Set<string>();
  private static lastUpdateTime: number = 0;
  private static readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly RETRY_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_RETRIES = 3;
  private static readonly STORAGE_KEY = "phishing_domains_cache";
  private static auditService: AuditService;
  private static logService: LogService;
  private static storageService: AbstractStorageService;
  private static taskSchedulerService: TaskSchedulerService;
  private static updateCacheSubscription: Subscription | null = null;
  private static retrySubscription: Subscription | null = null;
  private static isUpdating = false;
  private static retryCount = 0;

  static initialize(
    auditService: AuditService,
    logService: LogService,
    storageService: AbstractStorageService,
    taskSchedulerService: TaskSchedulerService,
  ) {
    PhishingDetectionService.auditService = auditService;
    PhishingDetectionService.logService = logService;
    PhishingDetectionService.storageService = storageService;
    PhishingDetectionService.taskSchedulerService = taskSchedulerService;

    PhishingDetectionService.setupListeners();

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
    // Clean up any existing subscriptions
    if (this.updateCacheSubscription) {
      this.updateCacheSubscription.unsubscribe();
    }
    if (this.retrySubscription) {
      this.retrySubscription.unsubscribe();
    }

    this.updateCacheSubscription = this.taskSchedulerService.setInterval(
      ScheduledTaskNames.phishingDomainUpdate,
      this.UPDATE_INTERVAL,
    );
  }

  private static scheduleRetry() {
    // If we've exceeded max retries, stop retrying
    if (this.retryCount >= this.MAX_RETRIES) {
      this.logService.warning(
        `Max retries (${this.MAX_RETRIES}) reached for phishing domain update. Will try again in ${this.UPDATE_INTERVAL / (1000 * 60 * 60)} hours.`,
      );
      this.retryCount = 0;
      if (this.retrySubscription) {
        this.retrySubscription.unsubscribe();
        this.retrySubscription = null;
      }
      return;
    }

    // Clean up existing retry subscription if any
    if (this.retrySubscription) {
      this.retrySubscription.unsubscribe();
    }

    // Increment retry count
    this.retryCount++;

    // Schedule a retry in 5 minutes
    this.retrySubscription = this.taskSchedulerService.setInterval(
      ScheduledTaskNames.phishingDomainUpdate,
      this.RETRY_INTERVAL,
    );

    this.logService.info(
      `Scheduled retry ${this.retryCount}/${this.MAX_RETRIES} for phishing domain update in ${this.RETRY_INTERVAL / (1000 * 60)} minutes`,
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

  static checkUrl(inputUrl: string): boolean {
    const url = new URL(inputUrl);

    return url ? PhishingDetectionService.knownPhishingDomains.has(url.hostname) : false;
  }

  static async updateKnownPhishingDomains(): Promise<void> {
    // Prevent concurrent updates
    if (this.isUpdating) {
      this.logService.warning("Update already in progress, skipping...");
      return;
    }

    this.isUpdating = true;
    try {
      this.logService.info("Starting phishing domains update...");
      const domains = await PhishingDetectionService.auditService.getKnownPhishingDomains();
      this.logService.info("Received phishing domains response");

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

      // Reset retry count and clear retry subscription on success
      this.retryCount = 0;
      if (this.retrySubscription) {
        this.retrySubscription.unsubscribe();
        this.retrySubscription = null;
      }

      this.logService.info(
        `Successfully updated phishing domains cache with ${this.knownPhishingDomains.size} domains`,
      );
    } catch (error) {
      this.logService.error("Error details:", error);
      if (
        error?.message?.includes("Access token not found") ||
        error?.message?.includes("Failed to decode access token")
      ) {
        this.logService.info(
          "Authentication required for phishing domain update, will retry when authenticated",
        );
        this.scheduleRetry();
      } else {
        PhishingDetectionService.logService.error("Failed to update phishing domains:", error);
        throw error;
      }
    } finally {
      this.isUpdating = false;
    }
  }

  static cleanup() {
    if (this.updateCacheSubscription) {
      this.updateCacheSubscription.unsubscribe();
      this.updateCacheSubscription = null;
    }
    if (this.retrySubscription) {
      this.retrySubscription.unsubscribe();
      this.retrySubscription = null;
    }
    this.knownPhishingDomains.clear();
    this.lastUpdateTime = 0;
    this.isUpdating = false;
    this.retryCount = 0;
  }

  /*
    This listener will check the URL when the tab has finished loading.
  */
  static setupCheckUrlListener(): void {
    BrowserApi.addListener(chrome.runtime.onMessage, async (message, sender, sendResponse) => {
      if (message.command === PhishingDetectionCommands.CheckUrl) {
        const { activeUrl } = message;

        const result = { isPhishingDomain: PhishingDetectionService.checkUrl(activeUrl) };

        PhishingDetectionService.logService.debug("CheckUrl handler", { result, message });
        sendResponse(result);
      }
    });
  }

  static setupRedirectToWarningPageListener(): void {
    BrowserApi.addListener(chrome.runtime.onMessage, async (message, sender, sendResponse) => {
      if (message.command === PhishingDetectionCommands.RedirectToWarningPage) {
        PhishingDetectionService.logService.debug("RedirectToWarningPage handler", {
          message,
        });

        await chrome.tabs.update(sender.tab.id, { url: message.url });
      }
    });
  }

  static setupListeners(): void {
    this.setupCheckUrlListener();
    this.setupRedirectToWarningPageListener();
  }
}
