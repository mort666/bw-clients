import { SendAccessTokenRequest } from "../../models/request/identity-token/send-access-token.request";

/**
 * Abstract class for the SendTokenApiService.
 * Communicates with Identity to obtain send access tokens.
 */
export abstract class SendTokenApiService {
  // TODO: add return type for requestSendAccessToken and error scenarios
  abstract requestSendAccessToken: (request: SendAccessTokenRequest) => Promise<unknown>;
}
