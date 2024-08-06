import { Observable } from "rxjs";

import { View } from "@bitwarden/common/models/view/view";

/**
 * Storage for encrypted and decrypted vault data.
 */
export interface VaultState<TData, TView extends View, TKey extends string = string> {
  encryptedState$: Observable<Record<TKey, TData> | null>;
  decryptedState$: Observable<Record<TKey, TView> | null>;

  /**
   * Update the encrypted state.
   */
  update(data: Record<TKey, TData>): Promise<void>;

  /**
   * Remove specific records from state.
   * @param ids
   */
  remove(ids: TKey | TKey[]): Promise<void>;

  /**
   * Replace the entire encrypted state. Will clear the decrypted state.
   * @param data
   */
  replace(data: Record<TKey, TData>): Promise<void>;

  /**
   * Clears the decrypted state from memory.
   */
  clearDecrypted(): void;

  /**
   * Clears the encrypted and decrypted state from memory.
   */
  clear(): Promise<void>;
}
