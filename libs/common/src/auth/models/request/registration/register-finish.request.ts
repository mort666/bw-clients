// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.

import { MasterPasswordAuthenticationData, MasterPasswordAuthenticationHash, MasterPasswordUnlockData } from "@bitwarden/common/key-management/master-password/types/master-password.types";
// eslint-disable-next-line no-restricted-imports
import { KdfType } from "@bitwarden/key-management";

import { EncryptedString } from "../../../../key-management/crypto/models/enc-string";
import { KeysRequest } from "../../../../models/request/keys.request";

export class RegisterFinishRequest {

  masterPasswordHash: MasterPasswordAuthenticationHash;
  userSymmetricKey: EncryptedString;
  kdf: KdfType;
  kdfIterations: number;
  kdfMemory?: number;
  kdfParallelism?: number;

  constructor(
    public email: string,
    public masterPasswordHint: string,
    masterPasswordAuthenticationData: MasterPasswordAuthenticationData,
    masterPasswordUnlockData: MasterPasswordUnlockData,
    public userAsymmetricKeys: KeysRequest,
    public emailVerificationToken?: string,
    public orgSponsoredFreeFamilyPlanToken?: string,
    public acceptEmergencyAccessInviteToken?: string,
    public acceptEmergencyAccessId?: string,
    public providerInviteToken?: string,
    public providerUserId?: string,

    // Org Invite data (only applies on web)
    public organizationUserId?: string,
    public orgInviteToken?: string,
  ) {
    this.masterPasswordHash = masterPasswordAuthenticationData.masterPasswordAuthenticationHash;
    this.userSymmetricKey = masterPasswordUnlockData.masterKeyWrappedUserKey.encryptedString;

    const kdf = masterPasswordAuthenticationData.kdf;
    if (kdf.kdfType === KdfType.PBKDF2_SHA256) {
      this.kdf = KdfType.PBKDF2_SHA256;
      this.kdfIterations = kdf.iterations;
      this.kdfMemory = undefined;
      this.kdfParallelism = undefined;
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
