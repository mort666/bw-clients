import { filter, mergeMap } from "rxjs";

import { ActionsService } from "@bitwarden/common/platform/actions";
import {
  ButtonActions,
  ButtonLocation,
  SystemNotificationEvent,
  SystemNotificationsService,
} from "@bitwarden/common/platform/notifications/system-notifications-service";
import { UserId } from "@bitwarden/user-core";

import { AuthRequestAnsweringServiceAbstraction } from "../../abstractions/auth-request-answering/auth-request-answering.service.abstraction";

export class AuthRequestAnsweringService implements AuthRequestAnsweringServiceAbstraction {
  constructor(
    private readonly systemNotificationsService: SystemNotificationsService,
    private readonly actionService: ActionsService,
  ) {
    this.systemNotificationsService.notificationClicked$
      .pipe(
        filter(
          (event: SystemNotificationEvent) => event.type === ButtonActions.AuthRequestNotification,
        ),
        mergeMap((event: SystemNotificationEvent) =>
          this.handleAuthRequestNotificationClicked(event),
        ),
      )
      .subscribe();
  }
  async handleAuthRequestNotificationClicked(event: SystemNotificationEvent): Promise<void> {
    if (event.buttonIdentifier === ButtonLocation.NotificationButton) {
      // TODO: Uncomment this before going into review
      // await this.systemNotificationService.clear({
      //   id: event.id,
      // })
      await this.actionService.openPopup();
    }
  }

  async receivedPendingAuthRequest(userId: UserId, notificationId: string): Promise<void> {
    await this.systemNotificationsService.create({
      id: notificationId,
      type: ButtonActions.AuthRequestNotification,
      title: "Test (i18n)",
      body: "Pending Auth Request to Approve (i18n)",
      buttons: [],
    });
  }
}
