import { mock } from "jest-mock-extended";

import { CryptoFunctionService } from "@bitwarden/common/key-management/crypto/abstractions/crypto-function.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { UserId } from "@bitwarden/common/types/guid";
import { BiometricsStatus, BiometricStateService } from "@bitwarden/key-management";

import OsBiometricsServiceWindows from "./os-biometrics-windows.service";

jest.mock("@bitwarden/desktop-napi", () => ({
  biometrics: {
    available: jest.fn(),
    setBiometricSecret: jest.fn(),
    getBiometricSecret: jest.fn(),
    deriveKeyMaterial: jest.fn(),
    prompt: jest.fn(),
  },
  passwords: {
    getPassword: jest.fn(),
    deletePassword: jest.fn(),
  },
}));

describe("OsBiometricsServiceWindows", () => {
  let service: OsBiometricsServiceWindows;
  let biometricStateService: BiometricStateService;

  beforeEach(() => {
    const i18nService = mock<I18nService>();
    const logService = mock<LogService>();
    biometricStateService = mock<BiometricStateService>();
    const encryptionService = mock<EncryptService>();
    const cryptoFunctionService = mock<CryptoFunctionService>();
    service = new OsBiometricsServiceWindows(
      i18nService,
      null,
      logService,
      biometricStateService,
      encryptionService,
      cryptoFunctionService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getBiometricsFirstUnlockStatusForUser", () => {
    const userId = "test-user-id" as UserId;
    it("should return Available when requirePasswordOnRestart is false", async () => {
      biometricStateService.getRequirePasswordOnStart = jest.fn().mockResolvedValue(false);
      const result = await service.getBiometricsFirstUnlockStatusForUser(userId);
      expect(result).toBe(BiometricsStatus.Available);
    });
    it("should return Available when requirePasswordOnRestart is true and client key half is set", async () => {
      biometricStateService.getRequirePasswordOnStart = jest.fn().mockResolvedValue(true);
      (service as any).clientKeyHalves = new Map<string, Uint8Array>();
      (service as any).clientKeyHalves.set(userId, new Uint8Array([1, 2, 3, 4]));
      const result = await service.getBiometricsFirstUnlockStatusForUser(userId);
      expect(result).toBe(BiometricsStatus.Available);
    });
    it("should return UnlockNeeded when requirePasswordOnRestart is true and client key half is not set", async () => {
      biometricStateService.getRequirePasswordOnStart = jest.fn().mockResolvedValue(true);
      (service as any).clientKeyHalves = new Map<string, Uint8Array>();
      const result = await service.getBiometricsFirstUnlockStatusForUser(userId);
      expect(result).toBe(BiometricsStatus.UnlockNeeded);
    });
  });

  describe("getOrCreateBiometricEncryptionClientKeyHalf", () => {
    const userId = "test-user-id" as UserId;
    const key = new SymmetricCryptoKey(new Uint8Array(64));
    it("should return null if getRequirePasswordOnRestart is false", async () => {
      biometricStateService.getRequirePasswordOnStart = jest.fn().mockResolvedValue(false);
      const result = await service.getOrCreateBiometricEncryptionClientKeyHalf(userId, key);
      expect(result).toBeNull();
    });
  });
});
