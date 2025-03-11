import { KdfConfigService } from "../../../../key-management/src";
import { UserKey } from "../../types/key";

import { CipherConfiguration } from "./models/cipher-configuration";
import { RegistrationFinishRequest } from "./models/registration-finish.request";
import { RegistrationStartRequest } from "./models/registration-start.request";
import { OpaqueApiService } from "./opaque-api.service";
import { OpaqueService } from "./opaque.service";

export class DefaultOpaqueService implements OpaqueService {
  constructor(
    private opaqueApiService: OpaqueApiService,
    private kdfConfigService: KdfConfigService,
  ) {}

  async Register(masterPassword: string, userKey: UserKey) {
    const kdfConfig = await this.kdfConfigService.getKdfConfig(); // note: this doesn't take a UserId but probably should

    const registrationStart = ""; // SDK call: kdfConfig => ClientRegistrationStartResult
    const registrationStartResponse = await this.opaqueApiService.RegistrationStart(
      new RegistrationStartRequest(registrationStart, new CipherConfiguration(kdfConfig)),
    );

    const registrationFinish = ""; // SDK call: (serverRegistrationStart.serverRegistrationStartResult, userKey) => ClientRegistrationFinishResult
    await this.opaqueApiService.RegistrationFinish(
      registrationStartResponse.credentialId,
      new RegistrationFinishRequest(registrationFinish),
    );
  }

  async Login(masterPassword: string) {
    throw new Error("Not implemented");
    return await Promise.resolve(null as unknown as UserKey);
  }
}
