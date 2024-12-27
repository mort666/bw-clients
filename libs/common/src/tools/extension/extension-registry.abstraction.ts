import { ExtensionSite } from "./extension-site";
import { SiteMetadata, ExtensionMetadata, ExtensionSet, SiteId } from "./type";
import { VendorMetadata } from "./vendor/type";

/** Permission levels for metadata.
 *  * default - unless a rule denies access, allow it. This is the
 *    default permission.
 *  * none - unless a rule allows access, deny it.
 *  * allow - access is explicitly granted to use an extension.
 *  * deny - access is explicitly prohibited for this extension. This
 *    rule overrides allow rules.
 */
export type ExtensionPermission = "default" | "none" | "allow" | "deny";

export abstract class ExtensionRegistry {
  /** Registers a site supporting extensibility.
   *  @param site identifies the site being extended
   *  @param meta configures the extension site
   *  @return self for method chaining.
   */
  registerSite: (meta: SiteMetadata) => this;

  /** List all registered extension sites with their extension rule, if any.
   *  @returns a list of all extension sites. `rule` is defined when the site
   *    is associated with an extension rule.
   */
  sites: () => { site: SiteMetadata; permission?: ExtensionPermission }[];

  /** Registers a vendor providing an extension
   *  @param site - identifies the site being extended
   *  @param meta - configures the extension site
   *  @return self for method chaining.
   */
  registerVendor: (meta: VendorMetadata) => this;

  /** List all registered vendors with their extension rule, if any.
   *  @returns a list of all extension sites. `rule` is defined when the site
   *    is associated with an extension rule.
   */
  vendors: () => { vendor: VendorMetadata; permission?: ExtensionPermission }[];

  /** Registers an extension provided by a vendor to an extension site.
   *  The vendor and site MUST be registered before the extension.
   *  @param site - identifies the site being extended
   *  @param meta - configures the extension site
   *  @return self for method chaining.
   */
  registerExtension: (meta: ExtensionMetadata) => this;

  /** Registers a rule. Only 1 rule can be registered for each extension set.
   *  The last-registered rule wins.
   *  @param set the collection of extensions affected by the rule
   *  @param permission the permission for the collection
   *  @return self for method chaining.
   */
  setPermission: (set: ExtensionSet, permission: ExtensionPermission) => this;

  /** Retrieves the current rule for the given extension set or undefined if a rule
   *  doesn't exist. */
  permission: (set: ExtensionSet) => ExtensionPermission | undefined;

  /** Returns all registered extension rules. */
  permissions: () => { set: ExtensionSet; permission: ExtensionPermission }[];

  /** Creates a point-in-time snapshot of the registry's contents with extension
   *  permissions applied for the provided SiteId.
   *  @returns the extension site, or `undefined` if the site is not registered.
   */
  build: (id: SiteId) => ExtensionSite | undefined;
}
