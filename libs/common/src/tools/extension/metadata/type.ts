import { FieldsBySite, Site, VendorsByExtension } from "./data";

/** well-known name for a feature extensible through an integration. */
export type SiteId = keyof typeof Site;

/** well-known name for a field surfaced from an extension site to a vendor. */
export type DisclosedField = (typeof FieldsBySite)[SiteId][number];

/** Identifies a vendor integrated into bitwarden */
export type VendorId = (typeof VendorsByExtension)[SiteId][number];

/** The capabilities and descriptive content for an integration */
export type SiteMetadata = {
  /** Uniquely identifies the integrator. */
  id: SiteId;

  /** Lists the fields disclosed by the extension to the vendor */
  availableFields: DisclosedField[];
};

type TokenHeader =
  | {
      /** Transmit the token as the value of an `Authentication` header */
      authentication: true;
    }
  | {
      /** Transmit the token as an `Authorization` header and a formatted value
       *  * `bearer` uses OAUTH-2.0 bearer token format
       *  * `token` prefixes the token with "Token"
       *  * `basic-username` uses HTTP Basic authentication format, encoding the
       *     token as the username.
       */
      authorization: "bearer" | "token" | "basic-username";
    };

/** Catalogues an integration's hosting status.
 *  selfHost: "never" always uses the service's base URL
 *  selfHost: "maybe" allows the user to override the service's
 *    base URL with their own.
 *  selfHost: "always" requires a base URL.
 */
export type ApiHost = TokenHeader &
  (
    | { selfHost: "never"; baseUrl: string }
    | { selfHost: "maybe"; baseUrl: string }
    | { selfHost: "always" }
  );

/** The capabilities and descriptive content for an integration */
export type VendorMetadata = {
  /** Uniquely identifies the integrator. */
  id: VendorId;

  /** Brand name of the integrator. */
  name: string;
};

/** Describes an integration provided by a vendor */
export type ExtensionMetadata = {
  /** The part of Bitwarden extended by the vendor's services */
  site: SiteMetadata;

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

/** Identifies a collection of integrations.
 */
export type ExtensionSet =
  | {
      /** A set of integrations sharing an extension point */
      site: SiteId;
    }
  | {
      /** A set of integrations sharing a vendor */
      vendor: VendorId;
    }
  | {
      /** The total set of integrations. This is used to set a categorical
       *  rule affecting all integrations.
       */
      all: true;
    };
