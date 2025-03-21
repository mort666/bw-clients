import { MockProxy, mock } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { BitwardenClient } from "@bitwarden/sdk-internal";

import { EncryptService } from "../../key-management/crypto/abstractions/encrypt.service";
import { LogService } from "../../platform/abstractions/log.service";
import { SdkService } from "../../platform/abstractions/sdk/sdk.service";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { UserKey } from "../../types/key";

import { DefaultOpaqueKeyExchangeService } from "./default-opaque-key-exchange.service";
import { OpaqueCipherConfiguration } from "./models/opaque-cipher-configuration";
import { OpaqueKeyExchangeApiService } from "./opaque-key-exchange-api.service";
import { OpaqueKeyExchangeService } from "./opaque-key-exchange.service";

describe("DefaultOpaqueKeyExchangeService", () => {
  let opaqueKeyExchangeApiService: MockProxy<OpaqueKeyExchangeApiService>;
  let sdkService: MockProxy<SdkService>;
  let encryptService: MockProxy<EncryptService>;
  let logService: MockProxy<LogService>;

  let service: OpaqueKeyExchangeService;

  let sdkBitwardenClient: BitwardenClient;

  beforeEach(() => {
    opaqueKeyExchangeApiService = mock<OpaqueKeyExchangeApiService>();

    sdkService = mock<SdkService>();
    sdkBitwardenClient = mock<BitwardenClient>();
    sdkService.client$ = new BehaviorSubject<BitwardenClient>(sdkBitwardenClient);

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
    // let clientRegistrationStartResult: ClientRegistrationStartResult;
    // let registrationStartResponse: RegistrationStartResponse;

    beforeEach(() => {
      masterPassword = "masterPassword";
      userKey = new SymmetricCryptoKey(new Uint8Array(64)) as UserKey;
      opaqueCipherConfig = new OpaqueCipherConfiguration({
        memory: 1024,
        iterations: 1,
        parallelism: 1,
      });

      //   clientRegistrationStartResult = mock<ClientRegistrationStartResult>();
      //   sdkBitwardenClient.crypto().opaque_register_start.mockReturnValue(clientRegistrationStartResult);

      //   registrationStartResponse = mock<RegistrationStartResponse>();
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

    // TODO: test registration process
    // it("registers a user with OPAQUE with the provided master password, user key, and cipher config", async () => {});
  });
});
