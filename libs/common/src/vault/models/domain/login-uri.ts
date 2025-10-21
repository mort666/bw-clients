import { Jsonify } from "type-fest";

import { LoginUri as SdkLoginUri } from "@bitwarden/sdk-internal";

import { EncString } from "../../../key-management/crypto/models/enc-string";
import { UriMatchStrategySetting } from "../../../models/domain/domain-service";
import { Utils } from "../../../platform/misc/utils";
import Domain from "../../../platform/models/domain/domain-base";
import { SymmetricCryptoKey } from "../../../platform/models/domain/symmetric-crypto-key";
import { LoginUriData } from "../data/login-uri.data";
import { LoginUriView } from "../view/login-uri.view";

export class LoginUri extends Domain {
  uri?: EncString;
  uriChecksum?: EncString;
  match?: UriMatchStrategySetting;

  constructor(obj?: LoginUriData) {
    super();
    if (obj == null) {
      return;
    }

    this.uri = obj.uri != null ? new EncString(obj.uri) : undefined;
    this.uriChecksum = obj.uriChecksum != null ? new EncString(obj.uriChecksum) : undefined;
    this.match = obj.match ?? undefined;
  }

  decrypt(
    orgId: string | undefined,
    context: string = "No Cipher Context",
    encKey?: SymmetricCryptoKey,
  ): Promise<LoginUriView> {
    return this.decryptObj<LoginUri, LoginUriView>(
      this,
      new LoginUriView(this),
      ["uri"],
      orgId ?? null,
      encKey,
      context,
    );
  }

  async validateChecksum(
    clearTextUri: string,
    orgId: string | undefined,
    encKey?: SymmetricCryptoKey,
  ) {
    if (this.uriChecksum == null) {
      return false;
    }

    const keyService = Utils.getContainerService().getEncryptService();
    const localChecksum = await keyService.hash(clearTextUri, "sha256");

    const remoteChecksum = await this.uriChecksum.decrypt(orgId ?? null, encKey);
    return remoteChecksum === localChecksum;
  }

  toLoginUriData(): LoginUriData {
    const u = new LoginUriData();
    this.buildDataModel(
      this,
      u,
      {
        uri: null,
        uriChecksum: null,
        match: null,
      },
      ["match"],
    );
    return u;
  }

  static fromJSON(obj: Jsonify<LoginUri> | undefined): LoginUri | undefined {
    if (obj == null) {
      return undefined;
    }

    const loginUri = new LoginUri();
    loginUri.uri = obj.uri != null ? EncString.fromJSON(obj.uri) : undefined;
    loginUri.match = obj.match ?? undefined;
    loginUri.uriChecksum =
      obj.uriChecksum != null ? EncString.fromJSON(obj.uriChecksum) : undefined;

    return loginUri;
  }

  /**
   *  Maps LoginUri to SDK format.
   *
   * @returns {SdkLoginUri} The SDK login uri object.
   */
  toSdkLoginUri(): SdkLoginUri {
    return {
      uri: this.uri?.toSdk(),
      uriChecksum: this.uriChecksum?.toSdk(),
      match: this.match,
    };
  }

  static fromSdkLoginUri(obj: SdkLoginUri | undefined): LoginUri | undefined {
    if (obj == null) {
      return undefined;
    }

    const loginUri = new LoginUri();
    loginUri.uri = obj.uri != null ? EncString.fromJSON(obj.uri) : undefined;
    loginUri.uriChecksum =
      obj.uriChecksum != null ? EncString.fromJSON(obj.uriChecksum) : undefined;
    loginUri.match = obj.match;

    return loginUri;
  }
}
