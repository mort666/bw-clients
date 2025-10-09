import { mock } from "jest-mock-extended";
import { of, throwError } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { Account, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { OrganizationId, UserId } from "@bitwarden/common/types/guid";

import { createNewSummaryData } from "../../helpers";
import { ReportState } from "../../models";
import {
  mockApplicationData,
  mockEnrichedReportData,
  mockSummaryData,
} from "../../models/mocks/mock-data";

import { CriticalAppsService } from "./critical-apps.service";
import { RiskInsightsOrchestratorService } from "./risk-insights-orchestrator.service";
import { RiskInsightsReportService } from "./risk-insights-report.service";

describe("RiskInsightsOrchestratorService", () => {
  let service: RiskInsightsOrchestratorService;

  // Non changing mock data
  const mockOrgId = "org-789" as OrganizationId;
  const mockOrgName = "Test Org";
  const mockUserId = "user-101" as UserId;

  // Mock services
  const mockAccountService = mock<AccountService>({
    activeAccount$: of(mock<Account>({ id: mockUserId })),
  });
  const mockCriticalAppsService = mock<CriticalAppsService>({
    criticalAppsList$: of([]),
  });
  const mockOrganizationService = mock<OrganizationService>();
  const mockReportService = mock<RiskInsightsReportService>();

  beforeEach(() => {
    service = new RiskInsightsOrchestratorService(
      mockAccountService,
      mockCriticalAppsService,
      mockOrganizationService,
      mockReportService,
    );
  });

  describe("fetchReport", () => {
    it("should call reportService.getRiskInsightsReport$ with correct org and user IDs and emit ReportState", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];
      // Arrange
      const reportState: ReportState = {
        loading: false,
        error: null,
        data: {
          reportData: [],
          summaryData: createNewSummaryData(),
          applicationData: [],
          creationDate: new Date(),
        },
      };
      mockReportService.getRiskInsightsReport$.mockReturnValueOnce(of(reportState.data));
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
          expect(state.data).toEqual(reportState.data);
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
    it("should call reportService.generateApplicationsReport$ and saveRiskInsightsReport$ and emit ReportState", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];

      // Arrange
      mockReportService.generateApplicationsReport$.mockReturnValueOnce(of(mockEnrichedReportData));
      mockReportService.generateApplicationsSummary.mockReturnValueOnce(mockSummaryData);
      mockReportService.generateOrganizationApplications.mockReturnValueOnce(mockApplicationData);
      mockReportService.saveRiskInsightsReport$.mockReturnValueOnce(of(null));
      privateOrganizationDetailsSubject.next({
        organizationId: mockOrgId,
        organizationName: mockOrgName,
      });
      privateUserIdSubject.next(mockUserId);

      // Act
      service.generateReport();

      // Assert
      service.rawReportData$.subscribe((state) => {
        if (!state.loading) {
          expect(mockReportService.generateApplicationsReport$).toHaveBeenCalledWith(mockOrgId);
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

    it("should emit error ReportState when generateApplicationsReport$ throws", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];

      mockReportService.generateApplicationsReport$.mockReturnValueOnce(
        throwError(() => new Error("Generate error")),
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

    it("should emit error ReportState when saveRiskInsightsReport$ throws", (done) => {
      const privateOrganizationDetailsSubject = service["_organizationDetailsSubject"];
      const privateUserIdSubject = service["_userIdSubject"];

      mockReportService.generateApplicationsReport$.mockReturnValueOnce(of(mockEnrichedReportData));
      mockReportService.generateApplicationsSummary.mockReturnValueOnce(mockSummaryData);
      mockReportService.generateOrganizationApplications.mockReturnValueOnce(mockApplicationData);
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
    it("should complete destroy$ subject and unsubscribe reportStateSubscription", (done) => {
      const privateDestroy = service["_destroy$"];
      const privateReportStateSubscription = service["_reportStateSubscription"];
      const unsubscribeSpy = jest.spyOn(privateReportStateSubscription, "unsubscribe");

      service.destroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
      privateDestroy.subscribe({
        error: (err: unknown) => {
          done.fail("Should not error: " + err);
        },
        complete: () => {
          done();
        },
      });
    });
  });
});
