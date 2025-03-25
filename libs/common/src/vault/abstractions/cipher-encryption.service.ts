import { EncArrayBuffer } from "@bitwarden/common/platform/models/domain/enc-array-buffer";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { UserId } from "@bitwarden/common/types/guid";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

export type EncCipherAttachment = {
  encFileName: EncString;
  dataEncKey: [SymmetricCryptoKey, EncString];
  encData: EncArrayBuffer;
};

/**
 * Service responsible for encrypting and decrypting ciphers.
 */
export abstract class CipherEncryptionService {
  abstract encrypt(
    cipher: CipherView,
    userId: UserId,
    keyForEncryption?: SymmetricCryptoKey,
    keyForCipherKeyDecryption?: SymmetricCryptoKey,
    originalCipher?: Cipher,
  ): Promise<Cipher>;

  abstract decrypt(cipher: Cipher, userId: UserId): Promise<CipherView | null>;
  abstract decryptMany(ciphers: Cipher[], userId: UserId): Promise<CipherView[] | null>;

  abstract encryptCipherAttachmentData(
    cipher: Cipher,
    fileName: string,
    data: Uint8Array,
    userId: UserId,
  ): Promise<EncCipherAttachment>;
}
