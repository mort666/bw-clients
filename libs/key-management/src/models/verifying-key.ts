import { Utils } from "@bitwarden/common/platform/misc/utils";
import { PureCrypto } from "@bitwarden/sdk-internal";

import { SigningKeyType } from "../enums/signing-key-type.enum";

export class VerifyingKey {
  private innerKey: string;

  constructor(verifyingKey: string) {
    this.innerKey = verifyingKey;
  }

  toString(): string {
    return this.innerKey;
  }

  algorithm(): SigningKeyType {
    return PureCrypto.key_algorithm_for_verifying_key(Utils.fromB64ToArray(this.innerKey));
  }
}
