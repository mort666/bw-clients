import { UserKeyDefinition } from "@bitwarden/common/platform/state";
import {
  HasId,
  VaultStateDecryptor,
} from "@bitwarden/common/vault/state/decrypted-vault-state-types";

export type DecryptedVaultStateDefinitionOptions<TInput extends HasId, TOutput extends HasId> = {
  /**
   * The decryptor that defines how the state should be decrypted from TInput to TOutput
   */
  decryptor: VaultStateDecryptor<TInput, TOutput>;

  /**
   * Optional function that determines if a specific record state needs be decrypted based on the prior decrypted value.
   * If not provided, all records will be decrypted every time.
   * @param next - The next record to be decrypted
   * @param previous - The current decrypted copy of the next record. Null if the record has not been decrypted yet.
   */
  shouldDecrypt?: (next: TInput, previous: TOutput | null) => boolean;
};

export class DecryptedVaultStateDefinition<TInput extends HasId, TOutput extends HasId> {
  /**
   * Creates a decrypted vault state definition
   * @param key - The key definition that defines how the decrypted state should be stored
   * @param options - The options that define how the state should be decrypted
   */
  constructor(
    readonly key: UserKeyDefinition<TOutput>,
    readonly options: DecryptedVaultStateDefinitionOptions<TInput, TOutput>,
  ) {}
}
