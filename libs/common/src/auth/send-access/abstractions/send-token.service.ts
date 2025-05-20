export interface SendPasswordCredentials {
  password: string;
}
export interface SendEmailOtpCredentials {
  email: string;
  otp: string;
}
export type SendAccessCredentials = SendPasswordCredentials | SendEmailOtpCredentials;

export abstract class SendTokenService {
  // TODO: talk with Tools about what expected behavior is for expired access tokens.
  // Do we implement any local TTL or do we just rely on the server to return a 401 and then we handle that in the api service?

  // SendAccessTokens need to be stored in session storage once retrieved.
  // All SendAccessTokens are scoped to a specific send id so all getting and setting should accept a send id.

  // TODO: should this abstraction have separate methods for requesting an access token from the server
  // and for getting the access token from storage?
  // One method that does both is ideal.
  // We will need to extend inputs to include the send id and the credentials.
  // We will also need to store the send access token with it's expires_in value so we know if it's expired
  // so that we don't hand out an expired token to make a request.

  // Returned error types should be discriminated union with a type that can be conditioned off for logic.

  // Attempts to get a send access token for a specific send id.
  // If the token is not found or is expired, it will request a new token from the server.
  // As send access tokens can be protected by different credentials, the credentials must be passed in for those sends.
  abstract getSendAccessToken: (
    sendId: string,
    sendCredentials?: SendAccessCredentials,
  ) => Promise<void>;

  // Private internal logic for getting the access token.
  // abstract setSendAccessToken: (sendId: string, token: string) => Promise<void>;
}
