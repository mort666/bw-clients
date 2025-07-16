import { DeviceType } from "@bitwarden/common/enums";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { ActionsService } from "@bitwarden/common/platform/actions/actions-service";

import { BrowserApi } from "../browser/browser-api";

export class BrowserActionsService implements ActionsService {
  constructor(private platformUtilsService: PlatformUtilsService) {}

  async openPopup(): Promise<void> {
    switch (this.platformUtilsService.getDevice()) {
      case DeviceType.ChromeBrowser:
      case DeviceType.ChromeExtension: {
        const browserAction = BrowserApi.getBrowserAction();

        if ("openPopup" in browserAction && typeof browserAction.openPopup === "function") {
          await browserAction.openPopup();
          return;
        }
        break;
      }
      case DeviceType.SafariBrowser:
      case DeviceType.SafariExtension:
        break;
    }
  }

  openPopupToUrl(url: string): Promise<void> {
    return Promise.resolve(undefined);
  }
}
