import { firstValueFrom } from "rxjs";

import {
  OrganizationUserApiService,
  OrganizationUserResetPasswordEnrollmentRequest,
} from "@bitwarden/admin-console/common";
import { KeyService } from "@bitwarden/key-management";

import { OrganizationApiServiceAbstraction } from "../../admin-console/abstractions/organization/organization-api.service.abstraction";
import { EncryptService } from "../../key-management/crypto/abstractions/encrypt.service";
import { I18nService } from "../../platform/abstractions/i18n.service";
import { UserKey } from "../../types/key";
import { AccountService } from "../abstractions/account.service";
import { PasswordResetEnrollmentServiceAbstraction } from "../abstractions/password-reset-enrollment.service.abstraction";

export class PasswordResetEnrollmentServiceImplementation
  implements PasswordResetEnrollmentServiceAbstraction
{
  constructor(
    protected organizationApiService: OrganizationApiServiceAbstraction,
    protected accountService: AccountService,
    protected keyService: KeyService,
    protected encryptService: EncryptService,
    protected organizationUserApiService: OrganizationUserApiService,
    protected i18nService: I18nService,
  ) {}

  async enrollIfRequired(
    organizationSsoIdentifier: string,
    trustedOrganizationPublicKey: Uint8Array,
  ): Promise<void> {
    const orgAutoEnrollStatusResponse =
      await this.organizationApiService.getAutoEnrollStatus(organizationSsoIdentifier);

    const activeUserId = (await firstValueFrom(this.accountService.activeAccount$))?.id;
    if (!activeUserId) {
      throw new Error("No active user found");
    }

    const userKey = await firstValueFrom(this.keyService.userKey$(activeUserId));
    if (!userKey) {
      throw new Error("No user key found");
    }

    if (!orgAutoEnrollStatusResponse.resetPasswordEnabled) {
      await this.enroll(
        orgAutoEnrollStatusResponse.id,
        activeUserId as string,
        userKey,
        trustedOrganizationPublicKey,
      );
    }
  }

  async enroll(
    organizationId: string,
    userId: string,
    userKey: UserKey,
    trustedOrganizationPublicKey: Uint8Array,
  ): Promise<void> {
    // RSA Encrypt user's userKey.key with organization public key
    const encryptedKey = await this.encryptService.rsaEncrypt(
      userKey.key,
      trustedOrganizationPublicKey,
    );

    const resetRequest = new OrganizationUserResetPasswordEnrollmentRequest();
    resetRequest.resetPasswordKey = encryptedKey.encryptedString as string;

    await this.organizationUserApiService.putOrganizationUserResetPasswordEnrollment(
      organizationId,
      userId,
      resetRequest,
    );
  }
}
