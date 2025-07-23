import { MasterKeyWrappedUserKey, MasterPasswordAuthenticationData, MasterPasswordAuthenticationHash, MasterPasswordUnlockData } from "@bitwarden/common/key-management/master-password/types/master-password.types";
// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.
// eslint-disable-next-line no-restricted-imports
import { KdfType } from "@bitwarden/key-management";

import { KeysRequest } from "../../../models/request/keys.request";

export class SetPasswordRequest {
  // TODO: This will be replaced by masterPasswordAuthenticationData in the future
  masterPasswordHash: MasterPasswordAuthenticationHash;
  // TODO: This will be replaced by masterPasswordAuthenticationData in the future
  key: MasterKeyWrappedUserKey;

  masterPasswordHint: string;
  orgIdentifier: string;
  keys: KeysRequest | null;

  /** @deprecated */
  kdf: KdfType;
  /** @deprecated */
  kdfIterations: number;
  /** @deprecated */
  kdfMemory?: number;
  /** @deprecated */
  kdfParallelism?: number;

  constructor(
    masterPasswordAuthenticationData: MasterPasswordAuthenticationData,
    masterPasswordUnlockData: MasterPasswordUnlockData,
    masterPasswordHint: string,
    orgIdentifier: string,
    keys: KeysRequest | null
  ) {
    this.masterPasswordHash = masterPasswordAuthenticationData.masterPasswordAuthenticationHash;
    this.key = masterPasswordUnlockData.masterKeyWrappedUserKey;
    this.masterPasswordHint = masterPasswordHint;

    this.orgIdentifier = orgIdentifier;
    this.keys = keys;

    // This will be removed when the deprecated properties are removed
    const kdf = masterPasswordAuthenticationData.kdf;
    if (kdf.kdfType === KdfType.PBKDF2_SHA256) {
      this.kdf = KdfType.PBKDF2_SHA256;
      this.kdfIterations = kdf.iterations;
    } else if (kdf.kdfType === KdfType.Argon2id) {
      this.kdf = KdfType.Argon2id;
      this.kdfIterations = kdf.iterations;
      this.kdfMemory = kdf.memory;
      this.kdfParallelism = kdf.parallelism;
    } else {
      throw new Error(`Unsupported KDF type: ${kdf}`);
    }
  }
}
