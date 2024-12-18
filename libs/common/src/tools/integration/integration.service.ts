import { BehaviorSubject, combineLatest, firstValueFrom, map, Observable } from "rxjs";

import { StateProvider } from "@bitwarden/common/platform/state";

import { LegacyEncryptorProvider } from "../cryptography/legacy-encryptor-provider";
import { SingleUserDependency, SingleVendorDependency } from "../dependencies";
import { UserStateSubject } from "../state/user-state-subject";

import { IntegrationKey } from "./integration-key";
import { IntegrationRegistry } from "./metadata/registry";
import { ExtensionSite, IntegrationMetadata } from "./metadata/type";

const DEFAULT_INTEGRATION_STORAGE_FRAME = 512;

export class IntegrationService {
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly stateProvider: StateProvider,
    private readonly encryptorProvider: LegacyEncryptorProvider,
  ) {}

  /** Observe the integrations available at an extension site */
  integrations$(site: ExtensionSite): Observable<IntegrationMetadata[]> {
    const integrations = this.registry.getIntegrations(site);

    // slot into a behavior subject so that the integration data is always available
    // downstream; once dynamic registrations are supported this could be extended
    // to publish updated lists without changing the signature
    const integrations$ = new BehaviorSubject(integrations);

    return integrations$.asObservable();
  }

  /** Create a subject monitoring the integration's private data store */
  state$<T extends object>(
    key: IntegrationKey<T>,
    dependencies: SingleUserDependency & SingleVendorDependency,
  ): Promise<UserStateSubject<T>> {
    const singleUserEncryptor$ = this.encryptorProvider.userEncryptor$(
      DEFAULT_INTEGRATION_STORAGE_FRAME,
      dependencies,
    );

    const result$ = combineLatest([singleUserEncryptor$, dependencies.singleVendorId$]).pipe(
      map(([encryptor, vendor]) => {
        const subject = new UserStateSubject<T, T, Record<string, never>>(
          key.toObjectKey(vendor, this.registry),
          (key) => this.stateProvider.getUser(encryptor.userId, key),
          { singleUserEncryptor$ },
        );

        return subject;
      }),
    );

    return firstValueFrom(result$);
  }
}
