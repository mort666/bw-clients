import { SiteId } from "../type";

import { VendorsByExtension } from "./data";

/** Identifies a vendor extending bitwarden */
export type VendorId = (typeof VendorsByExtension)[SiteId][number];

/** The capabilities and descriptive content for an extension */
export type VendorMetadata = {
  /** Uniquely identifies the vendor. */
  id: VendorId;

  /** Brand name of the service providing the extension. */
  name: string;
};
