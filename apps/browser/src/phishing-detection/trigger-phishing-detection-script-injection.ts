import { Utils } from "@bitwarden/common/platform/misc/utils";
import { ConsoleLogService } from "@bitwarden/common/platform/services/console-log.service";

import { PhishingDetectionBrowserService } from "./content/phishing-detection-browser.service";
import { PhishingDetectionCommands } from "./phishing-detection.enum";

const isDev = process.env.ENV === "development";
const logService = new ConsoleLogService(isDev);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPhishingDetectionContent);
} else {
  void loadPhishingDetectionContent();
}

async function loadPhishingDetectionContent() {
  const activeUrl = PhishingDetectionBrowserService.getActiveUrl();

  const { isPhishingDomain } = await chrome.runtime.sendMessage({
    command: PhishingDetectionCommands.CheckUrl,
    activeUrl,
  });

  if (isPhishingDomain) {
    const domain = Utils.getDomain(activeUrl);

    PhishingDetectionBrowserService.notifyUser(domain);
  }
}

logService.info("Phishing Detection Service loaded.");
