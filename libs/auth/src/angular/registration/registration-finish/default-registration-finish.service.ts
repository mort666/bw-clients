// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { MasterPasswordPolicyOptions } from "@bitwarden/common/admin-console/models/domain/master-password-policy-options";
import { AccountApiService } from "@bitwarden/common/auth/abstractions/account-api.service";
import { RegisterFinishRequest } from "@bitwarden/common/auth/models/request/registration/register-finish.request";
import {
  EncString,
} from "@bitwarden/common/key-management/crypto/models/enc-string";
import { MasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { MasterPasswordAuthenticationData, MasterPasswordUnlockData } from "@bitwarden/common/key-management/master-password/types/master-password.types";
import { KeysRequest } from "@bitwarden/common/models/request/keys.request";
import { KeyService } from "@bitwarden/key-management";

import { PasswordInputResult } from "../../input-password/password-input-result";

import { RegistrationFinishService } from "./registration-finish.service";

export class DefaultRegistrationFinishService implements RegistrationFinishService {
  constructor(
    protected keyService: KeyService,
    protected accountApiService: AccountApiService,
    protected masterPasswordService: MasterPasswordServiceAbstraction,
  ) { }

  getOrgNameFromOrgInvite(): Promise<string | null> {
    return null;
  }

  getMasterPasswordPolicyOptsFromOrgInvite(): Promise<MasterPasswordPolicyOptions | null> {
    return null;
  }

  determineLoginSuccessRoute(): Promise<string> {
    return Promise.resolve("/vault");
  }

  async finishRegistration(
    email: string,
    passwordInputResult: PasswordInputResult,
    emailVerificationToken?: string,
    orgSponsoredFreeFamilyPlanToken?: string,
    acceptEmergencyAccessInviteToken?: string,
    emergencyAccessId?: string,
    providerInviteToken?: string,
    providerUserId?: string,
  ): Promise<void> {
    const newUserKey = await this.keyService.makeUserKeyV1Raw();
    const userAsymmetricKeys = await this.keyService.makeKeyPair(newUserKey);
    const authenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(
      passwordInputResult.newPassword,
      passwordInputResult.kdf,
      passwordInputResult.salt,
    );
    const unlockData = await this.masterPasswordService.makeMasterPasswordUnlockData(
      passwordInputResult.newPassword,
      passwordInputResult.kdf,
      passwordInputResult.salt,
      newUserKey,
    );

    const registerRequest = await this.buildRegisterRequest(
      email,
      passwordInputResult,
      authenticationData,
      unlockData,
      userAsymmetricKeys,
      emailVerificationToken,
      orgSponsoredFreeFamilyPlanToken,
      acceptEmergencyAccessInviteToken,
      emergencyAccessId,
      providerInviteToken,
      providerUserId,
    );

    return await this.accountApiService.registerFinish(registerRequest);
  }

  protected async buildRegisterRequest(
    email: string,
    passwordInputResult: PasswordInputResult,
    masterPasswordAuthenticationData: MasterPasswordAuthenticationData,
    masterPasswordUnlockData: MasterPasswordUnlockData,
    userAsymmetricKeys: [string, EncString],
    emailVerificationToken?: string,
    orgSponsoredFreeFamilyPlanToken?: string, // web only
    acceptEmergencyAccessInviteToken?: string, // web only
    emergencyAccessId?: string, // web only
    providerInviteToken?: string, // web only
    providerUserId?: string, // web only
  ): Promise<RegisterFinishRequest> {
    const userAsymmetricKeysRequest = new KeysRequest(
      userAsymmetricKeys[0],
      userAsymmetricKeys[1].encryptedString,
    );

    const registerFinishRequest = new RegisterFinishRequest(
      email,
      passwordInputResult.newPasswordHint,
      masterPasswordAuthenticationData,
      masterPasswordUnlockData,
      userAsymmetricKeysRequest,
    );

    if (emailVerificationToken) {
      registerFinishRequest.emailVerificationToken = emailVerificationToken;
    }

    return registerFinishRequest;
  }
}
