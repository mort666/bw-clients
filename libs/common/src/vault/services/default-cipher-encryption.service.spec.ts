import { mock } from "jest-mock-extended";
import { of } from "rxjs";

import { BulkEncryptService } from "@bitwarden/common/key-management/crypto/abstractions/bulk-encrypt.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { UserId } from "@bitwarden/common/types/guid";
import { UserKey } from "@bitwarden/common/types/key";
import { CipherRepromptType, CipherType } from "@bitwarden/common/vault/enums";
import { CipherData } from "@bitwarden/common/vault/models/data/cipher.data";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { DefaultCipherEncryptionService } from "@bitwarden/common/vault/services/default-cipher-encryption.service";
import { CipherDecryptionKeys, KeyService } from "@bitwarden/key-management";

import { makeSymmetricCryptoKey } from "../../../spec";

import clearAllMocks = jest.clearAllMocks;

describe("DefaultCipherEncryptionService", () => {
  let service: DefaultCipherEncryptionService;

  const userId = "user-id" as UserId;
  const userKey = makeSymmetricCryptoKey();

  const encryptServiceMock = mock<EncryptService>();
  const bulkEncryptServiceMock = mock<BulkEncryptService>();
  const keyServiceMock = mock<KeyService>();
  const configServiceMock = mock<ConfigService>();

  beforeEach(() => {
    clearAllMocks();

    service = new DefaultCipherEncryptionService(
      encryptServiceMock,
      bulkEncryptServiceMock,
      keyServiceMock,
      configServiceMock,
    );
  });

  describe("encrypt", () => {
    it("should map non-encrypted fields", async () => {
      // TODO: Find means to catch new properties automatically
      const cipherView = new CipherView({
        id: "cipher-id",
        folderId: "folder-id",
        organizationId: "organization-id",
        favorite: true,
        type: CipherType.Card,
        collectionIds: ["collection-id"],
        revisionDate: new Date(),
        reprompt: CipherRepromptType.Password,
        edit: true,
      } as Cipher);

      service.encryptCipherWithCipherKey = jest.fn();
      service.encryptCipher = jest.fn();
      service.getCipherKeyEncryptionEnabled = jest.fn().mockResolvedValue(false);
      service.getKeyForCipherKeyDecryption = jest.fn().mockResolvedValue(userKey);

      await service.encrypt(cipherView, userId);

      expect(service.encryptCipher).toHaveBeenCalledWith(
        cipherView,
        expect.objectContaining({
          id: "cipher-id",
          folderId: "folder-id",
          organizationId: "organization-id",
          favorite: true,
          type: CipherType.Card,
          collectionIds: ["collection-id"],
          revisionDate: expect.any(Date),
          reprompt: CipherRepromptType.Password,
          edit: true,
        } as Cipher),
        userKey,
      );
    });

    it("should call encryptCipherWithKey when cipherKeyEncryption is enabled", async () => {
      service.encryptCipherWithCipherKey = jest.fn();
      service.encryptCipher = jest.fn();
      service.getCipherKeyEncryptionEnabled = jest.fn().mockResolvedValue(true);
      service.getKeyForCipherKeyDecryption = jest.fn().mockResolvedValue(userKey);

      const cipherView = new CipherView();

      await service.encrypt(cipherView, userId);

      expect(service.encryptCipherWithCipherKey).toHaveBeenCalledWith(
        expect.any(CipherView),
        expect.any(Cipher),
        userKey,
        userKey,
      );
      expect(service.encryptCipher).not.toHaveBeenCalled();
    });

    it("should call encryptCipher when cipherKeyEncryption is disabled", async () => {
      service.encryptCipherWithCipherKey = jest.fn();
      service.encryptCipher = jest.fn();
      service.getCipherKeyEncryptionEnabled = jest.fn().mockResolvedValue(false);
      service.getKeyForCipherKeyDecryption = jest.fn().mockResolvedValue(userKey);

      const cipherView = new CipherView();

      await service.encrypt(cipherView, userId);

      expect(service.encryptCipherWithCipherKey).not.toHaveBeenCalled();
      expect(service.encryptCipher).toHaveBeenCalledWith(
        expect.any(CipherView),
        expect.any(Cipher),
        userKey,
      );
    });
  });

  describe("encryptCipher", () => {
    it("should throw an error if the key is null", async () => {
      const cipherView = new CipherView();

      await expect(service.encryptCipher(cipherView, {} as Cipher, null as any)).rejects.toThrow(
        "Key to encrypt cipher must not be null. Use the org key, user key or cipher key.",
      );
    });

    it("should call all internal encrypt methods with the correct parameters", async () => {
      const cipherView = new CipherView({
        fields: [],
        passwordHistory: [],
        attachments: [],
      } as unknown as Cipher);
      const cipher = {} as Cipher;

      service.encryptObjProperty = jest.fn().mockResolvedValue(null);
      service.encryptCipherData = jest.fn().mockResolvedValue(null);
      service.encryptFields = jest.fn().mockResolvedValue(null);
      service.encryptPasswordHistories = jest.fn().mockResolvedValue(null);
      service.encryptAttachments = jest.fn().mockResolvedValue(null);

      await service.encryptCipher(cipherView, cipher, userKey);

      expect(service.encryptObjProperty).toHaveBeenCalledWith(
        cipherView,
        cipher,
        { name: null, notes: null },
        userKey,
      );
      expect(service.encryptCipherData).toHaveBeenCalledWith(cipher, cipherView, userKey);
      expect(service.encryptFields).toHaveBeenCalledWith(cipherView.fields, userKey);
      expect(service.encryptPasswordHistories).toHaveBeenCalledWith(
        cipherView.passwordHistory,
        userKey,
      );
      expect(service.encryptAttachments).toHaveBeenCalledWith(cipherView.attachments, userKey);
    });
  });

  describe("decrypt", () => {
    it("should return null if no keys are found for the user", async () => {
      keyServiceMock.cipherDecryptionKeys$.mockReturnValue(of(null));

      const result = await service.decrypt(new Cipher(), userId);

      expect(result).toEqual(null);
    });

    it.each([
      false, // Bulk encryption disabled
      true, // Bulk encryption enabled
    ])(
      "should group ciphers by organizationId and call decryptMany for each group with autoEnrollEnabled=%s",
      async (bulkEncryptionEnabled) => {
        const userCipher = new Cipher({ id: "user-cipher" } as CipherData);
        const cipher1 = new Cipher({ organizationId: "org1" } as CipherData);
        const cipher2 = new Cipher({ organizationId: "org2" } as CipherData);
        const ciphers = [userCipher, cipher1, cipher2];

        const org1Key = makeSymmetricCryptoKey();
        const org2Key = makeSymmetricCryptoKey();

        keyServiceMock.cipherDecryptionKeys$.mockReturnValue(
          of({
            userKey: userKey as UserKey,
            orgKeys: {
              org1: org1Key,
              org2: org2Key,
            },
          } as CipherDecryptionKeys),
        );

        encryptServiceMock.decryptItems.mockResolvedValue([]);
        bulkEncryptServiceMock.decryptItems.mockResolvedValue([]);

        const mockEncryptionMethod = bulkEncryptionEnabled
          ? bulkEncryptServiceMock.decryptItems
          : encryptServiceMock.decryptItems;
        configServiceMock.getFeatureFlag.mockResolvedValue(bulkEncryptionEnabled);

        await service.decryptMany(ciphers, userId);

        expect(mockEncryptionMethod).toHaveBeenCalledWith(
          expect.arrayContaining([userCipher]),
          userKey,
        );
        expect(mockEncryptionMethod).toHaveBeenCalledWith(
          expect.arrayContaining([cipher1]),
          org1Key,
        );
        expect(mockEncryptionMethod).toHaveBeenCalledWith(
          expect.arrayContaining([cipher2]),
          org2Key,
        );
      },
    );
  });
});
