// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import {
  OrganizationUserApiService,
  OrganizationUserResetPasswordRequest,
  OrganizationUserResetPasswordWithIdRequest,
} from "@bitwarden/admin-console/common";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import {
  EncryptedString,
  EncString,
} from "@bitwarden/common/key-management/crypto/models/enc-string";
import { MasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { MasterPasswordSalt } from "@bitwarden/common/key-management/master-password/types/master-password.types";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { OrganizationId, UserId } from "@bitwarden/common/types/guid";
import { UserKey } from "@bitwarden/common/types/key";
import {
  UserKeyRotationKeyRecoveryProvider,
  KeyService,
} from "@bitwarden/key-management";

import { OrganizationUserResetPasswordEntry } from "./organization-user-reset-password-entry";

@Injectable({
  providedIn: "root",
})
export class OrganizationUserResetPasswordService
  implements
  UserKeyRotationKeyRecoveryProvider<
    OrganizationUserResetPasswordWithIdRequest,
    OrganizationUserResetPasswordEntry
  > {
  constructor(
    private keyService: KeyService,
    private encryptService: EncryptService,
    private organizationService: OrganizationService,
    private organizationUserApiService: OrganizationUserApiService,
    private organizationApiService: OrganizationApiServiceAbstraction,
    private i18nService: I18nService,
    private masterPasswordService: MasterPasswordServiceAbstraction,
  ) { }

  /**
   * Builds a recovery key for a user to recover their account.
   *
   * @param orgId desired organization
   * @param userKey user key
   * @param trustedPublicKeys public keys of organizations that the user trusts
   */
  async buildRecoveryKey(
    orgId: string,
    userKey: UserKey,
    trustedPublicKeys: Uint8Array[],
  ): Promise<EncryptedString> {
    if (userKey == null) {
      throw new Error("User key is required for recovery.");
    }

    // Retrieve Public Key
    const orgKeys = await this.organizationApiService.getKeys(orgId);
    if (orgKeys == null) {
      throw new Error(this.i18nService.t("resetPasswordOrgKeysError"));
    }

    const publicKey = Utils.fromB64ToArray(orgKeys.publicKey);

    if (
      !trustedPublicKeys.some(
        (key) => Utils.fromBufferToHex(key) === Utils.fromBufferToHex(publicKey),
      )
    ) {
      throw new Error("Untrusted public key");
    }

    // RSA Encrypt user key with organization's public key
    const encryptedKey = await this.encryptService.encapsulateKeyUnsigned(userKey, publicKey);

    return encryptedKey.encryptedString;
  }

  /**
   * Sets a user's master password through account recovery.
   * Intended for organization admins
   * @param newMasterPassword user's new master password
   * @param email user's email
   * @param orgUserId organization user's id
   * @param orgId organization id
   */
  async resetMasterPassword(
    newMasterPassword: string,
    email: string,
    orgUserId: string,
    orgId: OrganizationId,
  ): Promise<void> {
    const response = await this.organizationUserApiService.getOrganizationUserResetPasswordDetails(
      orgId,
      orgUserId,
    );

    if (response == null) {
      throw new Error(this.i18nService.t("resetPasswordDetailsError"));
    }
    // TODO: Salt should come from server, since it will be decoupled from email
    const salt = email.toLowerCase().trim() as MasterPasswordSalt;

    // Decrypt Organization's encrypted Private Key with org key
    const orgSymKey = await this.keyService.getOrgKey(orgId);
    if (orgSymKey == null) {
      throw new Error("No org key found");
    }

    const decPrivateKey = await this.encryptService.unwrapDecapsulationKey(
      EncString.fromEncryptedString(response.encryptedPrivateKey),
      orgSymKey,
    );

    // Decrypt User's Reset Password Key to get UserKey
    const userKey = await this.encryptService.decapsulateKeyUnsigned(
      EncString.fromEncryptedString(response.resetPasswordKey),
      decPrivateKey,
    ) as UserKey;

    const authenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(newMasterPassword, response.kdf, salt);
    const unlockData = await this.masterPasswordService.makeMasterPasswordUnlockData(newMasterPassword, response.kdf, salt, userKey);

    // Create request
    const request = new OrganizationUserResetPasswordRequest(
      authenticationData,
      unlockData,
    );

    // Change user's password
    await this.organizationUserApiService.putOrganizationUserResetPassword(
      orgId,
      orgUserId,
      request,
    );
  }

  async getPublicKeys(userId: UserId): Promise<OrganizationUserResetPasswordEntry[]> {
    const allOrgs = (await firstValueFrom(this.organizationService.organizations$(userId))).filter(
      (org) => org.resetPasswordEnrolled,
    );

    const entries: OrganizationUserResetPasswordEntry[] = [];
    for (const org of allOrgs) {
      const publicKey = await this.organizationApiService.getKeys(org.id);
      const encodedPublicKey = Utils.fromB64ToArray(publicKey.publicKey);
      const entry = new OrganizationUserResetPasswordEntry(org.id, encodedPublicKey, org.name);
      entries.push(entry);
    }
    return entries;
  }

  /**
   * Returns existing account recovery keys re-encrypted with the new user key.
   * @param originalUserKey the original user key
   * @param newUserKey the new user key
   * @param userId the user id
   * @throws Error if new user key is null
   * @returns a list of account recovery keys that have been re-encrypted with the new user key
   */
  async getRotatedData(
    newUserKey: UserKey,
    trustedPublicKeys: Uint8Array[],
    userId: UserId,
  ): Promise<OrganizationUserResetPasswordWithIdRequest[] | null> {
    if (newUserKey == null) {
      throw new Error("New user key is required for rotation.");
    }

    const allOrgs = await firstValueFrom(this.organizationService.organizations$(userId));
    if (!allOrgs) {
      throw new Error("Could not get organizations");
    }

    const requests: OrganizationUserResetPasswordWithIdRequest[] = [];
    for (const org of allOrgs) {
      // If not already enrolled, skip
      if (!org.resetPasswordEnrolled) {
        continue;
      }

      // Re-enroll - encrypt user key with organization public key
      const encryptedKey = await this.buildRecoveryKey(org.id, newUserKey, trustedPublicKeys);

      // Create/Execute request
      const request = new OrganizationUserResetPasswordWithIdRequest();
      request.organizationId = org.id;
      request.resetPasswordKey = encryptedKey;
      request.masterPasswordHash = "ignored";

      requests.push(request);
    }
    return requests;
  }
}
