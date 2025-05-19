import { SigningKeyType } from "@bitwarden/key-management";

export class AccountKeysRequest {
  // Other keys encrypted by the userkey
  userKeyEncryptedAccountPrivateKey: string;
  accountPublicKey: string;
  signedPublicKeyOwnershipClaim: string | null;

  userKeyEncryptedSigningKey: string | null;
  verifyingKey: string | null;
  signingKeyType: SigningKeyType | null;

  constructor(
    userKeyEncryptedAccountPrivateKey: string,
    accountPublicKey: string,
    signedPublicKeyOwnershipClaim: string | null,
    userKeyEncryptedSigningKey: string | null,
    verifyingKey: string | null,
    signingKeyType: SigningKeyType | null,
  ) {
    this.userKeyEncryptedAccountPrivateKey = userKeyEncryptedAccountPrivateKey;
    this.accountPublicKey = accountPublicKey;
    this.signedPublicKeyOwnershipClaim = signedPublicKeyOwnershipClaim;
    this.userKeyEncryptedSigningKey = userKeyEncryptedSigningKey;
    this.verifyingKey = verifyingKey;
    this.signingKeyType = signingKeyType;
  }
}
