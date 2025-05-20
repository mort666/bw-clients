import { ClientType } from "../../../../enums";
import { GrantType, GrantTypes } from "../../../enums/grant-type.enum";
import { Scope, Scopes } from "../../../enums/scopes.enum";

export type SendAccessTokenPasswordPayload = { password: string };
export type SendAccessTokenEmailOtpPayload = { email: string; otp: string };
export type SendAccessTokenAnonymousPayload = object; // empty object

export interface SendAccessTokenPayloadBase {
  client_id: ClientType;
  grant_type: GrantType;
  scope: Scope;

  send_id: string;
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
