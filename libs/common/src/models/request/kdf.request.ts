import { MasterPasswordAuthenticationData, MasterPasswordUnlockData } from "@bitwarden/common/key-management/master-password/types/master-password.types";
// eslint-disable-next-line no-restricted-imports
import { KdfType } from "@bitwarden/key-management";

import { PasswordRequest } from "../../auth/models/request/password.request";

export class KdfRequest extends PasswordRequest {
  /** @deprecated */
  kdf: KdfType;
  /** @deprecated */
  kdfIterations: number;
  /** @deprecated */
  kdfMemory?: number;
  /** @deprecated */
  kdfParallelism?: number;;

  constructor(authenticationData: MasterPasswordAuthenticationData, unlockData: MasterPasswordUnlockData) {
    super(authenticationData, unlockData);

    const kdf = authenticationData.kdf;
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
