import { firstValueFrom } from "rxjs";

import { RotateableKeySet } from "@bitwarden/auth/common";
import { SdkService } from "@bitwarden/common/platform/abstractions/sdk/sdk.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { OpaqueSessionId, UserId } from "@bitwarden/common/types/guid";

import { HttpStatusCode } from "../../enums/http-status-code.enum";
import { EncryptService } from "../../key-management/crypto/abstractions/encrypt.service";
import { ErrorResponse } from "../../models/response/error.response";
import { LogService } from "../../platform/abstractions/log.service";
import { SymmetricCryptoKey } from "../../platform/models/domain/symmetric-crypto-key";
import { OpaqueExportKey, UserKey } from "../../types/key";

import { LoginFinishRequest } from "./models/login-finish.request";
import { LoginStartRequest } from "./models/login-start.request";
import { OpaqueCipherConfiguration } from "./models/opaque-cipher-configuration";
import { RegistrationFinishRequest } from "./models/registration-finish.request";
import { RegistrationStartRequest } from "./models/registration-start.request";
import { SetRegistrationActiveRequest } from "./models/set-registration-active.request";
import { OpaqueKeyExchangeApiService } from "./opaque-key-exchange-api.service";
import { OpaqueKeyExchangeService } from "./opaque-key-exchange.service";

interface OpaqueError {
  Protocol: string;
}

export class DefaultOpaqueKeyExchangeService implements OpaqueKeyExchangeService {
  constructor(
    private opaqueKeyExchangeApiService: OpaqueKeyExchangeApiService,
    private sdkService: SdkService,
    private encryptService: EncryptService,
    private logService: LogService,
  ) {}

  async register(
    masterPassword: string,
    userKey: UserKey,
    cipherConfig: OpaqueCipherConfiguration,
  ): Promise<OpaqueSessionId> {
    if (!masterPassword || !userKey || !cipherConfig) {
      throw new Error(
        `Unable to register user with missing parameters. masterPassword exists: ${!!masterPassword}, userKey exists: ${!!userKey}, cipherConfig exists: ${!!cipherConfig}`,
      );
    }

    const cryptoClient = (await firstValueFrom(this.sdkService.client$)).crypto();

    const registrationStart = cryptoClient.opaque_register_start(
      masterPassword,
      cipherConfig.toSdkConfig(),
    );
    const registrationStartResponse = await this.opaqueKeyExchangeApiService.registrationStart(
      new RegistrationStartRequest(
        Utils.fromBufferToB64(registrationStart.registration_request),
        cipherConfig,
      ),
    );

    const registrationFinish = cryptoClient.opaque_register_finish(
      masterPassword,
      cipherConfig.toSdkConfig(),
      Utils.fromB64ToArray(registrationStartResponse.registrationResponse),
      registrationStart.state,
    );

    const sdkKeyset = cryptoClient.create_rotateablekeyset_from_exportkey(
      registrationFinish.export_key,
      userKey.key,
    );
    const keyset = new RotateableKeySet(
      new EncString(sdkKeyset.encapsulated_key),
      new EncString(sdkKeyset.public_key),
      new EncString(sdkKeyset.private_key),
    );

    await this.opaqueKeyExchangeApiService.registrationFinish(
      new RegistrationFinishRequest(
        registrationStartResponse.sessionId,
        Utils.fromBufferToB64(registrationFinish.registration_upload),
        keyset,
      ),
    );

    return registrationStartResponse.sessionId;
  }

  async setRegistrationActive(sessionId: OpaqueSessionId): Promise<void> {
    await this.opaqueKeyExchangeApiService.setRegistrationActive(
      new SetRegistrationActiveRequest(sessionId),
    );
  }

  async login(
    email: string,
    masterPassword: string,
    cipherConfig: OpaqueCipherConfiguration,
  ): Promise<{ sessionId: string; opaqueExportKey: OpaqueExportKey }> {
    if (!email || !masterPassword || !cipherConfig) {
      throw new Error(
        `Unable to log in user with missing parameters. email exists: ${!!email}; masterPassword exists: ${!!masterPassword}; cipherConfig exists: ${!!cipherConfig}`,
      );
    }

    const cryptoClient = (await firstValueFrom(this.sdkService.client$)).crypto();

    const loginStart = cryptoClient.opaque_login_start(masterPassword, cipherConfig.toSdkConfig());
    const loginStartResponse = await this.opaqueKeyExchangeApiService.loginStart(
      new LoginStartRequest(email, Utils.fromBufferToB64(loginStart.credential_request)),
    );

    try {
      const loginFinish = cryptoClient.opaque_login_finish(
        masterPassword,
        cipherConfig.toSdkConfig(),
        Utils.fromB64ToArray(loginStartResponse.credentialResponse),
        loginStart.state,
      );

      const success = await this.opaqueKeyExchangeApiService.loginFinish(
        new LoginFinishRequest(
          loginStartResponse.sessionId,
          Utils.fromBufferToB64(loginFinish.credential_finalization),
        ),
      );
      if (!success) {
        throw new Error("Login failed");
      }

      const exportKey = new SymmetricCryptoKey(loginFinish.export_key) as OpaqueExportKey;

      return { sessionId: loginStartResponse.sessionId, opaqueExportKey: exportKey };
    } catch (e) {
      // TODO: this feels so bad, but as we now determine the credentials are invalid client side, we have to improve our
      // login component error handling so it can handle server or client side errors.
      if (
        typeof e === "object" &&
        (e as OpaqueError)?.Protocol == "Error in validating credentials"
      ) {
        // Convert to ErrorResponse so any error thrown here works just like our existing login component handling
        const errorResponse = new ErrorResponse(
          {
            message: "username or password is incorrect",
          },
          HttpStatusCode.BadRequest,
        );
        throw errorResponse;
      }

      throw e;
    }
  }

  async decryptUserKeyWithExportKey(
    userId: UserId,
    exportKeyEncryptedOpaquePrivateKey: EncString,
    opaquePublicKeyEncryptedUserKey: EncString,
    exportKey: OpaqueExportKey,
  ): Promise<UserKey | null> {
    if (!userId) {
      throw new Error("UserId is required. Cannot decrypt user key with export key.");
    }

    if (!exportKeyEncryptedOpaquePrivateKey) {
      throw new Error(
        "Encrypted OPAQUE private key is required. Cannot decrypt user key with export key.",
      );
    }

    if (!opaquePublicKeyEncryptedUserKey) {
      throw new Error("Encrypted user key is required. Cannot decrypt user key with export key.");
    }

    if (!exportKey) {
      // User doesn't have an export key, so we can't decrypt the user key.
      return null;
    }

    try {
      // attempt to decrypt exportKeyEncryptedOpaquePrivateKey with exportKey
      const opaquePrivateKey = await this.encryptService.decryptToBytes(
        exportKeyEncryptedOpaquePrivateKey,
        exportKey,
      );

      if (!opaquePrivateKey) {
        throw new Error("Failed to decrypt opaque private key with export key.");
      }

      // Attempt to decrypt opaquePublicKeyEncryptedUserKey with opaquePrivateKey
      const userKey = await this.encryptService.rsaDecrypt(
        opaquePublicKeyEncryptedUserKey,
        opaquePrivateKey,
      );

      return new SymmetricCryptoKey(userKey) as UserKey;
    } catch (e) {
      this.logService.error("Failed to decrypt using export key. Error: ", e);

      return null;
    }
  }
}
