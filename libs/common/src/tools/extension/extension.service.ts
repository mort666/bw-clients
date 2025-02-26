import { EMPTY, Observable, defer, of, shareReplay } from "rxjs";

import { Account } from "../../auth/abstractions/account.service";
import { BoundDependency } from "../dependencies";
import { SemanticLogger } from "../log";
import { UserStateSubject } from "../state/user-state-subject";
import { UserStateSubjectDependencyProvider } from "../state/user-state-subject-dependency-provider";

import { ExtensionRegistry } from "./extension-registry.abstraction";
import { ExtensionSite } from "./extension-site";
import { ExtensionProfileMetadata, SiteId, VendorId } from "./type";
import { toObjectKey } from "./util";

/** Provides configuration and storage support for Bitwarden client extensions.
 *  These extensions integrate 3rd party services into Bitwarden.
 */
export class ExtensionService {
  constructor(
    private registry: ExtensionRegistry,
    private readonly providers: UserStateSubjectDependencyProvider,
  ) {
    this.log = providers.log({
      type: "ExtensionService",
    });
  }

  private log: SemanticLogger;

  settings<Settings extends object, Site extends SiteId>(
    profile: ExtensionProfileMetadata<Settings, Site>,
    vendor: VendorId,
    dependencies: BoundDependency<"account", Account>,
  ): UserStateSubject<Settings> {
    const metadata = this.registry.extension(profile.site, vendor);
    if (!metadata) {
      this.log.panic({ site: profile.site as string, vendor }, "extension not defined");
    }

    const key = toObjectKey(profile, metadata);
    const account$ = dependencies.account$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
    const subject = new UserStateSubject(key, this.providers, { account$ });

    return subject;
  }

  site(site: SiteId) {
    return this.registry.build(site);
  }

  /** Look up extension metadata for a site.
   *  @param site defines the site to retrieve.
   *  @returns an observable that emits the extension sites available at the
   *    moment of subscription and then completes. If the extension site is not
   *    available, the observable completes without emitting.
   */
  site$(site: SiteId): Observable<ExtensionSite> {
    return defer(() => {
      const extensions = this.registry.build(site);
      return extensions ? of(extensions) : EMPTY;
    });
  }
}
