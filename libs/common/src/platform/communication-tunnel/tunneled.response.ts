import { BaseResponse } from "../../models/response/base.response";

declare const marker: unique symbol;

export class TunneledResponse<TResponse> extends BaseResponse {
  [marker]: TResponse;
  readonly encryptedResponse: string;

  constructor(response: any) {
    super(response);
    this.encryptedResponse = this.getResponseProperty("EncryptedResponse");
  }
}
