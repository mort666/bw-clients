// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { EncryptedString } from "@bitwarden/common/key-management/crypto/models/enc-string";
import { MasterPasswordAuthenticationData, MasterPasswordAuthenticationHash, MasterPasswordUnlockData } from "@bitwarden/common/key-management/master-password/types/master-password.types";

import { EmailTokenRequest } from "./email-token.request";

export class EmailRequest extends EmailTokenRequest {
  newMasterPasswordHash: MasterPasswordAuthenticationHash;
  token: string
  key: EncryptedString;

  constructor(authenticationData: MasterPasswordAuthenticationData, unlockData: MasterPasswordUnlockData) {
    super();
    this.masterPasswordHash = authenticationData.masterPasswordAuthenticationHash;
    this.newMasterPasswordHash = authenticationData.masterPasswordAuthenticationHash;
  }
}
