import { IdentityDeviceVerificationResponse } from "./identity-device-verification.response";
import { IdentityTokenResponse } from "./identity-token.response";
import { IdentityTwoFactorResponse } from "./identity-two-factor.response";
import { PasswordTokenRequest } from "./password-token.request";
import { SsoTokenRequest } from "./sso-token.request";
import { UserApiTokenRequest } from "./user-api-token.request";
import { WebAuthnLoginTokenRequest } from "./webauthn-login-token.request";

export abstract class TokenApiService {
  abstract postIdentityToken(
    request:
      | UserApiTokenRequest
      | PasswordTokenRequest
      | SsoTokenRequest
      | WebAuthnLoginTokenRequest,
  ): Promise<
    IdentityTokenResponse | IdentityTwoFactorResponse | IdentityDeviceVerificationResponse
  >;
  abstract refreshIdentityToken(): Promise<any>;
  abstract getActiveBearerToken(): Promise<string>;
}
