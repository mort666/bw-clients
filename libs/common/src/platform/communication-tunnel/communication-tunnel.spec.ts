import { mock, MockProxy } from "jest-mock-extended";

import { makeEncString, makeStaticByteArray, makeSymmetricCryptoKey } from "../../../spec";
import { ApiService } from "../../abstractions/api.service";
import { InitTunnelResponse } from "../../auth/models/response/init-tunnel.response";
import { EncryptService } from "../abstractions/encrypt.service";
import { KeyGenerationService } from "../abstractions/key-generation.service";

import { CommunicationTunnel, TunnelVersion } from "./communication-tunnel";

describe("communicationTunnel", () => {
  const url = "http://key-connector.example";
  let apiService: MockProxy<ApiService>;
  let keyGenerationService: MockProxy<KeyGenerationService>;
  let encryptService: MockProxy<EncryptService>;
  let sut: CommunicationTunnel;
  const sharedKey = makeSymmetricCryptoKey(32);
  const encapsulationKey = makeStaticByteArray(32, 1);
  const encapsulatedKey = makeEncString("encapsulatedKey");

  beforeEach(() => {
    apiService = mock<ApiService>();
    keyGenerationService = mock<KeyGenerationService>();
    encryptService = mock<EncryptService>();

    apiService.initCommunicationTunnel.mockResolvedValue(
      new InitTunnelResponse({
        EncapsulationKey: encapsulationKey,
        CommunicationVersion: TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
      }),
    );
    keyGenerationService.createKey.mockResolvedValue(sharedKey);
    encryptService.rsaEncrypt.mockResolvedValue(encapsulatedKey);
  });

  describe("negotiateTunnel", () => {
    it("negotiates with the provided server", async () => {
      const supportedTunnelVersions = [TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM];
      sut = new CommunicationTunnel(
        apiService,
        keyGenerationService,
        encryptService,
        supportedTunnelVersions,
      );

      await sut.negotiateTunnel(url);

      expect(apiService.initCommunicationTunnel).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ supportedTunnelVersions }),
      );
    });

    it("generates a shared key", async () => {
      sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
        TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
      ]);

      await sut.negotiateTunnel(url);

      expect(keyGenerationService.createKey).toHaveBeenCalledWith(256);
    });

    it("encapsulates the shared key", async () => {
      sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
        TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
      ]);

      await sut.negotiateTunnel(url);

      expect(encryptService.rsaEncrypt).toHaveBeenCalledWith(sharedKey.key, encapsulationKey);
      expect(sut.encapsulatedKey).toBe(encapsulatedKey);
    });

    it.each(Object.values(TunnelVersion).filter((v) => typeof v !== "number"))(
      "negotiates tunnel version %s",
      async (tunnelVersion: keyof typeof TunnelVersion) => {
        sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
          TunnelVersion[tunnelVersion],
        ]);

        apiService.initCommunicationTunnel.mockResolvedValue(
          new InitTunnelResponse({
            EncapsulationKey: [1, 2, 3],
            CommunicationVersion: TunnelVersion[tunnelVersion],
          }),
        );

        await sut.negotiateTunnel(url);

        expect(sut.tunnelVersion).toBe(TunnelVersion[tunnelVersion]);
      },
    );

    it("throws an error if the communication version is not supported", async () => {
      sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
        TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
      ]);

      apiService.initCommunicationTunnel.mockResolvedValue(
        new InitTunnelResponse({
          EncapsulationKey: [1, 2, 3],
          CommunicationVersion: TunnelVersion.CLEAR_TEXT,
        }),
      );

      await expect(sut.negotiateTunnel(url)).rejects.toThrow("Unsupported communication version");
    });
  });

  describe("tunnel encryption", () => {
    const clearText = makeStaticByteArray(32, 2);
    const protectedText = makeStaticByteArray(32, 3);

    beforeEach(() => {
      encryptService.aesGcmEncryptToBytes.mockResolvedValue(protectedText);
      encryptService.aesGcmDecryptToBytes.mockResolvedValue(clearText);
    });

    it("throws an error if the tunnel is not initialized", async () => {
      sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
        TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
      ]);

      await expect(sut.protect(clearText)).rejects.toThrow("Communication tunnel not initialized");
      await expect(sut.unprotect(protectedText)).rejects.toThrow(
        "Communication tunnel not initialized",
      );
    });

    describe("CLEAR_TEXT", () => {
      beforeEach(async () => {
        sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
          TunnelVersion.CLEAR_TEXT,
        ]);
        apiService.initCommunicationTunnel.mockResolvedValue(
          new InitTunnelResponse({
            CommunicationVersion: TunnelVersion.CLEAR_TEXT,
          }),
        );
        await sut.negotiateTunnel(url);
      });

      it("does not encrypt the clear text", async () => {
        const result = await sut.protect(clearText);

        expect(result).toBe(clearText);
        expect(encryptService.aesGcmEncryptToBytes).not.toHaveBeenCalled();
      });

      it("does not decrypt the protected text", async () => {
        const result = await sut.unprotect(protectedText);

        expect(result).toBe(protectedText);
        expect(encryptService.aesGcmDecryptToBytes).not.toHaveBeenCalled();
      });

      describe("RSA_ENCAPSULATED_AES_256_GCM", () => {
        beforeEach(async () => {
          sut = new CommunicationTunnel(apiService, keyGenerationService, encryptService, [
            TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
          ]);
          apiService.initCommunicationTunnel.mockResolvedValue(
            new InitTunnelResponse({
              EncapsulationKey: encapsulationKey,
              CommunicationVersion: TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM,
            }),
          );
          await sut.negotiateTunnel(url);
        });

        it("encrypts the clear text", async () => {
          const result = await sut.protect(clearText);

          expect(result).toBe(protectedText);
          expect(encryptService.aesGcmEncryptToBytes).toHaveBeenCalledWith(
            clearText,
            sharedKey.key,
            expect.toEqualBuffer(new Uint8Array([TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM])),
          );
        });

        it("decrypts the protected text", async () => {
          const result = await sut.unprotect(protectedText);

          expect(result).toBe(clearText);
          expect(encryptService.aesGcmDecryptToBytes).toHaveBeenCalledWith(
            protectedText,
            sharedKey.key,
            expect.toEqualBuffer(new Uint8Array([TunnelVersion.RSA_ENCAPSULATED_AES_256_GCM])),
          );
        });
      });
    });
  });
});
