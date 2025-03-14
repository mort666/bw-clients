// eslint-disable-next-line no-restricted-imports
import { PhishingDetectionService } from "src/platform/services/phishing-detection.service";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPhishingDetectionContent);
} else {
  void loadPhishingDetectionContent();
}

async function loadPhishingDetectionContent() {
  const activeUrl = await PhishingDetectionService.getActiveUrl();

  const isPhishingDomain = PhishingDetectionService.checkUrl(activeUrl);

  if (isPhishingDomain) {
    PhishingDetectionService.notifyUser(activeUrl);
  }
}

console.log("Phishing Detection Service loaded.");
