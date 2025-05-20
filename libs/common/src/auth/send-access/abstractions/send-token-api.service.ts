import { SendAccessTokenRequest } from "../../models/request/identity-token/send-access-token.request";

/**
 * Abstract class for the SendTokenApiService.
 * Communicates with Identity to obtain send access tokens.
 */
export abstract class SendTokenApiService {
  // TODO: add return type for requestSendAccessToken and error scenarios
  // Returns a valid send access token or several error types (use discriminated union):
  // RequiresPassword
  // RequiresEmailOtp
  // InvalidCredentials
  // ExpiredRequiredPassword  // these will live at higher level in SendTokenService
  // ExpiredRequiredEmailOtp

  abstract requestSendAccessToken: (request: SendAccessTokenRequest) => Promise<unknown>;
}
