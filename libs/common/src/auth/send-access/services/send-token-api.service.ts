import { SendAccessTokenRequest } from "../../models/request/identity-token/send-access-token.request";

export abstract class SendTokenApiService {
  abstract requestSendAccessToken: (request: SendAccessTokenRequest) => Promise<unknown>;
}
