import { ExtensionPermission, ExtensionRegistry } from "./extension-registry.abstraction";
import { ExtensionSite } from "./extension-site";
import {
  SiteMetadata,
  SiteId,
  ExtensionMetadata,
  ExtensionSet,
  VendorId,
  VendorMetadata,
} from "./metadata/type";

/** Tracks extension sites and the vendors that extend them. */
export class DefaultExtensionRegistry implements ExtensionRegistry {
  private allRule: ExtensionPermission = "default";

  private siteRegistrations = new Map<SiteId, SiteMetadata>();
  private sitePermissions = new Map<SiteId, ExtensionPermission>();

  private vendorRegistrations = new Map<VendorId, VendorMetadata>();
  private vendorPermissions = new Map<VendorId, ExtensionPermission>();

  private extensions = new Array<ExtensionMetadata>();
  private vendorExtensionsBySite = new Map<SiteId, Map<VendorId, number>>();

  registerSite(meta: SiteMetadata): this {
    if (!this.siteRegistrations.has(meta.id)) {
      this.siteRegistrations.set(meta.id, meta);
    }

    return this;
  }

  sites() {
    const sites: { site: SiteMetadata; permission?: ExtensionPermission }[] = [];

    for (const [k, site] of this.siteRegistrations.entries()) {
      const s: (typeof sites)[number] = { site };
      const permission = this.sitePermissions.get(k);
      if (permission) {
        s.permission = permission;
      }

      sites.push(s);
    }

    return sites;
  }

  registerVendor(meta: VendorMetadata): this {
    if (!this.vendorRegistrations.has(meta.id)) {
      this.vendorRegistrations.set(meta.id, meta);
    }

    return this;
  }

  vendors() {
    const vendors: { vendor: VendorMetadata; permission?: ExtensionPermission }[] = [];

    for (const [k, vendor] of this.vendorRegistrations.entries()) {
      const s: (typeof vendors)[number] = { vendor };
      const permission = this.vendorPermissions.get(k);
      if (permission) {
        s.permission = permission;
      }

      vendors.push(s);
    }

    return vendors;
  }

  setPermission(set: ExtensionSet, permission: ExtensionPermission): this {
    if ("all" in set && set.all) {
      this.allRule = permission;
    } else if ("vendor" in set) {
      this.vendorPermissions.set(set.vendor, permission);
    } else if ("site" in set) {
      this.sitePermissions.set(set.site, permission);
    } else {
      throw new Error(`Unrecognized extension set received: ${JSON.stringify(set)}.`);
    }

    return this;
  }

  permission(set: ExtensionSet) {
    if ("all" in set && set.all) {
      return this.allRule;
    } else if ("vendor" in set) {
      return this.vendorPermissions.get(set.vendor);
    } else if ("site" in set) {
      return this.sitePermissions.get(set.site);
    } else {
      return undefined;
    }
  }

  permissions() {
    const rules: { set: ExtensionSet; permission: ExtensionPermission }[] = [];
    rules.push({ set: { all: true }, permission: this.allRule });

    for (const [site, permission] of this.sitePermissions.entries()) {
      rules.push({ set: { site }, permission });
    }

    for (const [vendor, permission] of this.vendorPermissions.entries()) {
      rules.push({ set: { vendor }, permission });
    }

    return rules;
  }

  registerExtension(meta: ExtensionMetadata): this {
    if (!this.siteRegistrations.has(meta.site.id)) {
      throw new Error(`Unrecognized site: ${meta.site.id}`);
    } else if (!this.vendorRegistrations.has(meta.product.vendor.id)) {
      throw new Error(`Unrecognized vendor: ${meta.product.vendor.id}`);
    }

    // is the extension registered?
    const vendorMap = this.vendorExtensionsBySite.get(meta.site.id) ?? new Map<VendorId, number>();
    if (vendorMap.has(meta.product.vendor.id)) {
      return;
    }

    // if not, register it
    const index = this.extensions.push(meta) - 1;
    vendorMap.set(meta.product.vendor.id, index);

    return this;
  }

  build(id: SiteId): ExtensionSite | undefined {
    const site = this.siteRegistrations.get(id);
    if (!site) {
      return undefined;
    }

    if (this.allRule === "deny") {
      return new ExtensionSite(site, new Map());
    }

    const extensions = new Map<VendorId, ExtensionMetadata>();
    const entries = this.vendorExtensionsBySite.get(id)?.entries() ?? ([] as const);
    for (const [vendor, maybeIndex] of entries) {
      // prepare rules
      const vendorRule = this.vendorPermissions.get(vendor) ?? this.allRule;
      const siteRule = this.sitePermissions.get(id) ?? this.allRule;
      const rules = [vendorRule, siteRule, this.allRule];

      // evaluate rules
      const extension = rules.includes("deny")
        ? undefined
        : rules.includes("allow")
          ? this.extensions[maybeIndex]
          : rules.includes("none")
            ? undefined
            : rules.includes("default")
              ? this.extensions[maybeIndex]
              : undefined;

      // the presence of an extension indicates it's accessible
      if (extension) {
        extensions.set(vendor, extension);
      }
    }

    const extensionSite = new ExtensionSite(site, extensions);
    return extensionSite;
  }
}
