import { SigningKeyType } from "../enums/signing-key-type.enum";

export class VerifyingKey {
  private innerKey: string;
  private keyType: SigningKeyType;

  constructor(verifyingKey: string, keyType: SigningKeyType) {
    this.innerKey = verifyingKey;
    this.keyType = keyType;
  }

  toString(): string {
    return this.innerKey;
  }

  algorithm(): SigningKeyType {
    return this.keyType;
  }
}
