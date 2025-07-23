// FIXME: Update this file to be type safe and remove this and next line

import { MasterPasswordAuthenticationHash } from "@bitwarden/common/key-management/master-password/types/master-password.types";

// @ts-strict-ignore
export class SecretVerificationRequest {
  masterPasswordHash: MasterPasswordAuthenticationHash;
  otp: string;
  authRequestAccessCode: string;
}
