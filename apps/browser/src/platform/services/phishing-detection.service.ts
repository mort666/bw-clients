import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";

import { PhishingDetectionCommands } from "../../phishing-detection/phishing-detection.enum";
import { BrowserApi } from "../browser/browser-api";

export class PhishingDetectionService {
  private static knownPhishingDomains = new Set();
  static logService: LogService;

  static Initialize(logService: LogService) {
    PhishingDetectionService.logService = logService;
    PhishingDetectionService.setupCheckUrlListener();

    // Initializing the data for local development
    PhishingDetectionService.loadMockedData();
  }

  static checkUrl(url: string): boolean {
    const domain = Utils.getDomain(url);
    return PhishingDetectionService.knownPhishingDomains.has(domain);
  }

  // @TODO: We need to flesh this out to actually use the real data that comes from the server.
  // This method can be run using a background worker once a day or at a similar interval.
  static updateKnownPhishingDomains(): void {}

  // @TODO: This can be remove once we implement the real code.
  static loadMockedData() {
    PhishingDetectionService.knownPhishingDomains.add("google.com");
    PhishingDetectionService.knownPhishingDomains.add("atlassian.net");
    PhishingDetectionService.knownPhishingDomains.add("example.com");
    PhishingDetectionService.knownPhishingDomains.add("w3schools.com");
  }

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
}
