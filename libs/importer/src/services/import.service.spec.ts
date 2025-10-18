// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject, Subject, firstValueFrom } from "rxjs";

// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.
// eslint-disable-next-line no-restricted-imports
import { CollectionService, CollectionView } from "@bitwarden/admin-console/common";
import { ClientType } from "@bitwarden/client-type";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { PinServiceAbstraction } from "@bitwarden/common/key-management/pin/pin.service.abstraction";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { SystemServiceProvider } from "@bitwarden/common/tools/providers";
import { CollectionId, OrganizationId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { FolderService } from "@bitwarden/common/vault/abstractions/folder/folder.service.abstraction";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { FolderView } from "@bitwarden/common/vault/models/view/folder.view";
import { RestrictedItemTypesService } from "@bitwarden/common/vault/services/restricted-item-types.service";
import { KeyService } from "@bitwarden/key-management";

import { BitwardenPasswordProtectedImporter } from "../importers/bitwarden/bitwarden-password-protected-importer";
import { Importer } from "../importers/importer";
import { ImporterMetadata, Instructions, Loader } from "../metadata";
import { ImportType } from "../models";
import { ImportResult } from "../models/import-result";

import { ImportApiServiceAbstraction } from "./import-api.service.abstraction";
import { ImportService } from "./import.service";

describe("ImportService", () => {
  let importService: ImportService;
  let cipherService: MockProxy<CipherService>;
  let folderService: MockProxy<FolderService>;
  let importApiService: MockProxy<ImportApiServiceAbstraction>;
  let i18nService: MockProxy<I18nService>;
  let collectionService: MockProxy<CollectionService>;
  let keyService: MockProxy<KeyService>;
  let encryptService: MockProxy<EncryptService>;
  let pinService: MockProxy<PinServiceAbstraction>;
  let accountService: MockProxy<AccountService>;
  let restrictedItemTypesService: MockProxy<RestrictedItemTypesService>;
  let systemServiceProvider: MockProxy<SystemServiceProvider>;

  beforeEach(() => {
    cipherService = mock<CipherService>();
    folderService = mock<FolderService>();
    importApiService = mock<ImportApiServiceAbstraction>();
    i18nService = mock<I18nService>();
    collectionService = mock<CollectionService>();
    keyService = mock<KeyService>();
    encryptService = mock<EncryptService>();
    pinService = mock<PinServiceAbstraction>();
    restrictedItemTypesService = mock<RestrictedItemTypesService>();

    const configService = mock<ConfigService>();
    configService.getFeatureFlag$.mockReturnValue(new BehaviorSubject(false));

    const environment = mock<PlatformUtilsService>();
    environment.getClientType.mockReturnValue(ClientType.Desktop);

    systemServiceProvider = mock<SystemServiceProvider>({
      configService,
      environment,
      log: jest.fn().mockReturnValue({ debug: jest.fn() }),
    });

    importService = new ImportService(
      cipherService,
      folderService,
      importApiService,
      i18nService,
      collectionService,
      keyService,
      encryptService,
      pinService,
      accountService,
      restrictedItemTypesService,
      systemServiceProvider,
    );
  });

  describe("getImporterInstance", () => {
    describe("Get bitPasswordProtected importer", () => {
      let importer: Importer;
      const organizationId = Utils.newGuid() as OrganizationId;
      const password = Utils.newGuid();
      const promptForPassword_callback = async () => {
        return password;
      };

      beforeEach(() => {
        importer = importService.getImporter(
          "bitwardenpasswordprotected",
          promptForPassword_callback,
          organizationId,
        );
      });

      it("returns an instance of BitwardenPasswordProtectedImporter", () => {
        expect(importer).toBeInstanceOf(BitwardenPasswordProtectedImporter);
      });

      it("has the promptForPassword_callback set", async () => {
        // Cast to any to access private property. Note: assumes instance of BitwardenPasswordProtectedImporter
        expect((importer as any).promptForPassword_callback).not.toBeNull();
        expect(await (importer as any).promptForPassword_callback()).toEqual(password);
      });

      it("has the appropriate organization Id", () => {
        expect(importer.organizationId).toEqual(organizationId);
      });
    });
  });

  describe("setImportTarget", () => {
    const organizationId = Utils.newGuid() as OrganizationId;

    let importResult: ImportResult;

    beforeEach(() => {
      importResult = new ImportResult();
    });

    it("empty importTarget does nothing", async () => {
      await importService["setImportTarget"](importResult, null, null);
      expect(importResult.folders.length).toBe(0);
    });

    const mockImportTargetFolder = new FolderView();
    mockImportTargetFolder.id = "myImportTarget";
    mockImportTargetFolder.name = "myImportTarget";

    it("passing importTarget adds it to folders", async () => {
      await importService["setImportTarget"](importResult, null, mockImportTargetFolder);
      expect(importResult.folders.length).toBe(1);
      expect(importResult.folders[0]).toBe(mockImportTargetFolder);
    });

    const mockFolder1 = new FolderView();
    mockFolder1.id = "folder1";
    mockFolder1.name = "folder1";

    const mockFolder2 = new FolderView();
    mockFolder2.id = "folder2";
    mockFolder2.name = "folder2";

    it("passing importTarget sets it as new root for all existing folders", async () => {
      importResult.folders.push(mockFolder1);
      importResult.folders.push(mockFolder2);

      await importService["setImportTarget"](importResult, null, mockImportTargetFolder);
      expect(importResult.folders.length).toBe(3);
      expect(importResult.folders[0]).toBe(mockImportTargetFolder);
      expect(importResult.folders[1].name).toBe(
        `${mockImportTargetFolder.name}/${mockFolder1.name}`,
      );
      expect(importResult.folders[2].name).toBe(
        `${mockImportTargetFolder.name}/${mockFolder2.name}`,
      );
    });

    const mockName = "myImportTarget";
    const mockId = "myImportTarget" as CollectionId;
    const mockImportTargetCollection = new CollectionView({
      name: mockName,
      id: mockId,
      organizationId,
    });

    const mockName1 = "collection1";
    const mockId1 = "collection1" as CollectionId;
    const mockCollection1 = new CollectionView({
      name: mockName1,
      id: mockId1,
      organizationId,
    });

    const mockName2 = "collection2";
    const mockId2 = "collection2" as CollectionId;
    const mockCollection2 = new CollectionView({
      name: mockName2,
      id: mockId2,
      organizationId,
    });

    it("passing importTarget adds it to collections", async () => {
      await importService["setImportTarget"](
        importResult,
        organizationId,
        mockImportTargetCollection,
      );
      expect(importResult.collections.length).toBe(1);
      expect(importResult.collections[0]).toBe(mockImportTargetCollection);
    });

    it("passing importTarget sets it as new root for all existing collections", async () => {
      importResult.collections.push(mockCollection1);
      importResult.collections.push(mockCollection2);

      await importService["setImportTarget"](
        importResult,
        organizationId,
        mockImportTargetCollection,
      );
      expect(importResult.collections.length).toBe(3);
      expect(importResult.collections[0]).toBe(mockImportTargetCollection);
      expect(importResult.collections[1].name).toBe(
        `${mockImportTargetCollection.name}/${mockCollection1.name}`,
      );
      expect(importResult.collections[2].name).toBe(
        `${mockImportTargetCollection.name}/${mockCollection2.name}`,
      );
    });

    it("passing importTarget as null on setImportTarget with organizationId throws error", async () => {
      const setImportTargetMethod = importService["setImportTarget"](
        null,
        organizationId,
        new Object() as FolderView,
      );

      await expect(setImportTargetMethod).rejects.toThrow();
    });

    it("passing importTarget as null on setImportTarget throws error", async () => {
      const setImportTargetMethod = importService["setImportTarget"](
        null,
        "",
        new Object() as CollectionView,
      );

      await expect(setImportTargetMethod).rejects.toThrow();
    });

    it("passing importTarget, collectionRelationship has the expected values", async () => {
      importResult.ciphers.push(createCipher({ name: "cipher1" }));
      importResult.ciphers.push(createCipher({ name: "cipher2" }));
      importResult.collectionRelationships.push([0, 0]);
      importResult.collections.push(mockCollection1);
      importResult.collections.push(mockCollection2);

      await importService["setImportTarget"](
        importResult,
        organizationId,
        mockImportTargetCollection,
      );
      expect(importResult.collectionRelationships.length).toEqual(2);
      expect(importResult.collectionRelationships[0]).toEqual([1, 0]);
      expect(importResult.collectionRelationships[1]).toEqual([0, 1]);
    });

    it("passing importTarget, folderRelationship has the expected values", async () => {
      importResult.folders.push(mockFolder1);
      importResult.folders.push(mockFolder2);

      importResult.ciphers.push(createCipher({ name: "cipher1", folderId: mockFolder1.id }));
      importResult.ciphers.push(createCipher({ name: "cipher2" }));
      importResult.folderRelationships.push([0, 0]);

      await importService["setImportTarget"](importResult, "", mockImportTargetFolder);
      expect(importResult.folderRelationships.length).toEqual(2);
      expect(importResult.folderRelationships[0]).toEqual([1, 0]);
      expect(importResult.folderRelationships[1]).toEqual([0, 1]);
    });
  });

  describe("metadata$", () => {
    let featureFlagSubject: BehaviorSubject<boolean>;
    let typeSubject: Subject<ImportType>;
    let mockLogger: { debug: jest.Mock };

    beforeEach(() => {
      featureFlagSubject = new BehaviorSubject(false);
      typeSubject = new Subject<ImportType>();
      mockLogger = { debug: jest.fn() };

      const configService = mock<ConfigService>();
      configService.getFeatureFlag$.mockReturnValue(featureFlagSubject);

      const environment = mock<PlatformUtilsService>();
      environment.getClientType.mockReturnValue(ClientType.Desktop);

      systemServiceProvider = mock<SystemServiceProvider>({
        configService,
        environment,
        log: jest.fn().mockReturnValue(mockLogger),
      });

      // Recreate the service with the updated mocks for logging tests
      importService = new ImportService(
        cipherService,
        folderService,
        importApiService,
        i18nService,
        collectionService,
        keyService,
        encryptService,
        pinService,
        accountService,
        restrictedItemTypesService,
        systemServiceProvider,
      );
    });

    afterEach(() => {
      featureFlagSubject.complete();
      typeSubject.complete();
    });

    it("should emit metadata when type$ emits", async () => {
      const testType: ImportType = "chromecsv";

      const metadataPromise = firstValueFrom(importService.metadata$(typeSubject));
      typeSubject.next(testType);

      const result = await metadataPromise;

      expect(result).toEqual({
        type: testType,
        loaders: expect.any(Array),
        instructions: Instructions.chromium,
      });
      expect(result.type).toBe(testType);
    });

    it("should include all loaders when chromium feature flag is enabled", async () => {
      const testType: ImportType = "bravecsv"; // bravecsv supports both file and chromium loaders
      featureFlagSubject.next(true);

      const metadataPromise = firstValueFrom(importService.metadata$(typeSubject));
      typeSubject.next(testType);

      const result = await metadataPromise;

      expect(result.loaders).toContain(Loader.chromium);
      expect(result.loaders).toContain(Loader.file);
    });

    it("should update when type$ changes", async () => {
      const emissions: ImporterMetadata[] = [];
      const subscription = importService.metadata$(typeSubject).subscribe((metadata) => {
        emissions.push(metadata);
      });

      typeSubject.next("chromecsv");
      typeSubject.next("bravecsv");

      // Wait for emissions
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emissions).toHaveLength(2);
      expect(emissions[0].type).toBe("chromecsv");
      expect(emissions[1].type).toBe("bravecsv");

      subscription.unsubscribe();
    });

    it("should update when both type$ and feature flag change", async () => {
      const emissions: ImporterMetadata[] = [];

      const subscription = importService.metadata$(typeSubject).subscribe((metadata) => {
        emissions.push(metadata);
      });

      // Initial emission
      typeSubject.next("chromecsv");

      // Change both at the same time
      featureFlagSubject.next(true);
      typeSubject.next("bravecsv");

      // Wait for emissions
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emissions.length).toBeGreaterThanOrEqual(2);
      const lastEmission = emissions[emissions.length - 1];
      expect(lastEmission.type).toBe("bravecsv");

      subscription.unsubscribe();
    });

    it("should log debug information with correct data", async () => {
      const testType: ImportType = "chromecsv";

      const metadataPromise = firstValueFrom(importService.metadata$(typeSubject));
      typeSubject.next(testType);

      await metadataPromise;

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { importType: testType, capabilities: expect.any(Object) },
        "capabilities updated",
      );
    });
  });
});

function createCipher(options: Partial<CipherView> = {}) {
  const cipher = new CipherView();

  cipher.name = options.name;
  cipher.type = options.type;
  cipher.folderId = options.folderId;
  cipher.collectionIds = options.collectionIds;
  cipher.organizationId = options.organizationId;

  return cipher;
}
