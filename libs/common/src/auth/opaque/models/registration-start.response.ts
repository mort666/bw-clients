import { BaseResponse } from "../../../models/response/base.response";
import { OpaqueCredentialId } from "../../../types/guid";

export class RegistrationStartResponse extends BaseResponse {
  credentialId: OpaqueCredentialId;
  serverRegistrationStartResult: string;

  constructor(response: any) {
    super(response);

    this.credentialId = this.getResponseProperty("CredentialId");
    this.serverRegistrationStartResult = this.getResponseProperty("ServerRegistrationStartResult");
  }
}
