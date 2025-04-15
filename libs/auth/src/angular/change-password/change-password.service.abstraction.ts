import { PasswordInputResult } from "@bitwarden/auth/angular";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { UserId } from "@bitwarden/common/types/guid";

export abstract class ChangePasswordService {
  abstract rotateUserKeyMasterPasswordAndEncryptedData(
    currentPassword: string,
    newPassword: string,
    user: Account,
    newPasswordHint: string,
  ): Promise<void | null>;

  abstract rotateUserKeyAndEncryptedDataLegacy(
    newPassword: string,
    user: Account,
  ): Promise<void | null>;

  abstract changePassword(passwordInputResult: PasswordInputResult, userId: UserId): Promise<void>;
}
