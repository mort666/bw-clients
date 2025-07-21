export abstract class ActionsService {
  /**
   * Opens the popup if it is supported.
   *
   * --- Limitations ---
   *
   * These are conditions that work where can open a popup programmatically from:
   *
   * Safari Web Browser -> Safari Extension
   *   - Requires gesture
   * Chrome Web Browser -> Chrome Extension
   * Chrome Extension Service Worker -> Chrome Extension
   *
   * These are conditions that are known to not work:
   * Firefox Web Browser -> Firefox Extension
   * Vivaldi Extension Background Service Worker -> Vivaldi Extension
   * Safari Extension Background Service Worker -> Safari Extension
   * Firefox Extension Background Service Worker -> Firefox Extension
   * Opera Extension Background Service Worker -> Opera Extension
   *
   * These are unknown conditions:
   * Edge
   */
  abstract openPopup(): Promise<void>;
}
