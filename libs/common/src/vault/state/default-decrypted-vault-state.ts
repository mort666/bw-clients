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
  take,
  timer,
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

  private readonly _shouldUpdateRecord: (next: TInput, previous: TOutput | null) => boolean | null =
    null;

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
      switchMap((nextInput) => {
        // Input is null, so we should clear the state
        if (nextInput == null) {
          return of([null, true] as const);
        }

        // Race the state.state$ with itself to ensure we don't overwrite an older value if decryption is slow and
        // the value was updated/cleared in the meantime
        return race(
          this.state.state$.pipe(
            skip(1), // Skip the initial value as it will always emit a cached value
            map((v) => [v, false] as const),
          ),
          this.state.state$.pipe(
            take(1), // We only care about the current cached value, nothing after
            switchMap(async (previousOutput) => {
              await this.statusState.update(() => "inProgress");

              const [needsDecryption, fromPrevious] = this._getNextUpdates(
                nextInput,
                previousOutput,
              );

              // Build the next state, starting with any previous values
              const nextValue: VaultRecord<string, TOutput> = Object.fromEntries(
                fromPrevious.map((v) => [v.id, v]),
              );

              // Nothing needs decryption, we're done
              if (needsDecryption.length === 0) {
                return [nextValue, false] as const;
              }

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
        if (shouldUpdateState) {
          await this.state.update(() => nextValue);
        }
        await this.statusState.update(() => "complete");
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

  /**
   * Determines which items need to be updated and which can be reused from the previous output.
   *
   * If the previous output is null, all items need to be updated.
   *
   * @param nextInput - The next input to be decrypted
   * @param previousOutput - The previous output that was decrypted
   *
   * @returns [needsDecryption, fromPrevious] -
   * The first item contains the list of items that need to be decrypted.
   * The second item contains values from the previous state that can be reused.
   */
  private _getNextUpdates(
    nextInput: VaultRecord<string, TInput>,
    previousOutput: VaultRecord<string, TOutput> | null,
  ) {
    const fromPrevious: TOutput[] = [];
    const needsDecryption: TInput[] = [];

    // We have no previous output or no method to determine if a record should be updated, update all inputs
    if (previousOutput == null || this._shouldUpdateRecord == null) {
      needsDecryption.push(...Object.values(nextInput));
      return [needsDecryption, fromPrevious] as const;
    }

    for (const [key, value] of Object.entries(nextInput) as [string, TInput][]) {
      if (!this._shouldUpdateRecord(value, previousOutput?.[key] ?? null)) {
        fromPrevious.push(previousOutput[key]);
        continue;
      }
      needsDecryption.push(value);
    }

    return [needsDecryption, fromPrevious] as const;
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
