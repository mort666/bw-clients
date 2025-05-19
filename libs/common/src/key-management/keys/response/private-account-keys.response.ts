import { AsymmetricEncryptionDataResponse } from "./asymmetric-encryption-keys.response";
import { UserSigningKeyData } from "./signing-keys.response";

export class PrivateAccountKeysResponseModel {
  readonly SigningKeys: UserSigningKeyData;
  readonly AsymmetricEncryptionKeys: AsymmetricEncryptionDataResponse;

  constructor(response: any) {
    this.SigningKeys = new UserSigningKeyData(response.signingKeys);
    this.AsymmetricEncryptionKeys = new AsymmetricEncryptionDataResponse(
      response.asymmetricEncryptionKeys,
    );
  }
}
