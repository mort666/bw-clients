import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { PhishingApiServiceAbstraction } from "@bitwarden/common/abstractions/phishing-api.service.abstraction";

export class PhishingApiService implements PhishingApiServiceAbstraction {
  constructor(private apiService: ApiService) {}

  async getKnownPhishingDomains(): Promise<string[]> {
    const response = await this.apiService.send("GET", "/phishing-domains", null, false, true);
    return response as string[];
  }
}
