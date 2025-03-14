export abstract class PhishingApiServiceAbstraction {
  getKnownPhishingDomains: () => Promise<string[]>;
}
