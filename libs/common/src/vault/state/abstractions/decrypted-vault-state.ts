import { Observable } from "rxjs";

import { DecryptedVaultStateDefinition } from "../decrypted-vault-state-definition";
import { DecryptionStatus, HasId } from "../decrypted-vault-state-types";

export abstract class DecryptedVaultState<TInput extends HasId, TOutput extends HasId> {
  /**
   * The decrypted state. Null if the state is not yet decrypted or has been cleared.
   */
  state$: Observable<TOutput | null>;

  /**
   * The current status of decryption.
   */
  status$: Observable<DecryptionStatus>;

  protected definition: DecryptedVaultStateDefinition<TInput, TOutput>;

  /**
   * Clears the decrypted state from state
   */
  abstract clear(): Promise<void>;
}
