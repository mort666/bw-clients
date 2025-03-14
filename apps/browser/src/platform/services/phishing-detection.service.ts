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
  static updateKnownPhishingDomains(): void {}

  // @TODO: This can be remove once we implement the real code.
  static loadMockedData() {
    PhishingDetectionService.knownPhishingDomains.add("google.com");
    PhishingDetectionService.knownPhishingDomains.add("atlassian.net");
  }

  static async getActiveUrl(): Promise<string> {
    const win = await BrowserApi.getCurrentWindow();
    const currentWindow = await BrowserApi.tabsQuery({ windowId: win.id, active: true });

    // @TODO: Account for cases with no active windows.
    return currentWindow[0].url;
  }

  // @TODO: WIP. We can have a pop-up or send a notification to other services.
  static notifyUser(url: string) {
    const phishingDivId = "phishing-notification-bar";
    const message = `${url} is a known phishing site`;

    const wrapper = document.createElement("div");
    wrapper.id = phishingDivId;
    wrapper.classList.add("inner-wrapper");
    wrapper.style.position = "fixed";
    wrapper.style.top = "20px";
    wrapper.style.right = "20px";
    wrapper.style.zIndex = "10000";
    wrapper.style.backgroundColor = "#fff";
    wrapper.style.padding = "15px";
    wrapper.style.border = "1px solid #ccc";
    wrapper.style.borderRadius = "5px";
    wrapper.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";

    const messageElement = document.createElement("div");
    messageElement.id = "change-text";
    messageElement.classList.add("notification-body");
    messageElement.textContent = message;

    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.id = "change-exit";
    exitButton.classList.add("primary");
    exitButton.textContent = "Exit the page";

    exitButton.onclick = () => {
      const barEl = document.getElementById(phishingDivId);
      if (barEl != null) {
        barEl.parentElement.removeChild(barEl);
      }
    };

    wrapper.appendChild(messageElement);
    wrapper.appendChild(exitButton);

    document.body.appendChild(wrapper);

    setTimeout(() => {
      console.log("Jimmy inject 7");
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }, 10000);
  }

  /*
    This listener will check the URL when the tab has finished loading.
  */
  setupTabEventListeners(): void {
    BrowserApi.addListener(chrome.tabs.onUpdated, async (tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete") {
        const activeUrl = await PhishingDetectionService.getActiveUrl();

        // Debugging
        console.log("Tab changed:", { tab, changeInfo, tabId });

        const isPhishingDomain = PhishingDetectionService.checkUrl(activeUrl);

        if (isPhishingDomain) {
          PhishingDetectionService.notifyUser(activeUrl);
        }
      }
    });
  }
}

// Initializing the data for local development
PhishingDetectionService.loadMockedData();
