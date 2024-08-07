import { StateProvider } from "@bitwarden/common/platform/state";
import { UserId } from "@bitwarden/common/types/guid";
import {
  DefaultVaultState,
  ForegroundVaultState,
  VaultStateKeyDefinition,
} from "@bitwarden/common/vault/state/default-vault-state";
import { VaultState } from "@bitwarden/common/vault/state/vault-state";

export abstract class VaultStateProvider {
  abstract get<TData, TView, TKey extends string = string>(
    definition: VaultStateKeyDefinition<TData, TView, TKey>,
    decryptor: (data: TData[], userId: UserId) => Promise<[TKey, TView][]>,
  ): VaultState<TData, TView, TKey>;
}

export class DefaultVaultStateProvider implements VaultStateProvider {
  constructor(private stateProvider: StateProvider) {}

  get<TData, TView, TKey extends string = string>(
    definition: VaultStateKeyDefinition<TData, TView, TKey>,
    decryptor: (data: TData[], userId: UserId) => Promise<[TKey, TView][]>,
  ): VaultState<TData, TView, TKey> {
    return new DefaultVaultState(this.stateProvider, definition, decryptor);
  }
}

export class ForegroundVaultStateProvider implements VaultStateProvider {
  constructor(private stateProvider: StateProvider) {}

  get<TData, TView, TKey extends string = string>(
    definition: VaultStateKeyDefinition<TData, TView, TKey>,
    decryptor: (data: TData[], userId: UserId) => Promise<[TKey, TView][]>,
  ): VaultState<TData, TView, TKey> {
    return new ForegroundVaultState(this.stateProvider, definition);
  }
}
