import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { shareReplay } from "rxjs/operators";

import { ApplicationHealthReportDetail } from "../models/password-health";

import { RiskInsightsReportService } from "./risk-insights-report.service";

/**
 * Singleton service to manage the report details for the Risk Insights reports.
 */
@Injectable({
  providedIn: "root",
})
export class RiskInsightsDataService {
  // Map to store observables per organizationId
  private applicationsReportMap = new Map<string, Observable<ApplicationHealthReportDetail[]>>();

  constructor(private reportService: RiskInsightsReportService) {}

  /**
   * Returns an observable for the applications report of a given organizationId.
   * Utilizes shareReplay to ensure that the data is fetched only once
   * and shared among multiple subscribers.
   * @param organizationId The ID of the organization.
   * @returns Observable of ApplicationHealthReportDetail[].
   */
  getApplicationsReport$(organizationId: string): Observable<ApplicationHealthReportDetail[]> {
    // If the observable for this organizationId already exists, return it
    if (this.applicationsReportMap.has(organizationId)) {
      return this.applicationsReportMap.get(organizationId)!;
    }

    const applicationsReport$ = this.reportService
      .generateApplicationsReport$(organizationId)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));

    // Store the observable in the map for future subscribers
    this.applicationsReportMap.set(organizationId, applicationsReport$);

    return applicationsReport$;
  }

  /**
   * Clears the cached observable for a specific organizationId.
   * @param organizationId The ID of the organization.
   */
  clearApplicationsReportCache(organizationId: string): void {
    if (this.applicationsReportMap.has(organizationId)) {
      this.applicationsReportMap.delete(organizationId);
    }
  }
}
