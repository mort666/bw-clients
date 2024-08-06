import {
  concatMap,
  firstValueFrom,
  map,
  merge,
  Observable,
  ReplaySubject,
  share,
  startWith,
  Subject,
  tap,
  timer,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type VaultStateDefinitionOptions<TData, TView, TKey> = {
  encryptedOptions: UserKeyDefinitionOptions<TData>;
  decryptedOptions: UserKeyDefinitionOptions<TView>;
};

export class VaultStateKeyDefinition<TData, TView, TKey extends string = string> {
  constructor(
    readonly encryptedStateDefinition: StateDefinition,
    readonly decryptedStateDefinition: StateDefinition,
    readonly key: string,
    readonly options: VaultStateDefinitionOptions<TData, TView, TKey>,
  ) {}

  get encryptedKey() {
    return this.key;
  }

  get decryptedKey() {
    return this.key + "_decrypted";
  }

  toEncryptedKeyDefinition(): UserKeyDefinition<TrackedRecord<TKey, TData>> {
    return new UserKeyDefinition<TrackedRecord<TKey, TData>>(
      this.encryptedStateDefinition,
      this.key,
      {
        ...this.options.encryptedOptions,
        deserializer: trackedRecord<TData, TKey>((v) =>
          this.options.encryptedOptions.deserializer(v),
        ),
      },
    );
  }

  toDecryptedKeyDefinition(): UserKeyDefinition<Record<TKey, TView>> {
    return new UserKeyDefinition<Record<TKey, TView>>(
      this.decryptedStateDefinition,
      this.decryptedKey,
      {
        ...this.options.decryptedOptions,
        deserializer: record<TView, TKey>((v) => this.options.decryptedOptions.deserializer(v)),
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
  private encryptedState: ActiveUserState<TrackedRecord<TKey, TData>>;
  private decryptedState: ActiveUserState<Record<TKey, TView>>;

  private forceDecryptedSubject = new Subject<Record<TKey, TView>>();

  encryptedState$: Observable<Record<TKey, TData>>;
  decryptedState$: Observable<Record<TKey, TView>>;

  constructor(
    stateProvider: StateProvider,
    private options: VaultStateKeyDefinition<TData, TView, TKey>,
    private decryptor: (data: TData[], userId: UserId) => Promise<[TKey, TView][]>,
  ) {
    this.encryptedState = stateProvider.getActive(this.options.toEncryptedKeyDefinition());
    this.decryptedState = stateProvider.getActive(this.options.toDecryptedKeyDefinition());

    this.encryptedState$ = this.encryptedState.state$.pipe(
      map((state) => {
        return state == null ? null : state[0];
      }),
    );

    const derivedState$ = this.encryptedState.combinedState$.pipe(
      tap((v) => console.log("Encrypted State: ", v)),
      concatMap(async ([userId, encryptedState]) => {
        if (encryptedState == null) {
          return null;
        }

        const oldDecrypted = await firstValueFrom(this.decryptedState.state$);
        console.log("Old decrypted", oldDecrypted);
        const newDerived = {} as Record<TKey, TView>;

        const [encryptedData, metaData] = encryptedState;
        const needsDecryption = [] as TData[];

        for (const key in encryptedData) {
          const id = key as TKey;

          if (!oldDecrypted || metaData?.modifiedKeys?.includes(id)) {
            needsDecryption.push(encryptedData[id]);
          } else if (oldDecrypted[id] != null) {
            newDerived[id] = oldDecrypted[id];
          }
        }

        if (needsDecryption.length === 0) {
          return newDerived;
        }

        console.log("Doing decryption on", needsDecryption.length, "items");
        const decrypted = await this.decryptor(needsDecryption, userId);

        for (const [key, view] of decrypted) {
          newDerived[key] = view;
        }

        return await this.decryptedState.update(() => newDerived);
      }),
    );

    this.decryptedState$ = merge(
      this.forceDecryptedSubject.pipe(tap((forced) => console.log("Forced: ", forced))),
      derivedState$.pipe(tap((derived) => console.log("Derived: ", derived))),
    ).pipe(
      startWith(null),
      share({
        connector: () => new ReplaySubject<Record<TKey, TView>>(1),
        resetOnRefCountZero: () => timer(1000).pipe(tap(() => console.log("Resetting"))),
      }),
    );
  }

  async update(updatedData: Record<TKey, TData>): Promise<void> {
    await this.encryptedState.update((currentState) => {
      currentState ??= [{} as Record<TKey, TData>];
      const [currentData] = currentState;

      Object.entries(updatedData).forEach(([id, value]) => {
        currentData[id as TKey] = value as TData;
      });

      return [
        currentData,
        { modifiedKeys: Object.keys(updatedData) as TKey[], lastModified: new Date() },
      ];
    });
  }
  async remove(ids: TKey | TKey[]): Promise<void> {
    await this.encryptedState.update(([current]) => {
      const modifiedKeys = Array.isArray(ids) ? ids : [ids];
      modifiedKeys.forEach((id) => {
        delete current[id];
      });
      return [current, { modifiedKeys, lastModified: new Date() }];
    });
  }
  async replace(data: Record<TKey, TData>): Promise<void> {
    await this.clearDecrypted();
    // Replacing, so no need to track modified keys
    await this.encryptedState.update(() => [data, { lastModified: new Date() }]);
  }
  async clearDecrypted(): Promise<void> {
    this.forceDecryptedSubject.next(null);
    await this.decryptedState.update(() => null);
  }
  async clear(): Promise<void> {
    await this.clearDecrypted();
    await this.encryptedState.update(() => [{} as Record<TKey, TData>]);
  }
}
