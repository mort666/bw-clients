import { BaseResponse } from "../../../models/response/base.response";

export class KeyConnectorGetUserKeyResponse extends BaseResponse {
  // Base64 encoded key. This is present only in the clear text version of the response.
  key: string;
  // AES-256-GCM encrypted key. This does not exist in EncString and so is not sent or parsed as one.
  // Expected format is data + tag + iv
  encryptedKey: Uint8Array;
  tunnelVersion: KeyConnectorGetUserKeyResponse;

  constructor(response: any) {
    super(response);
    this.key = this.getResponseProperty("Key");
    const responseEncryptedKey = this.getResponseProperty("EncryptedKey");
    if (responseEncryptedKey) {
      this.encryptedKey = new Uint8Array(responseEncryptedKey);
      this.tunnelVersion = this.getResponseProperty("TunnelVersion");
    }
  }
}
