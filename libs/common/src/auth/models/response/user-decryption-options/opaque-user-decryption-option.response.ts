import { BaseResponse } from "../../../../models/response/base.response";
import { EncString } from "../../../../platform/models/domain/enc-string";

export interface IOpaqueDecryptionOptionServerResponse {
  EncryptedPrivateKey: string;
  EncryptedUserKey: string;
}

export class OpaqueDecryptionOptionResponse extends BaseResponse {
  encryptedPrivateKey: EncString | undefined;
  encryptedUserKey: EncString | undefined;

  constructor(response: IOpaqueDecryptionOptionServerResponse) {
    super(response);
    if (response.EncryptedPrivateKey) {
      this.encryptedPrivateKey = new EncString(this.getResponseProperty("EncryptedPrivateKey"));
    }
    if (response.EncryptedUserKey) {
      this.encryptedUserKey = new EncString(this.getResponseProperty("EncryptedUserKey"));
    }
  }
}
