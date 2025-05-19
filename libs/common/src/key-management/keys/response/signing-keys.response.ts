import {
  parseSigningKeyTypeFromString,
  SigningKeyType,
  UserSigningKey,
  VerifyingKey,
} from "@bitwarden/key-management";

export class UserSigningKeyData {
  readonly keyAlgorithm: SigningKeyType;
  readonly wrappedSigningKey: UserSigningKey;
  readonly verifyingKey: VerifyingKey;

  constructor(response: any) {
    this.keyAlgorithm = response.keyAlgorithm;
    this.wrappedSigningKey = new UserSigningKey(response.wrappedSigningKey);
    this.verifyingKey = new VerifyingKey(
      response.verifyingKey,
      parseSigningKeyTypeFromString(this.keyAlgorithm),
    );
  }
}
