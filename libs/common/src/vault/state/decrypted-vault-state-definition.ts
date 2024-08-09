import { UserKeyDefinition, UserKeyDefinitionOptions } from "@bitwarden/common/platform/state";
import {
  DecryptionStatus,
  HasId,
  VaultRecord,
  VaultStateDecryptor,
} from "@bitwarden/common/vault/state/decrypted-vault-state-types";

// eslint-disable-next-line import/no-restricted-paths
import { StateDefinition } from "../../platform/state/state-definition";

export type DecryptedVaultStateDefinitionOptions<TInput extends HasId, TOutput extends HasId> = {
  /**
   * The decryptor that defines how the state should be decrypted from TInput to TOutput
   */
  decryptor: VaultStateDecryptor<TInput, TOutput> | null;

  /**
   * Optional function that determines if a specific record state needs be decrypted/updated based on the prior decrypted value.
   * If not provided, all records will be decrypted every time.
   * @param next - The next record to be decrypted
   * @param previous - The current decrypted copy of the next record. Null if the record has not been decrypted yet.
   */
  shouldUpdate?: (next: TInput, previous: TOutput | null) => boolean;
} & UserKeyDefinitionOptions<TOutput>;

export class DecryptedVaultStateDefinition<TInput extends HasId, TOutput extends HasId> {
  /**
   * Creates a decrypted vault state definition
   * @param stateDefinition - The state definition that defines how the state should be stored
   * @param key - The unique key for this decrypted vault state
   * @param options - The options that define how the state should be decrypted
   */
  constructor(
    readonly stateDefinition: StateDefinition,
    readonly key: string,
    readonly options: DecryptedVaultStateDefinitionOptions<TInput, TOutput>,
  ) {}

  toKeyDefinition(): UserKeyDefinition<VaultRecord<string, TOutput>> {
    return UserKeyDefinition.record(this.stateDefinition, this.key, this.options);
  }

  toStatusKeyDefinition(): UserKeyDefinition<DecryptionStatus> {
    return new UserKeyDefinition<DecryptionStatus>(this.stateDefinition, `${this.key}_status`, {
      ...this.options,
      deserializer: (v) => v,
    });
  }
}
