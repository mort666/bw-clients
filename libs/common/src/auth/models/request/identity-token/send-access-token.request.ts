import { ClientType } from "../../../../enums";
import { GrantType, GrantTypes } from "../../../enums/grant-type.enum";
import { Scope, Scopes } from "../../../enums/scopes.enum";

import { DeviceRequest } from "./device.request";

export type SendAccessTokenPasswordPayload = { password: string };
export type SendAccessTokenEmailOtpPayload = { email: string; otp: string };
// If truly anonymous, you get no extra fields:
export type SendAccessTokenAnonymousPayload = object; // empty object

export interface SendAccessTokenPayloadBase {
  client_id: ClientType;
  grant_type: GrantType;
  scope: Scope;

  send_id: string;

  // TODO: ask if we need device information on server + device claims added in server validator
  // device info
  //   device_type: this.device.type,
  //   device_identifier: this.device.identifier,
  //   device_name: this.device.name,
}

// Payload is the base + only 1 set of 3 credentials.
export type SendAccessTokenPayload = SendAccessTokenPayloadBase &
  (
    | SendAccessTokenPasswordPayload
    | SendAccessTokenEmailOtpPayload
    | SendAccessTokenAnonymousPayload
  );

export class SendAccessTokenRequest {
  constructor(
    public clientId: ClientType,
    public sendId: string,
    public device: DeviceRequest,

    public password?: string,

    public email?: string,
    public otp?: string,
  ) {}

  /**
   * Builds the payload to send to /connect/token
   */
  toIdentityTokenPayload(): SendAccessTokenPayload {
    const base: SendAccessTokenPayloadBase = {
      client_id: this.clientId,
      grant_type: GrantTypes.SendAccess,
      scope: Scopes.Send,

      send_id: this.sendId,
    };

    if (this.password) {
      return { ...base, password: this.password };
    } else if (this.email && this.otp) {
      return { ...base, email: this.email, otp: this.otp };
    } else {
      return base;
    }
  }
}
