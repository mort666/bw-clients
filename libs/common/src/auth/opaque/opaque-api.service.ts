import { OpaqueSessionId as OpaqueSessionId } from "../../types/guid";

import { RegistrationFinishRequest } from "./models/registration-finish.request";
import { RegistrationFinishResponse } from "./models/registration-finish.response";
import { RegistrationStartRequest } from "./models/registration-start.request";
import { RegistrationStartResponse } from "./models/registration-start.response";

export abstract class OpaqueApiService {
  abstract RegistrationStart(request: RegistrationStartRequest): Promise<RegistrationStartResponse>;
  abstract RegistrationFinish(
    sessionId: OpaqueSessionId,
    request: RegistrationFinishRequest,
  ): Promise<RegistrationFinishResponse>;
  abstract LoginStart(): any;
  abstract LoginFinish(): any;
}
