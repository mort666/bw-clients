import { Observable, Subscription } from "rxjs";

import { NotificationId, UserId } from "@bitwarden/common/types/guid";

import { NotificationView } from "../models";

/**
 * A service for retrieving and managing server notifications for end users.
 */
export abstract class EndUserNotificationService {
  /**
   * Observable of all server notifications for the given user.
   * @param userId
   */
  abstract notifications$(userId: UserId): Observable<NotificationView[]>;

  /**
   * Observable of all unread server notifications for the given user.
   * @param userId
   */
  abstract unreadNotifications$(userId: UserId): Observable<NotificationView[]>;

  /**
   * Mark a notification as read.
   * @param notificationId
   * @param userId
   */
  abstract markAsRead(notificationId: NotificationId, userId: UserId): Promise<void>;

  /**
   * Mark a notification as deleted.
   * @param notificationId
   * @param userId
   */
  abstract markAsDeleted(notificationId: NotificationId, userId: UserId): Promise<void>;

  /**
   * Clear all server notifications from state for the given user.
   * @param userId
   */
  abstract clearState(userId: UserId): Promise<void>;

  /**
   * Creates a subscription to listen for end user push server notifications and notification status updates.
   */
  abstract listenForEndUserNotifications(): Subscription;
}
