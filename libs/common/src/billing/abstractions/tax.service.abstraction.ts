import { CountryListItem } from "@bitwarden/common/billing/models/domain";

export abstract class TaxServiceAbstraction {
  getCountries: () => CountryListItem[];

  /**
   * Whether the country supports tax.
   */
  getSupportedCountries: () => string[];
}
