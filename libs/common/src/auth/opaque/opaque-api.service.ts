import { RegistrationFinishRequest } from "./models/registration-finish.request";
import { RegistrationFinishResponse } from "./models/registration-finish.response";
import { RegistrationStartRequest } from "./models/registration-start.request";
import { RegistrationStartResponse } from "./models/registration-start.response";

export abstract class OpaqueApiService {
  abstract registrationStart(request: RegistrationStartRequest): Promise<RegistrationStartResponse>;
  abstract registrationFinish(
    request: RegistrationFinishRequest,
  ): Promise<RegistrationFinishResponse>;
  abstract loginStart(): any;
  abstract loginFinish(): any;
}
