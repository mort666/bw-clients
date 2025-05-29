import { Observable } from "rxjs";

export const ButtonActions = {
  AuthRequestNotification: "authRequestNotification",
};

export type ButtonActionsKeys = (typeof ButtonActions)[keyof typeof ButtonActions];

// This is currently tailored for chrome extension's api, if safari works
// differently where clicking a notification button produces a different
// identifier we need to reconcile that here.
export const ButtonLocation = {
  FirstOptionalButton: 0, // this is the first optional button we can set
  SecondOptionalButton: 1, // this is the second optional button we can set
  NotificationButton: 2, // this is when you click the notification as a whole
};

export type ButtonLocationKeys = (typeof ButtonLocation)[keyof typeof ButtonLocation];

export type SystemNotificationsButton = {
  title: string;
};

export type SystemNotificationCreateInfo = {
  id: string;
  type: ButtonActionsKeys;
  title: string;
  body: string;
  buttons: SystemNotificationsButton[];
};

export type SystemNotificationClearInfo = {
  id: string;
};

export type SystemNotificationEvent = {
  id: string;
  type: string;
  buttonIdentifier: number;
};

export abstract class SystemNotificationService {
  abstract notificationClicked$: Observable<SystemNotificationEvent>;
  abstract create(createInfo: SystemNotificationCreateInfo): Promise<undefined>;
  abstract clear(clearInfo: SystemNotificationClearInfo): undefined;

  /**
   * Used to know if a given platform supports notifications.
   */
  abstract isSupported(): boolean;
}
