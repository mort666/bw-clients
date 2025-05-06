import { from, Observable } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationId } from "@bitwarden/common/types/guid";

import {
  SaveRiskInsightsReportRequest,
  SaveRiskInsightsReportResponse,
} from "../models/password-health";

export class RiskInsightsApiService {
  constructor(private apiService: ApiService) {}

  saveRiskInsightsReport(
    orgId: OrganizationId,
    request: SaveRiskInsightsReportRequest,
  ): Observable<SaveRiskInsightsReportResponse> {
    const dbResponse = this.apiService.send(
      "PUT",
      `/reports/risk-insights-report/${orgId.toString()}`,
      request.data,
      true,
      true,
    );

    return from(dbResponse as Promise<SaveRiskInsightsReportResponse>);
  }
}
