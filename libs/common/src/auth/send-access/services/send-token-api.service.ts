import { firstValueFrom } from "rxjs";

import { ApiService } from "../../../abstractions/api.service";
import { EnvironmentService } from "../../../platform/abstractions/environment.service";
import { SendAccessTokenRequest } from "../../models/request/identity-token/send-access-token.request";
import { SendTokenApiService as SendTokenApiServiceAbstraction } from "../abstractions/send-token-api.service";

export class SendTokenApiService implements SendTokenApiServiceAbstraction {
  constructor(
    private environmentService: EnvironmentService,
    private apiService: ApiService,
  ) {}

  // TODO: talk with Justin about needing to use httpOperations or not.
  async requestSendAccessToken(request: SendAccessTokenRequest): Promise<void> {
    const payload = request.toIdentityTokenPayload();

    const headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Accept: "application/json",
    });

    const credentials = await this.apiService.getCredentials();

    const env = await firstValueFrom(this.environmentService.environment$);

    const req = new Request(env.getIdentityUrl() + "/connect/token", {
      method: "POST",
      body: new URLSearchParams(payload as any),
      headers: headers,
      credentials: credentials,
      cache: "no-store",
    });

    await this.apiService.fetch(req);

    // TODO: add processing.
  }
}
