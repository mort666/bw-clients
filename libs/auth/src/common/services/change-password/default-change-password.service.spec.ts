import { mock, MockProxy } from "jest-mock-extended";

import { MasterPasswordApiService } from "@bitwarden/common/auth/abstractions/master-password-api.service.abstraction";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { UserId } from "@bitwarden/common/types/guid";
import { MasterKey, UserKey } from "@bitwarden/common/types/key";
import { KeyService, PBKDF2KdfConfig } from "@bitwarden/key-management";

import { ChangePasswordService } from "../../abstractions";

import { DefaultChangePasswordService } from "./default-change-password.service";

describe("DefaultChangePasswordService", () => {
  const userId = "userId" as UserId;

  let keyService: MockProxy<KeyService>;
  let masterPasswordApiService: MockProxy<MasterPasswordApiService>;
  let masterPasswordService: MockProxy<InternalMasterPasswordServiceAbstraction>;

  let sut: ChangePasswordService;

  const inputPasswordResult = {
    currentMasterKey: new SymmetricCryptoKey(new Uint8Array(32)) as MasterKey,
    currentServerMasterKeyHash: "currentServerMasterKeyHash",

    newPassword: "newPassword",
    newPasswordHint: "newPasswordHint",
    newMasterKey: new SymmetricCryptoKey(new Uint8Array(32)) as MasterKey,
    newServerMasterKeyHash: "newServerMasterKeyHash",
    newLocalMasterKeyHash: "newLocalMasterKeyHash",

    kdfConfig: new PBKDF2KdfConfig(),
  };

  const decryptedUserKey = new SymmetricCryptoKey(new Uint8Array(64)) as UserKey;
  const newMasterKeyEncryptedUserKey: [UserKey, EncString] = [
    decryptedUserKey,
    { encryptedString: "newMasterKeyEncryptedUserKey" } as EncString,
  ];

  beforeEach(() => {
    keyService = mock<KeyService>();
    masterPasswordApiService = mock<MasterPasswordApiService>();
    masterPasswordService = mock<InternalMasterPasswordServiceAbstraction>();

    sut = new DefaultChangePasswordService(
      keyService,
      masterPasswordApiService,
      masterPasswordService,
    );

    masterPasswordService.decryptUserKeyWithMasterKey.mockResolvedValue(decryptedUserKey);
    keyService.encryptUserKeyWithMasterKey.mockResolvedValue(newMasterKeyEncryptedUserKey);
  });

  describe("changePassword()", () => {
    it("should call the postPassword() API method with a the correct PasswordRequest credentials", async () => {
      // Act
      await sut.changePassword(inputPasswordResult, userId);

      // Assert
      expect(masterPasswordApiService.postPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          masterPasswordHash: inputPasswordResult.currentServerMasterKeyHash,
          masterPasswordHint: inputPasswordResult.newPasswordHint,
          newMasterPasswordHash: inputPasswordResult.newServerMasterKeyHash,
          key: newMasterKeyEncryptedUserKey[1].encryptedString,
        }),
      );
    });

    it("should call decryptUserKeyWithMasterKey and encryptUserKeyWithMasterKey", async () => {
      // Act
      await sut.changePassword(inputPasswordResult, userId);

      // Assert
      expect(masterPasswordService.decryptUserKeyWithMasterKey).toHaveBeenCalledWith(
        inputPasswordResult.currentMasterKey,
        userId,
      );
      expect(keyService.encryptUserKeyWithMasterKey).toHaveBeenCalledWith(
        inputPasswordResult.newMasterKey,
        decryptedUserKey,
      );
    });

    it("should throw an error if user key decryption fails", async () => {
      // Arrange
      masterPasswordService.decryptUserKeyWithMasterKey.mockResolvedValue(null);

      // Act & Assert
      await expect(sut.changePassword(inputPasswordResult, userId)).rejects.toThrow(
        "Could not decrypt user key",
      );
    });
  });
});
