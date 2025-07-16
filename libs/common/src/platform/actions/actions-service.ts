export abstract class ActionsService {
  /**
   * Opens the popup.
   */
  abstract openPopup(): Promise<void>;

  /**
   * Opens the popup and navigates to a url.
   *
   * Stubbed for now.
   *
   * @param url
   */
  abstract openPopupToUrl(url: string): Promise<void>;
}
