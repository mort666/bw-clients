import { MasterPasswordSalt } from "@bitwarden/common/key-management/master-password/types/master-password.types";
import { KdfConfig } from "@bitwarden/key-management";

export interface PasswordInputResult {
  currentPassword?: string;
  newPassword: string;
  kdf?: KdfConfig;
  salt?: MasterPasswordSalt;
  newPasswordHint?: string;
  rotateUserKey?: boolean;
}
