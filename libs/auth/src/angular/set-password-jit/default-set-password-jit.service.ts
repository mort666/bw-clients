// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { firstValueFrom } from "rxjs";

// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.
// eslint-disable-next-line no-restricted-imports
import {
  OrganizationUserApiService,
  OrganizationUserResetPasswordEnrollmentRequest,
} from "@bitwarden/admin-console/common";
import { InternalUserDecryptionOptionsServiceAbstraction } from "@bitwarden/auth/common";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import { MasterPasswordApiService } from "@bitwarden/common/auth/abstractions/master-password-api.service.abstraction";
import { ForceSetPasswordReason } from "@bitwarden/common/auth/models/domain/force-set-password-reason";
import { SetPasswordRequest } from "@bitwarden/common/auth/models/request/set-password.request";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { EncString } from "@bitwarden/common/key-management/crypto/models/enc-string";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { MasterPasswordAuthenticationData } from "@bitwarden/common/key-management/master-password/types/master-password.types";
import { KeysRequest } from "@bitwarden/common/models/request/keys.request";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { HashPurpose } from "@bitwarden/common/platform/enums";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { UserId } from "@bitwarden/common/types/guid";
import { UserKey } from "@bitwarden/common/types/key";
import { KdfConfigService, KeyService, KdfConfig } from "@bitwarden/key-management";

import {
  SetPasswordCredentials,
  SetPasswordJitService,
} from "./set-password-jit.service.abstraction";

export class DefaultSetPasswordJitService implements SetPasswordJitService {
  constructor(
    protected encryptService: EncryptService,
    protected i18nService: I18nService,
    protected kdfConfigService: KdfConfigService,
    protected keyService: KeyService,
    protected masterPasswordApiService: MasterPasswordApiService,
    protected masterPasswordService: InternalMasterPasswordServiceAbstraction,
    protected organizationApiService: OrganizationApiServiceAbstraction,
    protected organizationUserApiService: OrganizationUserApiService,
    protected userDecryptionOptionsService: InternalUserDecryptionOptionsServiceAbstraction,
  ) { }

  async setPassword(credentials: SetPasswordCredentials): Promise<void> {
    const {
      newPassword,
      newPasswordHint,
      orgSsoIdentifier,
      orgId,
      resetPasswordAutoEnroll,
      userId,

      kdfConfig,
    } = credentials;

    for (const [key, value] of Object.entries(credentials)) {
      if (value == null) {
        throw new Error(`${key} not found. Could not set password.`);
      }
    }

    const userKey = await this.keyService.makeUserKeyV1Raw();
    const salt = await firstValueFrom(this.masterPasswordService.saltForAccount$(userId));
    const authenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(
      newPassword,
      kdfConfig,
      salt,
    );
    const unlockData = await this.masterPasswordService.makeMasterPasswordUnlockData(
      newPassword,
      kdfConfig,
      salt,
      userKey,
    );

    // Since this is an existing JIT provisioned user in a MP encryption org setting first password,
    // they will not already have a user asymmetric key pair so we must create it for them.
    const [keyPair, keysRequest] = await this.makeKeyPairAndRequest(userKey);

    const request = new SetPasswordRequest(
      authenticationData,
      unlockData,
      newPasswordHint,
      orgSsoIdentifier,
      keysRequest,
    );

    await this.masterPasswordApiService.setPassword(request);

    // Clear force set password reason to allow navigation back to vault.
    await this.masterPasswordService.setForceSetPasswordReason(ForceSetPasswordReason.None, userId);

    {
      // TODO: Remove this block once master key and local master key hash are removed from state. This usage is deprecated.
      const newMasterKey = await this.keyService.makeMasterKey(newPassword, salt, kdfConfig);
      await this.masterPasswordService.setMasterKey(newMasterKey, userId);
      const newLocalMasterKeyHash = await this.keyService.hashMasterKey(
        newPassword,
        newMasterKey,
        HashPurpose.LocalAuthorization,
      );
      await this.masterPasswordService.setMasterKeyHash(newLocalMasterKeyHash, userId);
    }
    // User now has a password so update account decryption options in state
    await this.updateAccountDecryptionProperties(kdfConfig, userKey, userId);

    await this.keyService.setPrivateKey(keyPair[1].encryptedString, userId);

    if (resetPasswordAutoEnroll) {
      await this.handleResetPasswordAutoEnroll(authenticationData, orgId, userId);
    }
  }

  private async makeKeyPairAndRequest(
    userKey: UserKey,
  ): Promise<[[string, EncString], KeysRequest]> {
    const keyPair = await this.keyService.makeKeyPair(userKey);
    if (keyPair == null) {
      throw new Error("keyPair not found. Could not set password.");
    }
    const keysRequest = new KeysRequest(keyPair[0], keyPair[1].encryptedString);

    return [keyPair, keysRequest];
  }

  private async updateAccountDecryptionProperties(
    kdfConfig: KdfConfig,
    userKey: UserKey,
    userId: UserId,
  ) {
    const userDecryptionOpts = await firstValueFrom(
      this.userDecryptionOptionsService.userDecryptionOptions$,
    );
    userDecryptionOpts.hasMasterPassword = true;
    await this.userDecryptionOptionsService.setUserDecryptionOptions(userDecryptionOpts);
    await this.kdfConfigService.setKdfConfig(userId, kdfConfig);
    await this.keyService.setUserKey(userKey, userId);
  }

  private async handleResetPasswordAutoEnroll(
    masterPasswordAuthenticationData: MasterPasswordAuthenticationData,
    orgId: string,
    userId: UserId,
  ) {
    const organizationKeys = await this.organizationApiService.getKeys(orgId);

    if (organizationKeys == null) {
      throw new Error(this.i18nService.t("resetPasswordOrgKeysError"));
    }

    const publicKey = Utils.fromB64ToArray(organizationKeys.publicKey);

    // RSA Encrypt user key with organization public key
    const userKey = await firstValueFrom(this.keyService.userKey$(userId));

    if (userKey == null) {
      throw new Error("userKey not found. Could not handle reset password auto enroll.");
    }

    const encryptedUserKey = await this.encryptService.encapsulateKeyUnsigned(userKey, publicKey);

    const resetRequest = new OrganizationUserResetPasswordEnrollmentRequest();
    resetRequest.masterPasswordHash = masterPasswordAuthenticationData.masterPasswordAuthenticationHash;
    resetRequest.resetPasswordKey = encryptedUserKey.encryptedString;

    await this.organizationUserApiService.putOrganizationUserResetPasswordEnrollment(
      orgId,
      userId,
      resetRequest,
    );
  }
}
