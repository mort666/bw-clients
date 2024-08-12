import { Observable } from "rxjs";

import { DecryptedVaultState } from "@bitwarden/common/vault/state/abstractions/decrypted-vault-state";

import { DecryptedVaultStateDefinition } from "../decrypted-vault-state-definition";
import { HasId, VaultRecord } from "../decrypted-vault-state-types";

export abstract class DecryptedVaultStateProvider {
  /**
   * Creates a decrypted vault state observable from an encrypted input observable and a decrypted key definition
   * @param encryptedInput$ - The encrypted input observable that will trigger the decryption of the state
   * @param decryptedDefinition - The decrypted key definition that defines how the decrypted state should be stored/decrypted
   */
  abstract get<TInput extends HasId, TOutput extends HasId>(
    encryptedInput$: Observable<VaultRecord<string, TInput>>,
    decryptedDefinition: DecryptedVaultStateDefinition<TInput, TOutput>,
  ): DecryptedVaultState<TOutput>;

  abstract getFromCache<TOutput extends HasId>(key: string): DecryptedVaultState<TOutput> | null;
}
