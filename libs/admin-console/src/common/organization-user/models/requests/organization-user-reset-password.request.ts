import { EncryptedString } from "@bitwarden/common/key-management/crypto/models/enc-string";
import { MasterPasswordAuthenticationData, MasterPasswordAuthenticationHash, MasterPasswordUnlockData } from "@bitwarden/common/key-management/master-password/types/master-password.types";

export class OrganizationUserResetPasswordRequest {
  /** @deprecated */
  newMasterPasswordHash: MasterPasswordAuthenticationHash;
  /** @deprecated */
  key: EncryptedString;

  constructor(masterPasswordAuthenticationData: MasterPasswordAuthenticationData, masterPasswordUnlockData: MasterPasswordUnlockData) {
    this.newMasterPasswordHash = masterPasswordAuthenticationData.masterPasswordAuthenticationHash;
    this.key = masterPasswordUnlockData.masterKeyWrappedUserKey.encryptedString;
  }
}
