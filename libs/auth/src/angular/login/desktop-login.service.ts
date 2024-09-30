import { Injectable, NgZone } from "@angular/core";

import { BroadcasterService } from "@bitwarden/common/platform/abstractions/broadcaster.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";

/**
 * Functionality for the desktop login component.
 */
@Injectable({
  providedIn: "root",
})
export class DesktopLoginService {
  private deferFocus: boolean = null;

  constructor(
    private broadcasterService: BroadcasterService,
    private messagingService: MessagingService,
    private ngZone: NgZone,
  ) {}

  /**
   * Sets up the window focus handler.
   *
   * @param focusInputCallback
   */
  setupWindowFocusHandler(focusInputCallback: () => void): void {
    const subscriptionId = "LoginComponent";
    // TODO: refactor to not use deprecated broadcaster service.
    this.broadcasterService.subscribe(subscriptionId, (message: any) => {
      this.ngZone.run(() => {
        if (message.command === "windowIsFocused") {
          this.handleWindowFocus(message.windowIsFocused, focusInputCallback);
        }
      });
    });

    this.messagingService.send("getWindowIsFocused");
  }

  /**
   * Handles the window focus event.
   *
   * @param windowIsFocused
   * @param focusInputCallback
   */
  private handleWindowFocus(windowIsFocused: boolean, focusInputCallback: () => void): void {
    if (this.deferFocus === null) {
      this.deferFocus = !windowIsFocused;
      if (!this.deferFocus) {
        focusInputCallback();
      }
    } else if (this.deferFocus && windowIsFocused) {
      focusInputCallback();
      this.deferFocus = false;
    }
  }
}
