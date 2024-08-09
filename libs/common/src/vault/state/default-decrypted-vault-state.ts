import {
  catchError,
  firstValueFrom,
  map,
  Observable,
  of,
  race,
  ReplaySubject,
  share,
  skip,
  switchMap,
  timer,
  withLatestFrom,
} from "rxjs";

import { ActiveUserState, StateProvider } from "@bitwarden/common/platform/state";
import { DecryptedVaultStateDefinition } from "@bitwarden/common/vault/state/decrypted-vault-state-definition";

import { DecryptedVaultState } from "./abstractions/decrypted-vault-state";
import { DecryptionStatus, HasId, VaultRecord } from "./decrypted-vault-state-types";

export class DefaultDecryptedVaultState<TInput extends HasId, TOutput extends HasId>
  implements DecryptedVaultState<TOutput>
{
  private state: ActiveUserState<VaultRecord<string, TOutput>>;
  private statusState: ActiveUserState<DecryptionStatus>;

  status$: Observable<DecryptionStatus>;
  state$: Observable<VaultRecord<string, TOutput> | null>;

  private readonly _shouldUpdateRecord: (next: TInput, previous: TOutput | null) => boolean = () =>
    true;

  constructor(
    stateProvider: StateProvider,
    private readonly input$: Observable<VaultRecord<string, TInput>>,
    readonly definition: DecryptedVaultStateDefinition<TInput, TOutput>,
  ) {
    this.state = stateProvider.getActive(definition.toKeyDefinition());
    this.statusState = stateProvider.getActive(definition.toStatusKeyDefinition());

    if (definition.options.shouldUpdate != null) {
      this._shouldUpdateRecord = definition.options.shouldUpdate;
    }

    this.state$ = this.input$.pipe(
      withLatestFrom(this.state.state$),
      map(([input, previous]) => {
        if (input == null) {
          return null;
        }

        const nextValue: VaultRecord<string, TOutput> = {};
        const needsDecryption: TInput[] = [];

        if (previous == null) {
          needsDecryption.push(...Object.values(input));
          return [needsDecryption, nextValue] as const;
        }

        for (const [key, value] of Object.entries(input) as [string, TInput][]) {
          if (!this._shouldUpdateRecord(value, previous?.[key] ?? null)) {
            nextValue[key] = previous?.[key] ?? null;
            continue;
          }
          needsDecryption.push(value);
        }

        return [needsDecryption, nextValue] as const;
      }),
      switchMap((source) => {
        return race(
          this.state.state$.pipe(
            skip(1),
            map((v) => [v, false] as const),
          ),
          of(source).pipe(
            switchMap(async ([needsDecryption, nextValue]) => {
              // Nothing needs decryption
              if (needsDecryption.length === 0) {
                return [nextValue, false] as const;
              }

              await this.statusState.update(() => "inProgress");

              const decrypted = await definition.options.decryptor(needsDecryption);

              for (const record of decrypted) {
                nextValue[record.id] = record;
              }
              return [nextValue, true] as const;
            }),
          ),
        );
      }),
      switchMap(async ([nextValue, shouldUpdateState]) => {
        await this.statusState.update(() => "complete");
        if (shouldUpdateState) {
          await this.state.update(() => nextValue);
        }
        return nextValue;
      }),
      catchError(async (err: unknown) => {
        await this.statusState.update(() => "error");
        throw err;
      }),
      share({
        connector: () => new ReplaySubject<VaultRecord<string, TOutput> | null>(1),
        resetOnRefCountZero: () => timer(definition.options.cleanupDelayMs),
      }),
    );
  }

  async clear(): Promise<void> {
    await this.state.update(() => null);
  }

  async decrypt(ignoreCache: boolean = false): Promise<VaultRecord<string, TOutput> | null> {
    if (ignoreCache) {
      await this.clear();
    }

    return await firstValueFrom(this.state$);
  }
}
