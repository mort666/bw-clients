import {
  Observable,
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs";

import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { BoundDependency } from "@bitwarden/common/tools/dependencies";
import { ExtensionSite } from "@bitwarden/common/tools/extension";
import { SemanticLogger } from "@bitwarden/common/tools/log";
import { SystemServiceProvider } from "@bitwarden/common/tools/providers";
import { anyComplete } from "@bitwarden/common/tools/rx";
import { UserStateSubject } from "@bitwarden/common/tools/state/user-state-subject";
import { UserStateSubjectDependencyProvider } from "@bitwarden/common/tools/state/user-state-subject-dependency-provider";

import {
  GeneratorMetadata,
  AlgorithmsByType,
  CredentialAlgorithm,
  CredentialType,
  isForwarderExtensionId,
  toForwarderMetadata,
  Type,
} from "../metadata";
import { availableAlgorithms_vNext } from "../policies/available-algorithms-policy";
import { CredentialPreference } from "../types";

import { PREFERENCES } from "./credential-preferences";

type AlgorithmRequest = { algorithm: CredentialAlgorithm };
type TypeRequest = { category: CredentialType };
type MetadataRequest = Partial<AlgorithmRequest & TypeRequest>;

/** Surfaces contextual information to credential generators */
export class GeneratorMetadataProvider {
  /** Instantiates the context provider
   *  @param system dependency providers for user state subjects
   *  @param application dependency providers for system services
   */
  constructor(
    private readonly system: UserStateSubjectDependencyProvider,
    private readonly application: SystemServiceProvider,
    algorithms: GeneratorMetadata<object>[],
  ) {
    this.log = system.log({ type: "GeneratorMetadataProvider" });

    const site = application.extension.site("forwarder");
    if (!site) {
      this.log.panic("forwarder extension site not found");
    }
    this.site = site;

    this.generators = new Map(algorithms.map((a) => [a.id, a] as const));
  }

  private readonly site: ExtensionSite;
  private readonly log: SemanticLogger;

  private generators: Map<CredentialAlgorithm, GeneratorMetadata<unknown & object>>;

  // looks up a set of algorithms; does not enforce policy
  algorithms(requested: AlgorithmRequest): CredentialAlgorithm[];
  algorithms(requested: TypeRequest): CredentialAlgorithm[];
  algorithms(requested: MetadataRequest): CredentialAlgorithm[];
  algorithms(requested: MetadataRequest): CredentialAlgorithm[] {
    let algorithms: CredentialAlgorithm[];
    if (requested.category) {
      let forwarders: CredentialAlgorithm[] = [];
      if (requested.category === Type.email) {
        forwarders = Array.from(this.site.extensions.keys()).map((forwarder) => ({ forwarder }));
      }

      algorithms = AlgorithmsByType[requested.category].concat(forwarders);
    } else if (requested.algorithm) {
      algorithms = [requested.algorithm];
    } else {
      this.log.panic(requested, "algorithm or category required");
    }

    return algorithms;
  }

  // emits a function that returns `true` when the input algorithm is available
  private isAvailable$(
    dependencies: BoundDependency<"account", Account>,
  ): Observable<(a: CredentialAlgorithm) => boolean> {
    const account$ = dependencies.account$.pipe(
      distinctUntilChanged((previous, current) => previous.id === current.id),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    const available$ = account$.pipe(
      switchMap((account) => {
        const policies$ = this.application.policy.getAll$(PolicyType.PasswordGenerator, account.id).pipe(
          map((p) => new Set(availableAlgorithms_vNext(p))),
          // complete policy emissions otherwise `switchMap` holds `algorithms$` open indefinitely
          takeUntil(anyComplete(account$)),
        );
        return policies$;
      }),
      map((available) => (a: CredentialAlgorithm) => isForwarderExtensionId(a) || available.has(a)),
    );

    return available$;
  }

  // looks up a set of algorithms; enforces policy - emits empty list when there's no algorithm available
  available$(
    requested: AlgorithmRequest,
    dependencies: BoundDependency<"account", Account>,
  ): Observable<GeneratorMetadata<object>[]>;
  available$(
    requested: TypeRequest,
    dependencies: BoundDependency<"account", Account>,
  ): Observable<GeneratorMetadata<object>[]>;
  available$(
    requested: MetadataRequest,
    dependencies: BoundDependency<"account", Account>,
  ): Observable<GeneratorMetadata<object>[]> {
    let available$: Observable<CredentialAlgorithm[]>;
    if (requested.category) {
      const { category } = requested;

      available$ = this.isAvailable$(dependencies).pipe(
        map((isAvailable) => AlgorithmsByType[category].filter(isAvailable)),
      );
    } else if (requested.algorithm) {
      const { algorithm } = requested;
      available$ = this.isAvailable$(dependencies).pipe(
        map((isAvailable) => (isAvailable(algorithm) ? [algorithm] : [])),
      );
    } else {
      this.log.panic(requested, "algorithm or category required");
    }

    const result$ = available$.pipe(
      map((available) => available.map((algorithm) => this.getMetadata(algorithm))),
    );

    return result$;
  }

  // looks up a specific algorithm; enforces policy - observable completes without emission when there's no algorithm available.
  algorithm$(
    requested: AlgorithmRequest,
    dependencies: BoundDependency<"account", Account>,
  ): Observable<GeneratorMetadata<object>>;
  algorithm$(
    requested: TypeRequest,
    dependencies: BoundDependency<"account", Account>,
  ): Observable<GeneratorMetadata<object>>;
  algorithm$(
    requested: MetadataRequest,
    dependencies: BoundDependency<"account", Account>,
  ): Observable<GeneratorMetadata<object>> {
    const account$ = dependencies.account$.pipe(shareReplay({ bufferSize: 1, refCount: true }));

    let algorithm$: Observable<CredentialAlgorithm | undefined>;
    if (requested.category) {
      this.log.debug(requested, "retrieving algorithm metadata by category");

      const { category } = requested;
      algorithm$ = this.preferences({ account$ }).pipe(
        withLatestFrom(this.isAvailable$({ account$ })),
        map(([preferences, isAvailable]) => {
          let algorithm: CredentialAlgorithm | undefined = preferences[category].algorithm;
          if (isAvailable(algorithm)) {
            return algorithm;
          }

          const algorithms = AlgorithmsByType[category];
          algorithm = algorithms.find(isAvailable)!;
          this.log.debug(
            { algorithm, category },
            "preference not available; defaulting the generator algorithm",
          );

          return algorithm;
        }),
      );
    } else if (requested.algorithm) {
      this.log.debug(requested, "retrieving algorithm metadata by algorithm");

      const { algorithm } = requested;
      algorithm$ = this.isAvailable$({ account$ }).pipe(
        map((isAvailable) => (isAvailable(algorithm) ? algorithm : undefined)),
        first(),
      );
    } else {
      this.log.panic(requested, "algorithm or category required");
    }

    const result$ = algorithm$.pipe(
      filter((value) => !!value),
      map((algorithm) => this.getMetadata(algorithm!)),
    );

    return result$;
  }

  private getMetadata(algorithm: CredentialAlgorithm) {
    let result = null;
    if (isForwarderExtensionId(algorithm)) {
      const extension = this.site.extensions.get(algorithm.forwarder);
      if (!extension) {
        this.log.panic(algorithm, "extension not found");
      }

      result = toForwarderMetadata(extension);
    } else {
      result = this.generators.get(algorithm);
    }

    if (!result) {
      this.log.panic({ algorithm }, "failed to load metadata");
    }

    return result;
  }

  /** Get a subject bound to credential generator preferences.
   *  @param dependencies.account$ identifies the account to which the preferences are bound
   *  @returns a subject bound to the user's preferences
   *  @remarks Preferences determine which algorithms are used when generating a
   *   credential from a credential category (e.g. `PassX` or `Username`). Preferences
   *   should not be used to hold navigation history. Use @bitwarden/generator-navigation
   *   instead.
   */
  preferences(
    dependencies: BoundDependency<"account", Account>,
  ): UserStateSubject<CredentialPreference> {
    // FIXME: enforce policy
    const subject = new UserStateSubject(PREFERENCES, this.system, dependencies);

    return subject;
  }
}
