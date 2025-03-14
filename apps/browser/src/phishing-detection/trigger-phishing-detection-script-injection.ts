/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
// eslint-disable-next-line no-restricted-imports
import { PhishingDetectionService } from "src/platform/services/phishing-detection.service";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPhishingDetectionContent);
} else {
  void loadPhishingDetectionContent();
}

async function loadPhishingDetectionContent() {
  // Found an issue with the internal PhishingDetectionService not being able to initialize properly.
  // const activeUrl = await PhishingDetectionService.getActiveUrl();
  // const isPhishingDomain = PhishingDetectionService.checkUrl(activeUrl);
  // if (isPhishingDomain) {
  //   PhishingDetectionService.notifyUser(activeUrl);
  // }
}

console.log("Phishing Detection Service loaded.");
