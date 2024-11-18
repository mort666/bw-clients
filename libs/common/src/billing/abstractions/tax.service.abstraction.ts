import { CountryListItem } from "@bitwarden/common/billing/models/domain";
import { TaxIdTypesResponse } from "@bitwarden/common/billing/models/response/tax-id-types.response";

export abstract class TaxServiceAbstraction {
  getTaxIdTypes: () => Promise<TaxIdTypesResponse>;

  getCountries: () => CountryListItem[];

  /**
   * Whether the country supports tax.
   */
  getSupportedCountries: () => string[];
}
