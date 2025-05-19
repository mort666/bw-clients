export abstract class SendTokenService {
  // TODO: talk with Tools about what expected behavior is for expired access tokens.
  // Do we implement any local TTL or do we just rely on the server to return a 401 and then we handle that in the api service?

  // SendAccessTokens need to be stored in session storage once retrieved.
  // All SendAccessTokens are scoped to a specific send id so all getting and setting should accept a send id.

  // TODO: should this abstraction have separate methods for requesting an access token from the server
  // and for getting the access token from storage? Or should it just be one method that does both?

  // Get the access token for a specific send id.
  abstract getSendAccessToken: (sendId: string) => Promise<string | null>;
  abstract setSendAccessToken: (sendId: string, token: string) => Promise<void>;
}
