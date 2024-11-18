import { Decryptable } from "../interfaces/decryptable.interface";
import { Encrypted } from "../interfaces/encrypted";
import { InitializerMetadata } from "../interfaces/initializer-metadata.interface";
import { EncArrayBuffer } from "../models/domain/enc-array-buffer";
import { EncString } from "../models/domain/enc-string";
import { SymmetricCryptoKey } from "../models/domain/symmetric-crypto-key";

export abstract class EncryptService {
  abstract encrypt(plainValue: string | Uint8Array, key: SymmetricCryptoKey): Promise<EncString>;
  abstract encryptToBytes(plainValue: Uint8Array, key: SymmetricCryptoKey): Promise<EncArrayBuffer>;
  abstract decryptToUtf8(
    encString: EncString,
    key: SymmetricCryptoKey,
    decryptContext?: string,
  ): Promise<string>;
  abstract decryptToBytes(encThing: Encrypted, key: SymmetricCryptoKey): Promise<Uint8Array>;
  /**
   * Decrypts aes gcm encrypted data given a key.
   *
   * The data is expected to be a concatenation of cipherText, tag, and iv in that order.
   * Tag is required to be 16 bytes.
   * iv is required to be 12 bytes
   *
   * @param data The encrypted data + tag + iv
   * @param key The key to decrypt the data
   * @param additionalData Additional data to authenticate
   */
  abstract aesGcmDecryptToBytes(
    data: Uint8Array,
    key: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<Uint8Array>;
  /**
   * Encrypts data using AES-256-GCM.
   *
   * @remarks this is currently used only for Key Connector communications. Do not use for general encryption.
   *
   * @param data data to encrypt
   * @param key key to encrypt with
   * @param additionalData additional data to authenticate
   * @returns the encrypted data in the form of data + tag + iv
   */
  abstract aesGcmEncryptToBytes(
    data: Uint8Array,
    key: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<Uint8Array>;
  abstract rsaEncrypt(data: Uint8Array, publicKey: Uint8Array): Promise<EncString>;
  abstract rsaDecrypt(data: EncString, privateKey: Uint8Array): Promise<Uint8Array>;
  abstract resolveLegacyKey(key: SymmetricCryptoKey, encThing: Encrypted): SymmetricCryptoKey;
  /**
   * @deprecated Replaced by BulkEncryptService, remove once the feature is tested and the featureflag PM-4154-multi-worker-encryption-service is removed
   * @param items The items to decrypt
   * @param key The key to decrypt the items with
   */
  abstract decryptItems<T extends InitializerMetadata>(
    items: Decryptable<T>[],
    key: SymmetricCryptoKey,
  ): Promise<T[]>;
  /**
   * Generates a base64-encoded hash of the given value
   * @param value The value to hash
   * @param algorithm The hashing algorithm to use
   */
  abstract hash(
    value: string | Uint8Array,
    algorithm: "sha1" | "sha256" | "sha512",
  ): Promise<string>;
}
