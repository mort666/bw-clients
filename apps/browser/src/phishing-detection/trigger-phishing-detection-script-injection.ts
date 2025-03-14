/* eslint-disable no-console */
import { PhishingDetectionBrowserService } from "./content/phishing-detection-browser.service";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPhishingDetectionContent);
} else {
  void loadPhishingDetectionContent();
}

async function loadPhishingDetectionContent() {
  const activeUrl = PhishingDetectionBrowserService.getActiveUrl();
  const isPhishingDomain = PhishingDetectionBrowserService.checkUrl(activeUrl);
  if (isPhishingDomain) {
    PhishingDetectionBrowserService.notifyUser(activeUrl);
  }
}

console.log("Phishing Detection Service loaded.");
