import { MasterPasswordAuthenticationData, MasterPasswordUnlockData } from "../../../key-management/master-password/types/master-password.types";

import { SecretVerificationRequest } from "./secret-verification.request";

export class PasswordRequest extends SecretVerificationRequest {
  masterPasswordHint: string | null = null;

  masterPasswordUnlockData: MasterPasswordUnlockData;
  masterPasswordAuthenticationData: MasterPasswordAuthenticationData;

  /** @deprecated */
  newMasterPasswordHash: string;
  /** @deprecated */
  key: string;

  constructor(masterPasswordAuthenticationData: MasterPasswordAuthenticationData, masterPasswordUnlockData: MasterPasswordUnlockData) {
    super();
    this.masterPasswordUnlockData = masterPasswordUnlockData;
    this.masterPasswordAuthenticationData = masterPasswordAuthenticationData;

    { // TODO: This will be removed once the deprecated properties are removed 
      this.newMasterPasswordHash = masterPasswordAuthenticationData.masterPasswordAuthenticationHash;
      this.key = masterPasswordUnlockData.masterKeyWrappedUserKey.encryptedString;
    }
  }
}
