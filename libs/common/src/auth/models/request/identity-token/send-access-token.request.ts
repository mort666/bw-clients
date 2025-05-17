import { ClientType } from "../../../../enums";
import { GrantTypes } from "../../../enums/grant-type.enum";
import { Scopes } from "../../../enums/scopes.enum";

import { DeviceRequest } from "./device.request";
import { TokenRequest } from "./token.request";

export class SendAccessTokenRequest extends TokenRequest {
  constructor(
    public sendId: string,
    public device: DeviceRequest,

    public password?: string,

    public email?: string,
    public oneTimePassword?: string,
  ) {
    super(undefined, device);
  }

  toIdentityToken(clientId: ClientType) {
    // Super call handles setting up client id and device properties
    const obj = super.toIdentityToken(clientId);

    obj.grant_type = GrantTypes.SendAccess;

    // override base scopes
    obj.scope = [Scopes.Send].join(" ");

    // Add required and optional properties
    obj.sendId = this.sendId;

    if (this.password) {
      obj.password = this.password;
    }
    if (this.email && this.oneTimePassword) {
      obj.email = this.email;
      obj.oneTimePassword = this.oneTimePassword;
    }

    return obj;
  }
}
