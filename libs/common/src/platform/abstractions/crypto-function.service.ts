import { CsprngArray } from "../../types/csprng";
import { DecryptParameters } from "../models/domain/decrypt-parameters";
import { SymmetricCryptoKey } from "../models/domain/symmetric-crypto-key";

export abstract class CryptoFunctionService {
  abstract pbkdf2(
    password: string | Uint8Array,
    salt: string | Uint8Array,
    algorithm: "sha256" | "sha512",
    iterations: number,
  ): Promise<Uint8Array>;
  abstract argon2(
    password: string | Uint8Array,
    salt: string | Uint8Array,
    iterations: number,
    memory: number,
    parallelism: number,
  ): Promise<Uint8Array>;
  abstract hkdf(
    ikm: Uint8Array,
    salt: string | Uint8Array,
    info: string | Uint8Array,
    outputByteSize: number,
    algorithm: "sha256" | "sha512",
  ): Promise<Uint8Array>;
  abstract hkdfExpand(
    prk: Uint8Array,
    info: string | Uint8Array,
    outputByteSize: number,
    algorithm: "sha256" | "sha512",
  ): Promise<Uint8Array>;
  abstract hash(
    value: string | Uint8Array,
    algorithm: "sha1" | "sha256" | "sha512" | "md5",
  ): Promise<Uint8Array>;
  abstract hmac(
    value: Uint8Array,
    key: Uint8Array,
    algorithm: "sha1" | "sha256" | "sha512",
  ): Promise<Uint8Array>;
  abstract compare(a: Uint8Array, b: Uint8Array): Promise<boolean>;
  abstract hmacFast(
    value: Uint8Array | string,
    key: Uint8Array | string,
    algorithm: "sha1" | "sha256" | "sha512",
  ): Promise<Uint8Array | string>;
  abstract compareFast(a: Uint8Array | string, b: Uint8Array | string): Promise<boolean>;
  abstract aesEncrypt(data: Uint8Array, iv: Uint8Array, key: Uint8Array): Promise<Uint8Array>;
  /**
   * encrypt data using AES-256-GCM.
   *
   * @param data data to encrypt
   * @param iv the iv to use for encryption
   * @param key the key to use for encryption
   * @returns the encrypted data in the form of data + tag + iv
   */
  abstract aesGcmEncrypt(
    data: Uint8Array,
    iv: Uint8Array,
    key: Uint8Array,
    additionalData?: Uint8Array,
  ): Promise<Uint8Array>;
  abstract aesDecryptFastParameters(
    data: string,
    iv: string,
    mac: string,
    key: SymmetricCryptoKey,
  ): DecryptParameters<Uint8Array | string>;
  /**
   * Decrypts AES encrypted data using Forge in the web. Available modes are CBC and ECB.
   *
   *
   * @param data the data to decrypt.
   * @param iv the initialization vector to use for decryption
   * @param key the key to use for decryption
   * @param mode the mode to use for decryption
   */

  abstract aesDecryptFast(
    parameters: DecryptParameters<Uint8Array | string>,
    mode: "cbc" | "ecb",
    additionalData?: Uint8Array,
  ): Promise<string>;
  /**
   * Decrypts AES encrypted data. Available modes are CBC, ECB, and GCM.
   *
   * GCM mode supports only GCM 256 with a 12 byte IV and a 16 byte tag.
   *
   * @param data the data to decrypt. For CBC and ECB mode, this should be the ciphertext. For GCM mode, this should be the ciphertext + tag.
   * @param iv the initialization vector to use for decryption
   * @param key the key to use for decryption
   * @param mode the mode to use for decryption
   * @param additionalData additional data to use for decryption in GCM mode. Ignored for CBC and ECB mode.
   */
  abstract aesDecrypt(
    data: Uint8Array,
    iv: Uint8Array,
    key: Uint8Array,
    mode: "cbc" | "ecb" | "gcm",
    additionalData?: Uint8Array,
  ): Promise<Uint8Array>;
  abstract rsaEncrypt(
    data: Uint8Array,
    publicKey: Uint8Array,
    algorithm: "sha1" | "sha256",
  ): Promise<Uint8Array>;
  abstract rsaDecrypt(
    data: Uint8Array,
    privateKey: Uint8Array,
    algorithm: "sha1" | "sha256",
  ): Promise<Uint8Array>;
  abstract rsaExtractPublicKey(privateKey: Uint8Array): Promise<Uint8Array>;
  abstract rsaGenerateKeyPair(length: 1024 | 2048 | 4096): Promise<[Uint8Array, Uint8Array]>;
  /**
   * Generates a key of the given length suitable for use in AES encryption
   */
  abstract aesGenerateKey(bitLength: 128 | 192 | 256 | 512): Promise<CsprngArray>;
  /**
   * Generates a random array of bytes of the given length. Uses a cryptographically secure random number generator.
   *
   * Do not use this for generating encryption keys. Use aesGenerateKey or rsaGenerateKeyPair instead.
   */
  abstract randomBytes(length: number): Promise<CsprngArray>;
}
