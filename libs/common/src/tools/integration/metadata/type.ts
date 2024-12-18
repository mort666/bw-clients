import { FieldsBySite, Site, VendorsByExtension } from "./data";

/** well-known name for a feature extensible through an integration. */
export type ExtensionSite = keyof typeof Site;

/** well-known name for a field surfaced from an extension site to a vendor. */
export type DisclosedField = (typeof FieldsBySite)[ExtensionSite][number];

/** Identifies a vendor integrated into bitwarden */
export type VendorId = (typeof VendorsByExtension)[ExtensionSite][number];

/** The capabilities and descriptive content for an integration */
export type ExtensionMetadata = {
  /** Uniquely identifies the integrator. */
  id: ExtensionSite;

  /** Lists the fields disclosed by the extension to the vendor */
  availableFields: DisclosedField[];
};

/** Catalogues an integration's hosting status.
 *  selfHost: "never" always uses the service's base URL
 *  selfHost: "maybe" allows the user to override the service's
 *    base URL with their own.
 *  selfHost: "always" requires a base URL.
 */
export type ApiHost =
  | { selfHost: "never"; baseUrl: string }
  | { selfHost: "maybe"; baseUrl: string }
  | { selfHost: "always" };

/** The capabilities and descriptive content for an integration */
export type VendorMetadata = {
  /** Uniquely identifies the integrator. */
  id: VendorId;

  /** Brand name of the integrator. */
  name: string;
};

/** Describes an integration provided by a vendor */
export type IntegrationMetadata = {
  /** The part of Bitwarden extended by the vendor's services */
  extension: ExtensionMetadata;

  /** Product description */
  product: {
    /** The vendor providing the extension */
    vendor: VendorMetadata;

    /** The branded name of the product, if it varies from the Vendor name */
    name?: string;
  };

  /** Hosting provider capabilities required by the integration  */
  host: ApiHost;

  /** Lists the fields disclosed by the extension to the vendor.
   *  This should be a subset of the `availableFields` listed in
   *  the extension.
   */
  requestedFields: DisclosedField[];
};
