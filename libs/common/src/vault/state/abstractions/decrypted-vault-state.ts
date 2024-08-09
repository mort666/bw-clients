import { Observable } from "rxjs";

import { DecryptionStatus, HasId, VaultRecord } from "../decrypted-vault-state-types";

export interface DecryptedVaultState<TOutput extends HasId> {
  /**
   * The decrypted state. Null if the state is not yet decrypted or has been cleared.
   */
  state$: Observable<VaultRecord<string, TOutput> | null>;

  /**
   * The current status of decryption.
   */
  status$: Observable<DecryptionStatus>;

  /**
   * Clears the decrypted state from state
   */
  clear(): Promise<void>;

  /**
   * Manually triggers the decryption of the state
   */
  refresh(): Promise<void>;
}
