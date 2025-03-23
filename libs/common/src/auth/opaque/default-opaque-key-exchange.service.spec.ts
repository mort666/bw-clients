import { MockProxy, mock } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { RotateableKeySet } from "@bitwarden/auth/common";
import {
  BitwardenClient,
  ClientRegistrationFinishResult,
  ClientRegistrationStartResult,
  CryptoClient,
  RotateableKeyset,
} from "@bitwarden/sdk-internal";

// Must mock modules before importing
jest.mock("../../platform/misc/utils", () => {
  const originalModule = jest.requireActual("../../platform/misc/utils");

  return {
    ...originalModule, // avoid losing the original module's exports
    fromBufferToB64: jest.fn(),
    fromB64ToArray: jest.fn(),
  };
});

import { EncryptService } from "../../key-management/crypto/abstractions/encrypt.service";
import { LogService } from "../../platform/abstractions/log.service";
import { SdkService } from "../../platform/abstractions/sdk/sdk.service";
import { Utils } from "../../platform/misc/utils";
import { EncString } from "../../platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { OpaqueSessionId } from "../../types/guid";
import { UserKey } from "../../types/key";

import { DefaultOpaqueKeyExchangeService } from "./default-opaque-key-exchange.service";
import { OpaqueCipherConfiguration } from "./models/opaque-cipher-configuration";
import { RegistrationStartResponse } from "./models/registration-start.response";
import { OpaqueKeyExchangeApiService } from "./opaque-key-exchange-api.service";
import { OpaqueKeyExchangeService } from "./opaque-key-exchange.service";

describe("DefaultOpaqueKeyExchangeService", () => {
  let opaqueKeyExchangeApiService: MockProxy<OpaqueKeyExchangeApiService>;
  let sdkService: MockProxy<SdkService>;
  let encryptService: MockProxy<EncryptService>;
  let logService: MockProxy<LogService>;

  let service: OpaqueKeyExchangeService;

  let sdkBitwardenClient: BitwardenClient;
  let sdkCryptoClient: CryptoClient;

  beforeEach(() => {
    opaqueKeyExchangeApiService = mock<OpaqueKeyExchangeApiService>();

    sdkService = mock<SdkService>();
    sdkBitwardenClient = mock<BitwardenClient>();
    sdkService.client$ = new BehaviorSubject<BitwardenClient>(sdkBitwardenClient);
    sdkCryptoClient = mock<CryptoClient>();
    sdkBitwardenClient.crypto = jest.fn().mockReturnValue(sdkCryptoClient);

    encryptService = mock<EncryptService>();
    logService = mock<LogService>();

    service = new DefaultOpaqueKeyExchangeService(
      opaqueKeyExchangeApiService,
      sdkService,
      encryptService,
      logService,
    );
  });

  it("instantiates", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    let masterPassword: string;
    let userKey: UserKey;
    let opaqueCipherConfig: OpaqueCipherConfiguration;
    let clientRegistrationStartResult: ClientRegistrationStartResult;
    let registrationRequestB64: string;
    let registrationStartResponse: RegistrationStartResponse;
    let registrationResponseArray: Uint8Array;
    let registrationUploadB64: string;
    let clientRegistrationFinishResult: ClientRegistrationFinishResult;
    let sdkRotateableKeyset: RotateableKeyset;
    let rotatableKeySet: RotateableKeySet<SymmetricCryptoKey>;

    beforeEach(() => {
      masterPassword = "masterPassword";
      userKey = new SymmetricCryptoKey(new Uint8Array(64)) as UserKey;
      opaqueCipherConfig = new OpaqueCipherConfiguration({
        memory: 1024,
        iterations: 1,
        parallelism: 1,
      });

      clientRegistrationStartResult = mock<ClientRegistrationStartResult>();

      registrationStartResponse = mock<RegistrationStartResponse>();
      registrationRequestB64 = "registration_request";
      registrationUploadB64 = "registration_upload";

      registrationResponseArray = new Uint8Array([1, 2, 3, 4, 5]);
      clientRegistrationFinishResult = mock<ClientRegistrationFinishResult>();

      sdkRotateableKeyset = {
        private_key:
          "4.A0NkSBITVucCAttGzh600t3wP5bS+MbqMbIsdImumsDR9CQo5E7MJ85IES+S70Miymn1Yvfjva/7XifXdZFfwD/ZnUzDccrc62Dfx0liDyCvLoPyX98UkM/rLjG6+j1qatlmNF4f/ahb+zOOaB8dL9k+fCJkvEEDxgEGU52a5KvE61HtEVy/MjnmCJaKLp4v4Ac0WcDkfs+TbWa5Y+x3i4rxe1K9LmWmPB7AeoFaWnCvwcSuSGhAF4XyQpkvxLlpmmoIfwBgq4FmBszDS+IO7pFXjAfl+JXlzhpcieBWIoHc6Peb7pvfgoYQz8+Ocq/ztS9L/+QdAFyoXh5p/yKAQA==",
        public_key:
          "2.hrHGpvLlJuzl5U3+/daF/w==|wiklRhnim8A3vSu5eUZZIZM9J8cG/g3OIHGKGaXE9FRPyHFwnMbOMWjLsHV5m/zx647HTpaesblwG36Rwy2cf7bu6BPny2COz4f+50MWUBqLNM2o09pyDZsaKqlwfnRAvcBst3f5YuIx/4DFGSfwZwutdzGkQMc9/oxXw0mMqiDeGk7fsSBzJSo781kuLQvnD1sc0S6FGQf4ttshsiS+Pea5AygbwEnuozbAsrfMqkSORRvU74fI0tS4CRtujATLEpHt4QKiViSjPtnea8DK7QoTkDiy+EjeocyCNQezsqoadJ1a/50hzLnJ//PXoBKsu0tLazs+ARjuswHZA+oOFqzUQJi4hT70zVJipOyJFzs2vBr/bWuV5gH/OpTr2P6F3jft8DuQoRneYBFvrRs5vvnOaTw+Eglx65jFvbg9c0pxKDh4HBVFi9HUE6DJGYri7AJJO/37D0irp6OMTKDiZQ5ooBf+avoQS2zFrEUZIe4uyKxMeh//0qjeedYvRKU4OwhFQ/1AywJpk/pW4/xGmimsISSWWyajNItPia/9rgGGCXYdQmLYzHdUTg6UEMl1O/edxulkGfnqGT6y7ByERr9wItkzjj0q+XYx5jpY0fg8PE5ay4s7LPQEI+p9JCSIbslif4hj1K7Ph/JGiHm3aFg3lj9QdxfgUmARKKnS4te2yboEw8owUDhnjy2mo/di1Xn+Rsusl9KwleK7DBd0fgoxBqPm+ovcOHxvjU5yEe68rMRBx0OQJNtvxiJMjzquRAci97B8E3t76xfQYTj/t36EW7pz9kDUVzkO4BrAmZeeg5Eclb6cDRa1KsS27lr1nkH1MPJhfSYMokpsdfal6Eeq5eF+tZnAxbXE0bVokXmkDob2JOFrTaejua7WOGkNPtuC/nM9V5NQQRJpaQcw4G9ShMG/plndLexVcB1UJmaafNqVFcxIYsZ2+aRqEuAGRgtSE525t+F906AHu/MCjpSpJrJGrCBsaEtKqagS3qfg35BGNAWlRwGhaBbQccPsxyoXOKUFRDgNygzJiQyJvGl3UhaUJshApHPYRWZPRYRi1ClHbtMPrT5T2ta5d+s9MXXnF7YK9WhiErxkDIMXUPYzrITeX65us7JjLdRyDj4HscxYIs0i40p2+94jTDDhlg4F+W3POet0ZUwUST+8OWeAHM0mcIPkuuc8aJvBUeLua8j0nZjPxrG4YfpLeXm2awkiZdCuzYiDc+WO222tNYu5Bc2AdHl2cTmjKYuHZgOTkqJfAIdaBUMKjj/c3wDFlDntZFOv6OJKV3zH5fhF7I78W7YbVQIAkPhymdKkl2yzjICsmnWMF+/v+HpRc7bcoHZK/Bg86DnzhxyoUp6qF569SdFBg2dnM1BHn4rS2K3a1Crt4HoUfnY9uvyYFTjFHMhBqvdMqivEfFeiYral88Bs7buQeUbrPEq4v+yax31Gr+YcbnodDsWjWUBywUCQMhQa2ZQzM/XD361SJTM5tjUFXDow3Vs1aDfZ9PoFpwb73acgi+SXquAfi1RLR+sZ0PNDeslLADZF+OckDoHYwHc/+AsRvSq4n1GRvLpcZhxPOMXdUqZTGTkmhC8+M9IS8RkTPlhhs/mSdXp3gJ3dhpAYkb7tlmvX9gHGmWQgnu4=|ysx/NjMZjqu+j7H3P1G+SDZAc8c+M2x6uDD1w8VDMMk=",
        encapsulated_key:
          "2.ohB9QRqyPhd4BBvqGsjxXw==|D/NTfz7fj4q8yG8KI2x/1JKpY2dSll8mefOxHvO7LCVF8l3iovn3q4S+ZYzIvU9CT8KKyirdx5GdBHUk744rcTyE+sjweJXwzVKXPcNx07o6UsdziYAQzSIpZIs2N7arUeoD8VyIegAiRUaJp/g8q7K9++5o3T2/RRD/NGvDrraBrQbCtQs3Gl8nYJ/c6Ve5MPtej29kKREo2o8SMCFkr6j8UNdgbXwIxujC8H6pLZkMj1uCdbvFoSQENCkybTv+DJr8BCcPsTZ7ov11LmUGuq4EvOGseQnZxwJD4BGcrl3iSLX62vUg/6NHFbkgskjSbOrMMO4rvMIBmQkBjvKxzf9IRUASEqTAJH7gv9TKGED0VzJrYgFL9bplOU+puzDcaY2scNID5fMnSB9384CvmqstQL1TIHh03Jkqj8o5WNQw/ZHTcY2RUfeWdOsLn30JROht3bkxLmqbphTttI8XXVIH2pWinztMlQ66SgKU7TaX1qHm5FS4CLasP9IH541S/Syd+kbUZ1/diLYIKu7PyQ==|BLGTKJT50o9NBPJ2XeQG9sOeFqVJlIezauvi1mOt/XU=",
      } as RotateableKeyset;

      rotatableKeySet = new RotateableKeySet(
        new EncString(sdkRotateableKeyset.encapsulated_key),
        new EncString(sdkRotateableKeyset.public_key),
        new EncString(sdkRotateableKeyset.private_key),
      );
    });

    describe("register input validation", () => {
      const falseyValues = [undefined, null, ""];

      it.each(falseyValues)(
        "should throw error if masterPassword is %p",
        async (badMasterPassword) => {
          await expect(
            service.register(badMasterPassword as any, userKey, opaqueCipherConfig),
          ).rejects.toThrow(
            `Unable to register user with missing parameters. masterPassword exists: ${!!badMasterPassword}, userKey exists: ${!!userKey}, cipherConfig exists: ${!!opaqueCipherConfig}`,
          );
        },
      );

      it.each(falseyValues)("should throw error if userKey is %p", async (badUserKey) => {
        await expect(
          service.register(masterPassword, badUserKey as any, opaqueCipherConfig),
        ).rejects.toThrow(
          `Unable to register user with missing parameters. masterPassword exists: ${!!masterPassword}, userKey exists: ${!!badUserKey}, cipherConfig exists: ${!!opaqueCipherConfig}`,
        );
      });

      it.each(falseyValues)("should throw error if cipherConfig is %p", async (badCipherConfig) => {
        await expect(
          service.register(masterPassword, userKey, badCipherConfig as any),
        ).rejects.toThrow(
          `Unable to register user with missing parameters. masterPassword exists: ${!!masterPassword}, userKey exists: ${!!userKey}, cipherConfig exists: ${!!badCipherConfig}`,
        );
      });
    });

    it("registers a user with OPAQUE with the provided master password, user key, and cipher config", async () => {
      // Arrange
      sdkCryptoClient.opaque_register_start = jest
        .fn()
        .mockReturnValue(clientRegistrationStartResult);

      jest.spyOn(Utils, "fromBufferToB64").mockImplementation((input) => {
        if (input === clientRegistrationStartResult.registration_request) {
          return registrationRequestB64;
        }

        if (input === clientRegistrationFinishResult.registration_upload) {
          return registrationUploadB64;
        }

        return "";
      });

      opaqueKeyExchangeApiService.registrationStart.mockResolvedValue(registrationStartResponse);

      jest.spyOn(Utils, "fromB64ToArray").mockImplementationOnce(() => {
        return registrationResponseArray;
      });

      sdkCryptoClient.opaque_register_finish = jest
        .fn()
        .mockReturnValue(clientRegistrationFinishResult);

      sdkCryptoClient.create_rotateablekeyset_from_exportkey = jest
        .fn()
        .mockReturnValue(sdkRotateableKeyset);

      // Act
      const result = await service.register(masterPassword, userKey, opaqueCipherConfig);

      // Assert
      expect(sdkCryptoClient.opaque_register_start).toHaveBeenCalledWith(
        masterPassword,
        opaqueCipherConfig.toSdkConfig(),
      );

      expect(opaqueKeyExchangeApiService.registrationStart).toHaveBeenCalledWith(
        expect.objectContaining({
          registrationRequest: registrationRequestB64,
          cipherConfiguration: opaqueCipherConfig,
        }),
      );

      expect(sdkCryptoClient.opaque_register_finish).toHaveBeenCalledWith(
        masterPassword,
        opaqueCipherConfig.toSdkConfig(),
        registrationResponseArray,
        clientRegistrationStartResult.state,
      );

      expect(sdkCryptoClient.create_rotateablekeyset_from_exportkey).toHaveBeenCalledWith(
        clientRegistrationFinishResult.export_key,
        userKey.key,
      );

      expect(opaqueKeyExchangeApiService.registrationFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: registrationStartResponse.sessionId,
          registrationUpload: registrationUploadB64,
          keySet: rotatableKeySet,
        }),
      );

      expect(result).toBe(registrationStartResponse.sessionId);
    });
  });

  describe("setRegistrationActive", () => {
    let sessionId: OpaqueSessionId;

    beforeEach(() => {
      sessionId = "sessionId" as OpaqueSessionId;
    });

    it("sets the registration as active", async () => {
      // Act
      await service.setRegistrationActive(sessionId);

      // Assert
      expect(opaqueKeyExchangeApiService.setRegistrationActive).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
        }),
      );
    });
  });

  // TODO: test login

  // TODO: test decryptUserKeyWithExportKey
});
