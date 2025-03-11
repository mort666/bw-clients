import { OpaqueCredentialId } from "../../types/guid";
import { RegistrationFinishRequest } from "./models/registration-finish.request";
import { RegistrationStartRequest } from "./models/registration-start.request";
import { RegistrationStartResponse } from "./models/registration-start.response";

export abstract class OpaqueApiService {
  abstract RegistrationStart(request: RegistrationStartRequest): Promise<RegistrationStartResponse>;
  abstract RegistrationFinish(
    credentialId: OpaqueCredentialId,
    request: RegistrationFinishRequest,
  ): Promise<void>;
  abstract LoginStart(): any;
  abstract LoginFinish(): any;
}
