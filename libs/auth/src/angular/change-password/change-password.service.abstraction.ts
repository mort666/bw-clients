import { PasswordInputResult } from "@bitwarden/auth/angular";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { UserId } from "@bitwarden/common/types/guid";

export abstract class ChangePasswordService {
  /**
   * Creates a new user key and re-encrypts all required data with it.
   * - does so by calling the underlying method on the `UserKeyRotationService`
   * - implemented in Web only
   *
   * @param currentPassword the current password
   * @param newPassword the new password
   * @param user the user account
   * @param newPasswordHint the new password hint
   * @throws if called from a non-Web client
   */
  abstract rotateUserKeyMasterPasswordAndEncryptedData(
    currentPassword: string,
    newPassword: string,
    user: Account,
    newPasswordHint: string,
  ): Promise<void>;

  /**
   * Creates a new user key and re-encrypts all required data with it.
   * - does so by calling the underlying deprecated method on the `UserKeyRotationService`
   * - implemented in Web only
   *
   * @param newPassword the new password
   * @param user the user account
   * @throws if called from a non-Web client
   */
  abstract rotateUserKeyAndEncryptedDataLegacy(newPassword: string, user: Account): Promise<void>;

  /**
   * Using credentials on the `PasswordInputResult`:
   *  - verifies that the current password is correct (that is, it can decrypt the user key), and if so:
   *  - builds a `PasswordRequest` object that gets POSTed to `"/accounts/password"`
   *
   * @param passwordInputResult credentials object received from the `InputPasswordComponent`
   * @param userId the `userId`
   * @throws if the `userId`, `currentMasterKey`, or `currentServerMasterKeyHash` is not found
   */
  abstract changePassword(passwordInputResult: PasswordInputResult, userId: UserId): Promise<void>;
}
