import { CipherListView } from "@bitwarden/sdk-internal";

import { UserId } from "../../types/guid";
import { Cipher } from "../models/domain/cipher";
import { CipherView } from "../models/view/cipher.view";

/**
 * Service responsible for encrypting and decrypting ciphers.
 */
export abstract class CipherEncryptionService {
  /**
   * Decrypts a cipher using the SDK for the given userId.
   *
   * @param userId The user ID whose key will be used for decryption
   * @param cipher The encrypted cipher object
   *
   * @returns A promise that resolves to the decrypted cipher view
   */
  abstract decrypt(userId: UserId, cipher: Cipher): Promise<CipherView>;
  /**
   * Decrypts a list of ciphers using the SDK for the given userId.
   *
   * @param userId The user ID whose key will be used for decryption
   * @param ciphers The encrypted cipher objects
   *
   * @returns A promise that resolves to an array of decrypted cipher list views
   */
  abstract decryptCipherList(userId: UserId, ciphers: Cipher[]): Promise<CipherListView[]>;
}
