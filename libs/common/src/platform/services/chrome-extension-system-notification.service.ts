import { Observable, Subject } from "rxjs";

import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import {
  ButtonLocation,
  SystemNotificationClearInfo,
  SystemNotificationCreateInfo,
  SystemNotificationEvent,
  SystemNotificationServiceAbstraction as SystemNotificationServiceAbstraction,
} from "@bitwarden/common/platform/abstractions/system-notification-service.abstraction";

export class ChromeExtensionSystemNotificationService
  implements SystemNotificationServiceAbstraction
{
  private systemNotificationClickedSubject = new Subject<SystemNotificationEvent>();
  systemNotificationClicked$: Observable<SystemNotificationEvent>;

  constructor(
    private logService: LogService,
    private platformUtilsService: PlatformUtilsService,
  ) {
    this.systemNotificationClicked$ = this.systemNotificationClickedSubject.asObservable();
  }

  async createOSNotification(createInfo: SystemNotificationCreateInfo): Promise<undefined> {
    chrome.notifications.create(createInfo.id, {
      iconUrl: "https://avatars.githubusercontent.com/u/15990069?s=200",
      message: createInfo.title,
      type: "basic",
      title: createInfo.title,
      buttons: createInfo.buttons.map((value) => {
        return { title: value.title };
      }),
    });

    // ESLint: Using addListener in the browser popup produces a memory leak in Safari, use `BrowserApi. addListener` instead (no-restricted-syntax)
    // eslint-disable-next-line no-restricted-syntax
    chrome.notifications.onButtonClicked.addListener(
      (notificationId: string, buttonIndex: number) => {
        this.systemNotificationClickedSubject.next({
          id: notificationId,
          type: createInfo.type,
          buttonIdentifier: buttonIndex,
        });
      },
    );

    // eslint-disable-next-line no-restricted-syntax
    chrome.notifications.onClicked.addListener((notificationId: string) => {
      this.systemNotificationClickedSubject.next({
        id: notificationId,
        type: createInfo.type,
        buttonIdentifier: ButtonLocation.NotificationButton,
      });
    });
    return;
  }

  clearOSNotification(clearInfo: SystemNotificationClearInfo): undefined {
    chrome.notifications.clear(clearInfo.id);
  }

  isSupported(): boolean {
    return true;
  }
}
