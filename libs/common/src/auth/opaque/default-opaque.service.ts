import { firstValueFrom } from "rxjs";

import { RotateableKeySet } from "@bitwarden/auth/common";
import { SdkService } from "@bitwarden/common/platform/abstractions/sdk/sdk.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { Argon2KdfConfig } from "@bitwarden/key-management";
import { Argon2Id, KeGroup, KeyExchange, OprfCS } from "@bitwarden/sdk-internal";

import { UserKey } from "../../types/key";

import { CipherConfiguration } from "./models/cipher-configuration";
import { RegistrationFinishRequest } from "./models/registration-finish.request";
import { RegistrationStartRequest } from "./models/registration-start.request";
import { OpaqueApiService } from "./opaque-api.service";
import { OpaqueService } from "./opaque.service";

// static argon2 config for now
const cipherConfiguration = {
  oprf: "ristretto255" as OprfCS,
  ke_group: "ristretto255" as KeGroup,
  key_exchange: "triple-dh" as KeyExchange,
  ksf: {
    t_cost: 3,
    m_cost: 256 * 1024,
    p_cost: 4,
  } as Argon2Id,
};
const kdfConfig = new Argon2KdfConfig(3, 256, 4);

export class DefaultOpaqueService implements OpaqueService {
  constructor(
    private opaqueApiService: OpaqueApiService,
    private sdkService: SdkService,
  ) {}

  async Register(masterPassword: string, userKey: UserKey) {
    const cryptoClient = (await firstValueFrom(this.sdkService.client$)).crypto();

    const registrationStart = cryptoClient.opaque_register_start(
      Utils.fromUtf8ToArray(masterPassword),
    );
    const registrationStartResponse = await this.opaqueApiService.RegistrationStart(
      new RegistrationStartRequest(
        Utils.fromBufferToB64(new Uint8Array(registrationStart.registration_start_message)),
        new CipherConfiguration(kdfConfig),
      ),
    );

    const registrationFinish = cryptoClient.opaque_register_finish(
      new Uint8Array(registrationStart.registration_start_state),
      Utils.fromB64ToArray(registrationStartResponse.serverRegistrationStartResult),
      Utils.fromUtf8ToArray(masterPassword),
      cipherConfiguration,
      userKey.key,
    );
    const keyset = new RotateableKeySet(
      new EncString(registrationFinish.keyset.encapsulated_key),
      new EncString(registrationFinish.keyset.public_key),
      new EncString(registrationFinish.keyset.private_key),
    );

    await this.opaqueApiService.RegistrationFinish(
      registrationStartResponse.sessionId,
      new RegistrationFinishRequest(
        Utils.fromBufferToB64(new Uint8Array(registrationFinish.registration_finish_message)),
        keyset,
      ),
    );
  }

  async Login(masterPassword: string): Promise<UserKey> {
    throw new Error("Method not implemented.");
  }
}
