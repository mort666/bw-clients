import {
  concatMap,
  map,
  merge,
  Observable,
  of,
  ReplaySubject,
  share,
  startWith,
  Subject,
  tap,
  timer,
  withLatestFrom,
} from "rxjs";
import { Jsonify } from "type-fest";

import {
  ActiveUserState,
  StateProvider,
  UserKeyDefinition,
  UserKeyDefinitionOptions,
} from "@bitwarden/common/platform/state";
import { record } from "@bitwarden/common/platform/state/deserialization-helpers";
import { UserId } from "@bitwarden/common/types/guid";

// eslint-disable-next-line -- `StateDefinition` used as an argument
import { StateDefinition } from "../../platform/state/state-definition";

import { VaultState } from "./vault-state";

/**
 * A Record<> with optional metadata tracking the last modified date and the keys that were modified.
 */
export type TrackedRecord<TKey extends string, TValue> = [
  data: Record<TKey, TValue>,
  metadata?: {
    lastModified?: Date;
    modifiedKeys?: TKey[];
  },
];

function trackedRecord<T, TKey extends string = string>(
  valueDeserializer: (value: Jsonify<T>) => T,
): (record: Jsonify<TrackedRecord<TKey, T>> | null) => TrackedRecord<TKey, T> {
  return (jsonValue: Jsonify<TrackedRecord<TKey, T>> | null) => {
    if (jsonValue == null) {
      return [{} as any];
    }

    const [data, metadata] = jsonValue;

    const output: Record<TKey, T> = {} as any;
    Object.entries(data).forEach(([key, value]) => {
      output[key as TKey] = valueDeserializer(value);
    });

    return [
      output,
      {
        lastModified: new Date(metadata.lastModified),
        modifiedKeys: metadata.modifiedKeys as TKey[],
      },
    ];
  };
}
export type DecryptedData<TKey extends string, TValue> = [
  data: Record<TKey, TValue>,
  lastModified: Date,
];

export type DecryptionStatus = {
  /**
   * Whether the decryption is in progress.
   */
  inProgress: boolean;

  /**
   * The date the decryption started. Null when not in progress.
   */
  started: Date | null;
};

function decryptedRecord<T, TKey extends string = string>(
  valueDeserializer: (value: Jsonify<T>) => T,
): (record: Jsonify<DecryptedData<TKey, T>> | null) => DecryptedData<TKey, T> {
  return (jsonValue: Jsonify<DecryptedData<TKey, T>> | null) => {
    if (jsonValue == null) {
      return null;
    }

    const [data, lastModifiedStr] = jsonValue;

    const output: Record<TKey, T> = {} as any;
    Object.entries(data).forEach(([key, value]) => {
      output[key as TKey] = valueDeserializer(value);
    });

    return [output, new Date(lastModifiedStr)];
  };
}

export type VaultStateKeyDefinitionOptions<TData, TView> = {
  encryptedOptions: UserKeyDefinitionOptions<TData>;
  decryptedOptions: UserKeyDefinitionOptions<TView>;
  modifiedDateFn: (record: TData) => Date | null;
};

export class VaultStateKeyDefinition<TData, TView, TKey extends string = string> {
  constructor(
    readonly key: string,
    readonly encryptedStateDefinition: StateDefinition,
    readonly decryptedStateDefinition: StateDefinition,
    readonly options: VaultStateKeyDefinitionOptions<TData, TView>,
  ) {}

  get encryptedKey() {
    return this.key;
  }

  get decryptedKey() {
    return this.key + "_decrypted";
  }

  toEncryptedKeyDefinition(): UserKeyDefinition<Record<TKey, TData>> {
    return new UserKeyDefinition<Record<TKey, TData>>(
      this.encryptedStateDefinition,
      this.encryptedKey,
      {
        ...this.options.encryptedOptions,
        deserializer: record<TData, TKey>((v) => this.options.encryptedOptions.deserializer(v)),
      },
    );
  }

  toDecryptedKeyDefinition(): UserKeyDefinition<DecryptedData<TKey, TView>> {
    return new UserKeyDefinition<DecryptedData<TKey, TView>>(
      this.decryptedStateDefinition,
      this.decryptedKey,
      {
        ...this.options.decryptedOptions,
        deserializer: decryptedRecord<TView, TKey>((v) =>
          this.options.decryptedOptions.deserializer(v),
        ),
      },
    );
  }

  toDecryptedStatusKeyDefinition(): UserKeyDefinition<DecryptionStatus> {
    return new UserKeyDefinition<DecryptionStatus>(
      this.decryptedStateDefinition,
      this.decryptedKey + "_status",
      {
        ...this.options.decryptedOptions,
        deserializer: (v) => ({
          inProgress: v?.inProgress,
          started: v?.started ? new Date(v.started) : null,
        }),
      },
    );
  }
}

/**
 * Default implementation of the VaultState.
 */
export class DefaultVaultState<TData, TView, TKey extends string = string>
  implements VaultState<TData, TView, TKey>
{
  protected encryptedState: ActiveUserState<Record<TKey, TData>>;
  protected decryptedState: ActiveUserState<DecryptedData<TKey, TView>>;
  protected decryptedStatusState: ActiveUserState<DecryptionStatus>;

  protected forceDecryptedSubject = new Subject<Record<TKey, TView>>();

  encryptedState$: Observable<Record<TKey, TData>>;
  decryptedState$: Observable<Record<TKey, TView>>;

  constructor(
    stateProvider: StateProvider,
    private key: VaultStateKeyDefinition<TData, TView, TKey>,
    private decryptor: (data: TData[], userId: UserId) => Promise<[TKey, TView][]>,
  ) {
    this.encryptedState = stateProvider.getActive(this.key.toEncryptedKeyDefinition());
    this.decryptedState = stateProvider.getActive(this.key.toDecryptedKeyDefinition());
    this.decryptedStatusState = stateProvider.getActive(this.key.toDecryptedStatusKeyDefinition());

    this.encryptedState$ = this.encryptedState.state$;
    this.decryptedState$ = this.buildDecryptedStateObservable();
  }

  protected buildDecryptedStateObservable(): Observable<Record<TKey, TView>> {
    // Steps:
    // 1. Skip if encrypted state is null
    // 2. Calculate which items need decryption
    // 3. Decrypt items
    // 4. Update decrypted state

    const derivedState$ = this.encryptedState.combinedState$.pipe(
      withLatestFrom(this.decryptedState.state$),
      concatMap(([[userId, newEncrypted], previousDecrypted]) => {
        if (newEncrypted == null) {
          return of(null);
        }

        return this.deriveDecryptedState(userId, newEncrypted, previousDecrypted);
      }),
      map((derived) => derived[0]),
    );

    return merge(
      this.forceDecryptedSubject.pipe(tap((forced) => console.log("Forced: ", forced))),
      derivedState$.pipe(tap((derived) => console.log("Derived: ", derived))),
    ).pipe(
      startWith(null),
      share({
        connector: () => new ReplaySubject<Record<TKey, TView>>(1),
        resetOnRefCountZero: () => timer(10000).pipe(tap(() => console.log("Resetting"))),
      }),
    );
  }

  private deriveDecryptedState(
    userId: UserId,
    encrypted: Record<TKey, TData>,
    previous: DecryptedData<TKey, TView> | null,
  ): Observable<DecryptedData<TKey, TView>> {
    const [oldData, oldDecryptDate] = previous ?? [];
    const newDerived = {} as Record<TKey, TView>;
    const needsDecryption = [] as TData[];

    for (const [key, value] of Object.entries(encrypted) as [TKey, TData][]) {
      const tKey = key as TKey;

      if (
        oldData &&
        oldData[tKey] !== null &&
        this.key.options.modifiedDateFn(value) <= oldDecryptDate
      ) {
        newDerived[tKey] = oldData[tKey];
      } else {
        needsDecryption.push(value);
      }
    }

    if (needsDecryption.length === 0) {
      return of([newDerived, new Date()]);
    }

    return of(newDerived).pipe(
      // tap(() =>
      // this.decryptedStatusState.update(() => ({
      //   inProgress: true,
      //   started: new Date(),
      // })),
      // ),
      concatMap(async (derived) => {
        const decrypted = await this.decryptor(needsDecryption, userId);

        for (const [key, view] of decrypted) {
          derived[key] = view;
        }

        return derived;
      }),
      tap(() => console.log("Decrypted")),
      concatMap(async (derived) => {
        console.log("Updating state", derived);
        const updated = await this.decryptedState.update(() => [derived, new Date()]);
        console.log("Updated", updated);
        return updated;
      }),
      map((updated) => updated[1]),
      // takeUntil(this.decryptedState.state$),
      // finalize(() =>
      // this.decryptedStatusState.update(() => ({
      //   inProgress: false,
      //   started: null,
      // })),
      // ),
    );
  }

  private getItemsNeedingDecryption(
    encrypted: Record<TKey, TData>,
    previous: DecryptedData<TKey, TView> | null,
  ) {}

  async update(updatedData: Record<TKey, TData>): Promise<void> {
    await this.encryptedState.update((currentState) => {
      currentState ??= {} as Record<TKey, TData>;

      Object.entries(updatedData).forEach(([id, value]) => {
        currentState[id as TKey] = value as TData;
      });

      return currentState;
    });
  }
  async remove(ids: TKey | TKey[]): Promise<void> {
    await this.encryptedState.update((current) => {
      const modifiedKeys = Array.isArray(ids) ? ids : [ids];
      modifiedKeys.forEach((id) => {
        delete current[id];
      });
      return current;
    });
  }
  async replace(data: Record<TKey, TData>): Promise<void> {
    await this.clearDecrypted();
    // Replacing, so no need to track modified keys
    await this.encryptedState.update(() => data);
  }
  async clearDecrypted(): Promise<void> {
    this.forceDecryptedSubject.next(null);
    await this.decryptedState.update(() => null);
  }
  async clear(): Promise<void> {
    await this.clearDecrypted();
    await this.encryptedState.update(() => ({}) as Record<TKey, TData>);
  }
}

export class ForegroundVaultState<
  TData,
  TView,
  TKey extends string = string,
> extends DefaultVaultState<TData, TView, TKey> {
  constructor(stateProvider: StateProvider, key: VaultStateKeyDefinition<TData, TView, TKey>) {
    super(stateProvider, key, null);
  }

  override buildDecryptedStateObservable(): Observable<Record<TKey, TView>> {
    return merge(
      this.forceDecryptedSubject.pipe(tap((forced) => console.log("Forced: ", forced))),
      this.decryptedState.state$.pipe(
        map((decrypted) => (decrypted == null ? null : decrypted[0])),
        tap((derived) => console.log("Storage: ", derived)),
      ),
    ).pipe(
      startWith(null),
      share({
        connector: () => new ReplaySubject<Record<TKey, TView>>(1),
        resetOnRefCountZero: () => timer(1000).pipe(tap(() => console.log("Resetting"))),
      }),
    );
  }
}
