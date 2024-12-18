import { ExtensionPointId } from "../extension-point-id";

import {
  ExtensionMetadata,
  ExtensionSite,
  IntegrationMetadata,
  VendorId,
  VendorMetadata,
} from "./type";

/** Tracks extension points and the integrations that extend them. */
export class IntegrationRegistry {
  private extensions = new Map<ExtensionSite, ExtensionMetadata>();
  private vendors = new Map<VendorId, VendorMetadata>();
  private integrations = new Map<ExtensionSite, Map<VendorId, IntegrationMetadata>>();

  /** Registers a site supporting extensibility.
   *  @param site - identifies the site being extended
   *  @param meta - configures the extension site
   *  @return self for method chaining.
   */
  registerExtension(meta: ExtensionMetadata): IntegrationRegistry {
    if (!this.extensions.has(meta.id)) {
      this.extensions.set(meta.id, meta);
    }

    return this;
  }

  getExtension(site: ExtensionPointId): ExtensionMetadata | undefined {
    const extension = this.extensions.get(site);
    return extension ? extension : undefined;
  }

  /** Registers a site supporting extensibility.
   *  @param site - identifies the site being extended
   *  @param meta - configures the extension site
   *  @return self for method chaining.
   */
  registerVendor(meta: VendorMetadata): IntegrationRegistry {
    if (!this.vendors.has(meta.id)) {
      this.vendors.set(meta.id, meta);
    }

    return this;
  }

  getVendor(vendorId: VendorId): VendorMetadata | undefined {
    const vendor = this.vendors.get(vendorId);
    return vendor ? vendor : undefined;
  }

  /** Registers an integration provided by a vendor to an extension site.
   *  The vendor and site MUST be registered before the integration.
   *  @param site - identifies the site being extended
   *  @param meta - configures the extension site
   *  @return self for method chaining.
   */
  registerIntegration(meta: IntegrationMetadata): IntegrationRegistry {
    if (!this.extensions.has(meta.extension.id)) {
      throw new Error(`Unrecognized site: ${meta.extension.id}`);
    } else if (!this.vendors.has(meta.product.vendor.id)) {
      throw new Error(`Unrecognized vendor: ${meta.product.vendor.id}`);
    }

    let integrations = this.integrations.get(meta.extension.id);
    if (!integrations) {
      integrations = new Map();
      this.integrations.set(meta.extension.id, integrations);
    }

    if (!integrations.has(meta.product.vendor.id)) {
      integrations.set(meta.product.vendor.id, meta);
    }

    return this;
  }

  getIntegration(site: ExtensionPointId, vendor: VendorId): IntegrationMetadata | undefined {
    return this.integrations.get(site)?.get(vendor) ?? undefined;
  }

  getIntegrations(site: ExtensionPointId): IntegrationMetadata[] {
    const integrations = Array.from(this.integrations.get(site)?.values() ?? []);
    return integrations;
  }
}
