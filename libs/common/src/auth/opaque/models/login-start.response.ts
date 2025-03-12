import { BaseResponse } from "../../../models/response/base.response";

export class LoginStartResponse extends BaseResponse {
  loginSessionId: string;
  serverLoginStartResult: string;

  constructor(response: any) {
    super(response);
    this.loginSessionId = this.getResponseProperty("LoginSessionId");
    this.serverLoginStartResult = this.getResponseProperty("ServerRegistrationStartResult");
  }
}
