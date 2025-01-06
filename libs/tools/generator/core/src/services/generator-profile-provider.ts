import {
  of,
  distinctUntilChanged,
  filter,
  first,
  map,
  Observable,
  ReplaySubject,
  share,
  switchMap,
  takeUntil,
  connect,
} from "rxjs";

import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";
import { StateProvider } from "@bitwarden/common/platform/state";
import { LegacyEncryptorProvider } from "@bitwarden/common/tools/cryptography/legacy-encryptor-provider";
import { SingleAccountDependency } from "@bitwarden/common/tools/dependencies";
import { anyComplete, errorOnChange } from "@bitwarden/common/tools/rx";
import { UserStateSubject } from "@bitwarden/common/tools/state/user-state-subject";
import { UserId } from "@bitwarden/common/types/guid";

import { ProfileContext, ProfileMetadata, CoreProfileMetadata } from "../metadata/profile-metadata";
import { GeneratorConstraints } from "../types/generator-constraints";

const OPTIONS_FRAME_SIZE = 512;

/** Surfaces contextual information to credential generators */
export class GeneratorProfileProvider {
  /** Instantiates the context provider
   *  @param stateProvider stores the settings
   *  @param encryptorProvider protects the user's settings
   *  @param policyService settings constraint lookups
   *  @param accountService user email address lookups
   */
  constructor(
    private readonly stateProvider: StateProvider,
    private readonly encryptorProvider: LegacyEncryptorProvider,
    private readonly policyService: PolicyService,
  ) {}

  /** Get a subject bound to a specific user's settings for the provided profile.
   * @param profile determines which profile's settings are loaded
   * @param dependencies.singleUserId$ identifies the user to which the settings are bound
   * @returns an observable that emits the subject once `dependencies.singleUserId$` becomes
   *   available and then completes.
   * @remarks the subject tracks and enforces policy on the settings it contains.
   *   It completes when `dependencies.singleUserId$` competes or the user's encryption key
   *   becomes unavailable.
   */
  settings$$<Settings extends object>(
    profile: Readonly<CoreProfileMetadata<Settings>>,
    dependencies: SingleAccountDependency,
  ): Observable<UserStateSubject<Settings>> {
    const singleUserId$ = dependencies.singleAccount$.pipe(
      filter((account) => !!account),
      map(({ id }) => id),
      distinctUntilChanged(),
      share({
        connector() {
          return new ReplaySubject<UserId>(1);
        },
      }),
    );
    const singleUserEncryptor$ = this.encryptorProvider.userEncryptor$(OPTIONS_FRAME_SIZE, {
      singleUserId$,
    });

    const constraints$ = this.constraints$(profile, dependencies);

    const settings$ = singleUserId$.pipe(
      map((userId) => {
        const subject = new UserStateSubject(
          profile.storage,
          (key) => this.stateProvider.getUser(userId, key),
          { constraints$, singleUserEncryptor$ },
        );

        return subject;
      }),
      first(),
    );

    return settings$;
  }

  /** Get the policy constraints for the provided profile
   *  @param dependencies.singleAccount$ constraints are loaded from this account.
   *    If the account's email is verified, it is passed to the constraints
   *  @returns an observable that emits the policy once `dependencies.userId$`
   *   and the policy become available.
   */
  constraints$<Settings>(
    profile: Readonly<ProfileMetadata<Settings>>,
    dependencies: SingleAccountDependency,
  ): Observable<GeneratorConstraints<Settings>> {
    const constraints$ = dependencies.singleAccount$.pipe(
      errorOnChange(
        ({ id }) => id,
        (expectedUserId, actualUserId) => ({ expectedUserId, actualUserId }),
      ),
      distinctUntilChanged((prev, next) => {
        return prev.email === next.email && prev.emailVerified === next.emailVerified;
      }),
      connect((account$) =>
        account$.pipe(
          switchMap((account) => {
            const policies$ = profile.constraints.type
              ? this.policyService.getAll$(profile.constraints.type, account.id)
              : of<Policy[]>([]);
            const context: ProfileContext<Settings> = {
              defaultConstraints: profile.constraints.default,
            };
            if (account.emailVerified) {
              context.email = account.email;
            }
            const constraints$ = policies$.pipe(
              map((policies) => profile.constraints.create(policies, context)),
            );
            return constraints$;
          }),
          // complete policy emissions otherwise `switchMap` holds `constraints$`
          // open indefinitely
          takeUntil(anyComplete(account$)),
        ),
      ),
    );

    return constraints$;
  }
}
