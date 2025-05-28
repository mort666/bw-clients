import { SendHashedPassword } from "../../../key-management/sends/send-password.service";
import { SendAccessToken } from "../models/send-access-token";
import { TryGetSendAccessTokenError } from "../services/send-token.service";

export type SendAccessCredentialsType = "password" | "email-otp";

export type SendPasswordCredentials = {
  type: "password";
  password: SendHashedPassword;
};
export type SendEmailOtpCredentials = {
  type: "email-otp";
  email: string;
  otp: string;
};
export type SendAccessCredentials = SendPasswordCredentials | SendEmailOtpCredentials;

// TODO: add JSdocs
export abstract class SendTokenService {
  // SendAccessTokens need to be stored in session storage once retrieved.
  // All SendAccessTokens are scoped to a specific send id so all getting and setting should accept a send id.

  // TODO: should this abstraction have separate methods for requesting an access token from the server
  // and for getting the access token from storage?
  // One method that does both is ideal.
  // We will need to extend inputs to include the send id and the credentials.
  // We will also need to store the send access token with it's expires_in value so we know if it's expired
  // so that we don't hand out an expired token to make a request.

  // Returned error types should be discriminated union with a type that can be conditioned off for logic.

  // TODO: define return types.
  // TODO: consider converting to observable.
  /**
   * Attempts to retrieve a SendAccessToken for the given sendId.
   * If the access token is found in session storage and is not expired, then it returns the token.
   * If the access token is expired, then it returns a SendTokenRetrievalError expired error.
   * If an access token is not found in storage, then it attempts to retrieve it from the server (will succeed for sends that don't require any credentials to view).
   * If the access token is successfully retrieved from the server, then it stores the token in session storage and returns it.
   * If an access token cannot be granted b/c the send requires credentials, then it returns a SendTokenRetrievalError indicating which credentials are required.
   * Any submissions of credentials will be handled by the getSendAccessTokenWithCredentials method.
   * @param sendId The ID of the send to retrieve the access token for.
   * @returns A promise that resolves to a SendAccessToken if found and valid, or a SendTokenRetrievalError if not.
   */
  abstract tryGetSendAccessToken: (
    sendId: string,
  ) => Promise<SendAccessToken | TryGetSendAccessTokenError>;

  abstract getSendAccessTokenWithCredentials: (
    sendId: string,
    sendAccessCredentials: SendAccessCredentials,
  ) => Promise<void>;

  /**
   * Hashes a password for send access.
   * @param password The raw password string to hash.
   * @param keyMaterialUrlB64 The base64 URL encoded key material string.
   * @returns A promise that resolves to the hashed password as a SendHashedPassword.
   */
  abstract hashPassword: (
    password: string,
    keyMaterialUrlB64: string,
  ) => Promise<SendHashedPassword>;
}
