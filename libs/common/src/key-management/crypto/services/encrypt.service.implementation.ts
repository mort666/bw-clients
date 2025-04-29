// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CryptoFunctionService } from "@bitwarden/common/key-management/crypto/abstractions/crypto-function.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import {
  EncryptionType,
  encryptionTypeToString as encryptionTypeName,
} from "@bitwarden/common/platform/enums";
import { Decryptable } from "@bitwarden/common/platform/interfaces/decryptable.interface";
import { Encrypted } from "@bitwarden/common/platform/interfaces/encrypted";
import { InitializerMetadata } from "@bitwarden/common/platform/interfaces/initializer-metadata.interface";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { EncArrayBuffer } from "@bitwarden/common/platform/models/domain/enc-array-buffer";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { EncryptedObject } from "@bitwarden/common/platform/models/domain/encrypted-object";
import {
  Aes256CbcHmacKey,
  Aes256CbcKey,
  SymmetricCryptoKey,
} from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { PureCrypto } from "@bitwarden/sdk-internal";

import {
  DefaultFeatureFlagValue,
  FeatureFlag,
  getFeatureFlagValue,
} from "../../../enums/feature-flag.enum";
import { ServerConfig } from "../../../platform/abstractions/config/server-config";
import { EncryptService } from "../abstractions/encrypt.service";

export class EncryptServiceImplementation implements EncryptService {
  private blockType0: boolean = DefaultFeatureFlagValue[FeatureFlag.PM17987_BlockType0];

  constructor(
    protected cryptoFunctionService: CryptoFunctionService,
    protected logService: LogService,
    protected logMacFailures: boolean,
  ) {}

  // Proxy functions; Their implementation are temporary before moving at this level to the SDK
  async encryptString(plainValue: string, key: SymmetricCryptoKey): Promise<EncString> {
    return new EncString(PureCrypto.symmetric_encrypt_string(plainValue, key.toEncoded()));
  }

  async encryptBytes(plainValue: Uint8Array, key: SymmetricCryptoKey): Promise<EncString> {
    return new EncString(PureCrypto.symmetric_encrypt_bytes(plainValue, key.toEncoded()));
  }

  async encryptFileData(plainValue: Uint8Array, key: SymmetricCryptoKey): Promise<EncArrayBuffer> {
    return new EncArrayBuffer(PureCrypto.symmetric_encrypt_filedata(plainValue, key.toEncoded()));
  }

  async decryptString(encString: EncString, key: SymmetricCryptoKey): Promise<string> {
    return PureCrypto.symmetric_decrypt_string(encString.encryptedString, key.toEncoded());
  }

  async decryptBytes(encString: EncString, key: SymmetricCryptoKey): Promise<Uint8Array> {
    return PureCrypto.symmetric_decrypt_bytes(encString.encryptedString, key.toEncoded());
  }

  async decryptFileData(encBuffer: EncArrayBuffer, key: SymmetricCryptoKey): Promise<Uint8Array> {
    return PureCrypto.symmetric_decrypt_filedata(encBuffer.buffer, key.toEncoded());
  }

  async wrapDecapsulationKey(
    decapsulationKeyPkcs8: Uint8Array,
    wrappingKey: SymmetricCryptoKey,
  ): Promise<EncString> {
    if (decapsulationKeyPkcs8 == null) {
      throw new Error("No decapsulation key provided for wrapping.");
    }

    if (wrappingKey == null) {
      throw new Error("No wrappingKey provided for wrapping.");
    }

    return new EncString(
      PureCrypto.symmetric_encrypt_bytes(decapsulationKeyPkcs8, wrappingKey.toEncoded()),
    );
  }

  async wrapEncapsulationKey(
    encapsulationKeySpki: Uint8Array,
    wrappingKey: SymmetricCryptoKey,
  ): Promise<EncString> {
    if (encapsulationKeySpki == null) {
      throw new Error("No encapsulation key provided for wrapping.");
    }

    if (wrappingKey == null) {
      throw new Error("No wrappingKey provided for wrapping.");
    }

    return new EncString(
      PureCrypto.symmetric_encrypt_bytes(encapsulationKeySpki, wrappingKey.toEncoded()),
    );
  }

  async wrapSymmetricKey(
    keyToBeWrapped: SymmetricCryptoKey,
    wrappingKey: SymmetricCryptoKey,
  ): Promise<EncString> {
    if (keyToBeWrapped == null) {
      throw new Error("No keyToBeWrapped provided for wrapping.");
    }

    if (wrappingKey == null) {
      throw new Error("No wrappingKey provided for wrapping.");
    }

    return new EncString(
      PureCrypto.wrap_symmetric_key(keyToBeWrapped.toEncoded(), wrappingKey.toEncoded()),
    );
  }

  async unwrapDecapsulationKey(
    wrappedDecapsulationKey: EncString,
    wrappingKey: SymmetricCryptoKey,
  ): Promise<Uint8Array> {
    return PureCrypto.symmetric_decrypt_bytes(
      wrappedDecapsulationKey.encryptedString,
      wrappingKey.toEncoded(),
    );
  }
  async unwrapEncapsulationKey(
    wrappedEncapsulationKey: EncString,
    wrappingKey: SymmetricCryptoKey,
  ): Promise<Uint8Array> {
    return PureCrypto.symmetric_decrypt_bytes(
      wrappedEncapsulationKey.encryptedString,
      wrappingKey.toEncoded(),
    );
  }
  async unwrapSymmetricKey(
    keyToBeUnwrapped: EncString,
    wrappingKey: SymmetricCryptoKey,
  ): Promise<SymmetricCryptoKey> {
    return new SymmetricCryptoKey(
      PureCrypto.unwrap_symmetric_key(keyToBeUnwrapped.encryptedString, wrappingKey.toEncoded()),
    );
  }

  async hash(value: string | Uint8Array, algorithm: "sha1" | "sha256" | "sha512"): Promise<string> {
    const hashArray = await this.cryptoFunctionService.hash(value, algorithm);
    return Utils.fromBufferToB64(hashArray);
  }

  // Handle updating private properties to turn on/off feature flags.
  onServerConfigChange(newConfig: ServerConfig): void {
    this.blockType0 = getFeatureFlagValue(newConfig, FeatureFlag.PM17987_BlockType0);
  }

  async encapsulateKeyUnsigned(
    sharedKey: SymmetricCryptoKey,
    encapsulationKey: Uint8Array,
  ): Promise<EncString> {
    if (sharedKey == null) {
      throw new Error("No sharedKey provided for encapsulation");
    }
    return await this.rsaEncrypt(sharedKey.toEncoded(), encapsulationKey);
  }

  async decapsulateKeyUnsigned(
    encryptedSharedKey: EncString,
    decapsulationKey: Uint8Array,
  ): Promise<SymmetricCryptoKey> {
    const keyBytes = await this.rsaDecrypt(encryptedSharedKey, decapsulationKey);
    return new SymmetricCryptoKey(keyBytes);
  }

  async decryptItems<T extends InitializerMetadata>(
    items: Decryptable<T>[],
    key: SymmetricCryptoKey,
  ): Promise<T[]> {
    if (items == null || items.length < 1) {
      return [];
    }

    // don't use promise.all because this task is not io bound
    const results = [];
    for (let i = 0; i < items.length; i++) {
      results.push(await items[i].decrypt(key));
    }
    return results;
  }

  private logDecryptError(
    msg: string,
    keyEncType: EncryptionType,
    dataEncType: EncryptionType,
    decryptContext: string,
  ) {
    this.logService.error(
      `[Encrypt service] ${msg} Key type ${encryptionTypeName(keyEncType)} Payload type ${encryptionTypeName(dataEncType)} Decrypt context: ${decryptContext}`,
    );
  }

  private logMacFailed(
    msg: string,
    keyEncType: EncryptionType,
    dataEncType: EncryptionType,
    decryptContext: string,
  ) {
    if (this.logMacFailures) {
      this.logDecryptError(msg, keyEncType, dataEncType, decryptContext);
    }
  }

  async rsaEncrypt(data: Uint8Array, publicKey: Uint8Array): Promise<EncString> {
    if (data == null) {
      throw new Error("No data provided for encryption.");
    }

    if (publicKey == null) {
      throw new Error("No public key provided for encryption.");
    }
    const encrypted = await this.cryptoFunctionService.rsaEncrypt(data, publicKey, "sha1");
    return new EncString(EncryptionType.Rsa2048_OaepSha1_B64, Utils.fromBufferToB64(encrypted));
  }

  async rsaDecrypt(data: EncString, privateKey: Uint8Array): Promise<Uint8Array> {
    if (data == null) {
      throw new Error("[Encrypt service] rsaDecrypt: No data provided for decryption.");
    }

    let algorithm: "sha1" | "sha256";
    switch (data.encryptionType) {
      case EncryptionType.Rsa2048_OaepSha1_B64:
      case EncryptionType.Rsa2048_OaepSha1_HmacSha256_B64:
        algorithm = "sha1";
        break;
      case EncryptionType.Rsa2048_OaepSha256_B64:
      case EncryptionType.Rsa2048_OaepSha256_HmacSha256_B64:
        algorithm = "sha256";
        break;
      default:
        throw new Error("Invalid encryption type.");
    }

    if (privateKey == null) {
      throw new Error("[Encrypt service] rsaDecrypt: No private key provided for decryption.");
    }

    return this.cryptoFunctionService.rsaDecrypt(data.dataBytes, privateKey, algorithm);
  }
}
