export class PhishingDetectionBrowserService {
  static getActiveUrl() {
    return window?.location?.href;
  }
}
