import { BaseResponse } from "../../../models/response/base.response";

export class KeyConnectorGetUserKeyResponse extends BaseResponse {
  key: string;

  constructor(response: any) {
    super(response);
    this.key = this.getResponseProperty("Key");
  }
}
