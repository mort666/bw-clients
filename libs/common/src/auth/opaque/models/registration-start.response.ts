import { BaseResponse } from "../../../models/response/base.response";
import { OpaqueSessionId } from "../../../types/guid";

export class RegistrationStartResponse extends BaseResponse {
  sessionId: OpaqueSessionId;
  serverRegistrationStartResult: string;

  constructor(response: any) {
    super(response);

    this.sessionId = this.getResponseProperty("SessionId");
    this.serverRegistrationStartResult = this.getResponseProperty("ServerRegistrationStartResult");
  }
}
