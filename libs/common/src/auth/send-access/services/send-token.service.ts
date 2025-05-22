import { GlobalStateProvider, KeyDefinition, SEND_ACCESS_DISK } from "../../../platform/state";
// import { SendAccessTokenRequest } from "../../models/request/identity-token/send-access-token.request";
import {
  SendAccessCredentials,
  SendTokenService as SendTokenServiceAbstraction,
} from "../abstractions/send-token.service";
import { SendAccessToken } from "../models/send-access-token";

import { SendTokenApiService } from "./send-token-api.service";

// Will need to map sendId to access token
// TODO: will need to build a better type for access token where it contains
// the expires in and the token itself.
export const SEND_ACCESS_TOKEN_DICT = KeyDefinition.record<SendAccessToken, string>(
  SEND_ACCESS_DISK,
  "accessTokenDict",
  {
    deserializer: (accessTokenDict) => accessTokenDict,
  },
);

export class SendTokenService implements SendTokenServiceAbstraction {
  constructor(
    private globalStateProvider: GlobalStateProvider,
    private sendTokenApiService: SendTokenApiService,
  ) {}

  async getSendAccessToken(
    sendId: string,
    sendCredentials: SendAccessCredentials | undefined,
  ): Promise<void> {
    // TODO: check in storage for the access token and if it is expired.
    // If it is expired, we will need to request a new token from the server.
    // If it is not expired, we will return the token from storage.
    // const request = new SendAccessTokenRequest(sendId, sendCredentials);
    // const result = await this.sendTokenApiService.requestSendAccessToken(request);
  }
}
