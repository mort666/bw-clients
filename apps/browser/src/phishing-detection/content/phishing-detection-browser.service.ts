import { Utils } from "@bitwarden/common/platform/misc/utils";

export class PhishingDetectionBrowserService {
  private static knownPhishingDomains = new Set();

  static checkUrl(url: string): boolean {
    const domain = Utils.getDomain(url);
    return PhishingDetectionBrowserService.knownPhishingDomains.has(domain);
  }

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

    wrapper.appendChild(messageElement);
    wrapper.appendChild(exitButton);

    document.body.appendChild(wrapper);

    setTimeout(() => {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }, 10000);
  }

  static getActiveUrl() {
    return window?.location?.href;
  }

  // @TODO: This can be remove once we implement the real code.
  static loadMockedData() {
    PhishingDetectionBrowserService.knownPhishingDomains.add("google.com");
    PhishingDetectionBrowserService.knownPhishingDomains.add("atlassian.net");
    PhishingDetectionBrowserService.knownPhishingDomains.add("example.com");
    PhishingDetectionBrowserService.knownPhishingDomains.add("w3schools.com");
  }
}

// Initializing the data for local development
PhishingDetectionBrowserService.loadMockedData();
