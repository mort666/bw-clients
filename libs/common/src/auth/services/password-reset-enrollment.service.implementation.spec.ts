import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { OrganizationUserApiService } from "@bitwarden/admin-console/common";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { UserKey } from "@bitwarden/common/types/key";
import { KeyService } from "@bitwarden/key-management";

import { OrganizationApiServiceAbstraction } from "../../admin-console/abstractions/organization/organization-api.service.abstraction";
import { OrganizationAutoEnrollStatusResponse } from "../../admin-console/models/response/organization-auto-enroll-status.response";
import { EncryptService } from "../../key-management/crypto/abstractions/encrypt.service";
import { I18nService } from "../../platform/abstractions/i18n.service";
import { Account, AccountService } from "../abstractions/account.service";

import { PasswordResetEnrollmentServiceImplementation } from "./password-reset-enrollment.service.implementation";

describe("PasswordResetEnrollmentServiceImplementation", () => {
  const activeAccountSubject = new BehaviorSubject<Account | null>(null);
  const userKeySubject = new BehaviorSubject<UserKey | null>(null);

  let organizationApiService: MockProxy<OrganizationApiServiceAbstraction>;
  let accountService: MockProxy<AccountService>;
  let keyService: MockProxy<KeyService>;
  let encryptService: MockProxy<EncryptService>;
  let organizationUserApiService: MockProxy<OrganizationUserApiService>;
  let i18nService: MockProxy<I18nService>;
  let service: PasswordResetEnrollmentServiceImplementation;

  beforeEach(() => {
    organizationApiService = mock<OrganizationApiServiceAbstraction>();
    accountService = mock<AccountService>();
    accountService.activeAccount$ = activeAccountSubject;
    keyService = mock<KeyService>();
    keyService.userKey$.mockReturnValue(userKeySubject);
    encryptService = mock<EncryptService>();
    organizationUserApiService = mock<OrganizationUserApiService>();
    i18nService = mock<I18nService>();
    service = new PasswordResetEnrollmentServiceImplementation(
      organizationApiService,
      accountService,
      keyService,
      encryptService,
      organizationUserApiService,
      i18nService,
    );
  });

  describe("enrollIfRequired", () => {
    it("should not enroll when user is already enrolled in password reset", async () => {
      const mockResponse = new OrganizationAutoEnrollStatusResponse({
        ResetPasswordEnabled: true,
        Id: "orgId",
      });
      organizationApiService.getAutoEnrollStatus.mockResolvedValue(mockResponse);
      activeAccountSubject.next({ id: "ssoId" } as Account);
      userKeySubject.next(new SymmetricCryptoKey(new Uint8Array(64)) as UserKey);

      const enrollSpy = jest.spyOn(service, "enroll");
      enrollSpy.mockResolvedValue();

      await service.enrollIfRequired("ssoId", new Uint8Array(0));

      expect(service.enroll).not.toHaveBeenCalled();
    });

    it("should enroll when user is not enrolled in password reset", async () => {
      const mockResponse = new OrganizationAutoEnrollStatusResponse({
        ResetPasswordEnabled: false,
        Id: "orgId",
      });
      organizationApiService.getAutoEnrollStatus.mockResolvedValue(mockResponse);

      const enrollSpy = jest.spyOn(service, "enroll");
      enrollSpy.mockResolvedValue();

      await service.enrollIfRequired("ssoId", new Uint8Array(0));

      expect(service.enroll).toHaveBeenCalled();
    });
  });

  describe("enroll", () => {
    it("should enroll the user when a user id and key is provided", async () => {
      const orgKeyResponse = {
        publicKey: "publicKey",
        privateKey: "privateKey",
      };
      const encryptedKey = { encryptedString: "encryptedString" };
      organizationApiService.getKeys.mockResolvedValue(orgKeyResponse as any);
      encryptService.rsaEncrypt.mockResolvedValue(encryptedKey as any);

      await service.enroll(
        "orgId",
        "userId",
        new SymmetricCryptoKey(new Uint8Array(64)) as UserKey,
        new Uint8Array(0),
      );

      expect(
        organizationUserApiService.putOrganizationUserResetPasswordEnrollment,
      ).toHaveBeenCalledWith(
        "orgId",
        "userId",
        expect.objectContaining({
          resetPasswordKey: encryptedKey.encryptedString,
        }),
      );
    });
  });
});
