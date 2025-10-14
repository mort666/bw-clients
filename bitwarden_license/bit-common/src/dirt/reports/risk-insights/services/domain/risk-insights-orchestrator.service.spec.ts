import { mock } from "jest-mock-extended";
import { of, throwError } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { Account, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { OrganizationId, OrganizationReportId, UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { LogService } from "@bitwarden/logging";

import { createNewSummaryData } from "../../helpers";
import { RiskInsightsData, SaveRiskInsightsReportResponse } from "../../models";
import {
  mockApplicationData,
  mockEnrichedReportData,
  mockSummaryData,
} from "../../models/mocks/mock-data";
import { MemberCipherDetailsApiService } from "../api/member-cipher-details-api.service";
import { RiskInsightsApiService } from "../api/risk-insights-api.service";

import { CriticalAppsService } from "./critical-apps.service";
import { PasswordHealthService } from "./password-health.service";
import { RiskInsightsEncryptionService } from "./risk-insights-encryption.service";
import { RiskInsightsOrchestratorService } from "./risk-insights-orchestrator.service";
import { RiskInsightsReportService } from "./risk-insights-report.service";

describe("RiskInsightsOrchestratorService", () => {
  let service: RiskInsightsOrchestratorService;

  // Non changing mock data
  const mockOrgId = "org-789" as OrganizationId;
  const mockOrgName = "Test Org";
  const mockUserId = "user-101" as UserId;
  const mockReportId = "report-1" as OrganizationReportId;

  // Mock services
  const mockAccountService = mock<AccountService>({
    activeAccount$: of(mock<Account>({ id: mockUserId })),
  });
  const mockCriticalAppsService = mock<CriticalAppsService>({
    criticalAppsList$: of([]),
  });
  const mockOrganizationService = mock<OrganizationService>();
  const mockCipherService = mock<CipherService>();
  const mockMemberCipherDetailsApiService = mock<MemberCipherDetailsApiService>();
  const mockPasswordHealthService = mock<PasswordHealthService>();
  const mockReportApiService = mock<RiskInsightsApiService>();
  const mockReportService = mock<RiskInsightsReportService>();
  const mockRiskInsightsEncryptionService = mock<RiskInsightsEncryptionService>();
  const mockLogService = mock<LogService>();

  beforeEach(() => {
    service = new RiskInsightsOrchestratorService(
      mockAccountService,
      mockCipherService,
      mockCriticalAppsService,
      mockMemberCipherDetailsApiService,
      mockOrganizationService,
      mockPasswordHealthService,
      mockReportApiService,
      mockReportService,
      mockRiskInsightsEncryptionService,
      mockLogService,
    );
  });

  describe("fetchReport", () => {
    it("should call reportService.getRiskInsightsReport$ with correct org and user IDs and emit ReportState", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];
      // Arrange
      const reportState: RiskInsightsData = {
        id: mockReportId,
        reportData: [],
        summaryData: createNewSummaryData(),
        applicationData: [],
        creationDate: new Date(),
      };
      mockReportService.getRiskInsightsReport$.mockReturnValueOnce(of(reportState));
      // Set up organization and user context
      privateOrganizationDetailsSubject.next({
        organizationId: mockOrgId,
        organizationName: mockOrgName,
      });
      privateUserIdSubject.next(mockUserId);

      // Act
      service.fetchReport();

      // Assert
      service.rawReportData$.subscribe((state) => {
        if (!state.loading) {
          expect(mockReportService.getRiskInsightsReport$).toHaveBeenCalledWith(
            mockOrgId,
            mockUserId,
          );
          expect(state.data).toEqual(reportState);
          done();
        }
      });
    });

    it("should emit error ReportState when getRiskInsightsReport$ throws", (done) => {
      const { _organizationDetailsSubject, _userIdSubject } = service as any;
      mockReportService.getRiskInsightsReport$.mockReturnValueOnce(
        // Simulate error
        throwError(() => new Error("API error")),
      );
      _organizationDetailsSubject.next({
        organizationId: mockOrgId,
        organizationName: mockOrgName,
      });
      _userIdSubject.next(mockUserId);
      service.fetchReport();
      service.rawReportData$.subscribe((state) => {
        if (!state.loading) {
          expect(state.error).toBe("Failed to fetch report");
          expect(state.data).toBeNull();
          done();
        }
      });
    });
  });

  describe("generateReport", () => {
    it("should call reportService.generateApplicationsReport and saveRiskInsightsReport$ and emit ReportState", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];

      // Arrange
      mockReportService.generateApplicationsReport.mockReturnValueOnce(mockEnrichedReportData);
      mockReportService.getApplicationsSummary.mockReturnValueOnce(mockSummaryData);
      mockReportService.getOrganizationApplications.mockReturnValueOnce(mockApplicationData);
      mockReportService.saveRiskInsightsReport$.mockReturnValueOnce(
        of({ id: mockReportId } as SaveRiskInsightsReportResponse),
      );
      privateOrganizationDetailsSubject.next({
        organizationId: mockOrgId,
        organizationName: mockOrgName,
      });
      privateUserIdSubject.next(mockUserId);

      // Act
      service.generateReport();

      // Assert
      service.rawReportData$.subscribe((state) => {
        if (!state.loading && state.data) {
          expect(mockReportService.generateApplicationsReport).toHaveBeenCalledWith(mockOrgId);
          expect(mockReportService.saveRiskInsightsReport$).toHaveBeenCalledWith(
            mockEnrichedReportData,
            mockSummaryData,
            mockApplicationData,
            { organizationId: mockOrgId, userId: mockUserId },
          );
          expect(state.data.reportData).toEqual(mockEnrichedReportData);
          expect(state.data.summaryData).toEqual(mockSummaryData);
          expect(state.data.applicationData).toEqual(mockApplicationData);
          done();
        }
      });
    });

    it("should emit error ReportState when saveRiskInsightsReport$ throws", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];

      mockReportService.generateApplicationsReport.mockReturnValueOnce(mockEnrichedReportData);
      mockReportService.getApplicationsSummary.mockReturnValueOnce(mockSummaryData);
      mockReportService.getOrganizationApplications.mockReturnValueOnce(mockApplicationData);
      mockReportService.saveRiskInsightsReport$.mockReturnValueOnce(
        throwError(() => new Error("Save error")),
      );
      privateOrganizationDetailsSubject.next({
        organizationId: mockOrgId,
        organizationName: mockOrgName,
      });
      privateUserIdSubject.next(mockUserId);
      service.generateReport();
      service.rawReportData$.subscribe((state) => {
        if (!state.loading) {
          expect(state.error).toBe("Failed to generate or save report");
          expect(state.data).toBeNull();
          done();
        }
      });
    });
  });

  describe("destroy", () => {
    it("should complete destroy$ subject and unsubscribe reportStateSubscription", () => {
      const privateDestroy = (service as any)._destroy$;
      const privateReportStateSubscription = (service as any)._reportStateSubscription;

      // Spy on the methods you expect to be called.
      const destroyCompleteSpy = jest.spyOn(privateDestroy, "complete");
      const unsubscribeSpy = jest.spyOn(privateReportStateSubscription, "unsubscribe");

      // Execute the destroy method.
      service.destroy();

      // Assert that the methods were called as expected.
      expect(destroyCompleteSpy).toHaveBeenCalled();
      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
