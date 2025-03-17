 
import { Utils } from "@bitwarden/common/platform/misc/utils";

import { PhishingDetectionCommands } from "../../phishing-detection/phishing-detection.enum";
import { BrowserApi } from "../browser/browser-api";

export class PhishingDetectionService {
  private static knownPhishingDomains = new Set();

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
      console.log("Jimmy addListener ", { message });
      if (message.command === PhishingDetectionCommands.CheckUrl) {
        const { activeUrl } = message;

        const result = { isPhishingDomain: PhishingDetectionService.checkUrl(activeUrl) };
        console.log("Jimmy", result);
        sendResponse(result);
      }
    });
  }
}

// Initializing the data for local development
PhishingDetectionService.loadMockedData();
