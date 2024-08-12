import { Observable } from "rxjs";

import { MessageListener, MessageSender } from "@bitwarden/common/platform/messaging";
import { StateProvider } from "@bitwarden/common/platform/state";
import { ForegroundDecryptedVaultState } from "@bitwarden/common/vault/state/foreground-decrypted-vault-state";

import { DecryptedVaultState } from "./abstractions/decrypted-vault-state";
import { DecryptedVaultStateProvider } from "./abstractions/decrypted-vault-state-provider";
import { DecryptedVaultStateDefinition } from "./decrypted-vault-state-definition";
import { HasId, VaultRecord } from "./decrypted-vault-state-types";
import { DefaultDecryptedVaultState } from "./default-decrypted-vault-state";

export class DefaultDecryptedVaultStateProvider extends DecryptedVaultStateProvider {
  private cache: Map<string, DecryptedVaultState<any>> = new Map();

  constructor(private readonly stateProvider: StateProvider) {
    super();
  }

  getFromCache<TOutput extends HasId>(key: string): DecryptedVaultState<TOutput> | null {
    return this.cache.get(key) ?? (null as DecryptedVaultState<TOutput>);
  }

  get<TInput extends HasId, TOutput extends HasId>(
    encryptedInput$: Observable<VaultRecord<string, TInput>>,
    decryptedDefinition: DecryptedVaultStateDefinition<TInput, TOutput>,
  ): DecryptedVaultState<TOutput> {
    if (!this.cache.has(decryptedDefinition.toKeyDefinition().key)) {
      const decryptedVaultState = new DefaultDecryptedVaultState(
        this.stateProvider,
        encryptedInput$,
        decryptedDefinition,
      );
      this.cache.set(decryptedDefinition.toKeyDefinition().key, decryptedVaultState);
      return decryptedVaultState;
    }

    return this.cache.get(decryptedDefinition.toKeyDefinition().key);
  }
}

export class ForegroundDecryptedVaultStateProvider extends DecryptedVaultStateProvider {
  private cache: Map<string, DecryptedVaultState<any>> = new Map();

  constructor(
    private readonly stateProvider: StateProvider,
    private readonly messageSender: MessageSender,
    private readonly messageListener: MessageListener,
  ) {
    super();
  }

  getFromCache<TOutput extends HasId>(key: string): DecryptedVaultState<TOutput> | null {
    return this.cache.get(key) ?? (null as DecryptedVaultState<TOutput>);
  }

  get<TInput extends HasId, TOutput extends HasId>(
    encryptedInput$: Observable<VaultRecord<string, TInput>>,
    decryptedDefinition: DecryptedVaultStateDefinition<TInput, TOutput>,
  ): DecryptedVaultState<TOutput> {
    if (!this.cache.has(decryptedDefinition.toKeyDefinition().key)) {
      const decryptedVaultState = new ForegroundDecryptedVaultState(
        this.stateProvider,
        encryptedInput$,
        decryptedDefinition,
        this.messageSender,
        this.messageListener,
      );
      this.cache.set(decryptedDefinition.toKeyDefinition().key, decryptedVaultState);
    }

    return this.cache.get(decryptedDefinition.toKeyDefinition().key);
  }
}
