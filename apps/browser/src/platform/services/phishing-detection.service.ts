import { Utils } from "@bitwarden/common/platform/misc/utils";

import { BrowserApi } from "../browser/browser-api";

export class PhishingDetectionService {
  private static knownPhishingDomains = new Set();

  static checkUrl(url: string): boolean {
    const domain = Utils.getDomain(url);
    return PhishingDetectionService.knownPhishingDomains.has(domain);
  }

  // @TODO: We need to flesh this out to actually use the real data that comes from the server.
  // This method can be run using a background worker once a day or at a similar interval.
  static updateKnownPhishingDomains(): void {
    PhishingDetectionService.loadMockedData();
  }

  // @TODO: This can be remove once we implement the real code.
  private static loadMockedData() {
    PhishingDetectionService.knownPhishingDomains.add("google.com");
    PhishingDetectionService.knownPhishingDomains.add("atlassian.net");
  }

  async getActiveUrl(): Promise<string> {
    const win = await BrowserApi.getCurrentWindow();
    const currentWindow = await BrowserApi.tabsQuery({ windowId: win.id, active: true });

    // @TODO: Account for cases with no active windows.
    return currentWindow[0].url;
  }
}
