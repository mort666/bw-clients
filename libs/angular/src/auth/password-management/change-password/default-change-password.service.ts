import { firstValueFrom } from "rxjs";

// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.
// eslint-disable-next-line no-restricted-imports
import { PasswordInputResult } from "@bitwarden/auth/angular";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { MasterPasswordApiService } from "@bitwarden/common/auth/abstractions/master-password-api.service.abstraction";
import { PasswordRequest } from "@bitwarden/common/auth/models/request/password.request";
import { UpdateTempPasswordRequest } from "@bitwarden/common/auth/models/request/update-temp-password.request";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { UserId } from "@bitwarden/common/types/guid";
import { KeyService } from "@bitwarden/key-management";

import { ChangePasswordService } from "./change-password.service.abstraction";

export class DefaultChangePasswordService implements ChangePasswordService {
  constructor(
    protected keyService: KeyService,
    protected masterPasswordApiService: MasterPasswordApiService,
    protected masterPasswordService: InternalMasterPasswordServiceAbstraction,
  ) { }

  async rotateUserKeyMasterPasswordAndEncryptedData(
    currentPassword: string,
    newPassword: string,
    user: Account,
    hint: string,
  ): Promise<void> {
    throw new Error("rotateUserKeyMasterPasswordAndEncryptedData() is only implemented in Web");
  }

  async changePassword(passwordInputResult: PasswordInputResult, userId: UserId | null) {
    const userKey = await firstValueFrom(this.keyService.userKey$(userId));
    if (userKey == null) {
      throw new Error("Can't find UserKey");
    }
    const salt = await firstValueFrom(this.masterPasswordService.saltForAccount$(userId));
    const authenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(passwordInputResult.newPassword, passwordInputResult.kdf, salt);
    const unlockData = await this.masterPasswordService.makeMasterPasswordUnlockData(passwordInputResult.newPassword, passwordInputResult.kdf, passwordInputResult.salt, userKey);

    const request = new PasswordRequest(authenticationData, unlockData);

    const oldAuthenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(passwordInputResult.currentPassword, passwordInputResult.kdf, salt);
    request.masterPasswordHash = oldAuthenticationData.masterPasswordAuthenticationHash;
    request.masterPasswordHint = passwordInputResult.newPasswordHint;

    try {
      await this.masterPasswordApiService.postPassword(request);
    } catch {
      throw new Error("Could not change password");
    }
  }

  async changePasswordForAccountRecovery(passwordInputResult: PasswordInputResult, userId: UserId) {
    const userKey = await firstValueFrom(this.keyService.userKey$(userId));
    if (userKey == null) {
      throw new Error("Can't find UserKey");
    }
    const salt = await firstValueFrom(this.masterPasswordService.saltForAccount$(userId));
    const authenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(passwordInputResult.newPassword, passwordInputResult.kdf, salt);
    const unlockData = await this.masterPasswordService.makeMasterPasswordUnlockData(passwordInputResult.newPassword, passwordInputResult.kdf, passwordInputResult.salt, userKey);

    const request = new UpdateTempPasswordRequest(authenticationData, unlockData);
    request.masterPasswordHint = passwordInputResult.newPasswordHint;

    try {
      // TODO: PM-23047 will look to consolidate this into the change password endpoint.
      await this.masterPasswordApiService.putUpdateTempPassword(request);
    } catch {
      throw new Error("Could not change password");
    }
  }
}
