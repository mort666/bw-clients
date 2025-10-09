import {
  catchError,
  EMPTY,
  forkJoin,
  from,
  map,
  Observable,
  of,
  switchMap,
  throwError,
} from "rxjs";

import { OrganizationId, UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

import {
  createNewReportData,
  flattenMemberDetails,
  getTrimmedCipherUris,
  getUniqueMembers,
} from "../../helpers/risk-insights-data-mappers";
import {
  isSaveRiskInsightsReportResponse,
  SaveRiskInsightsReportResponse,
} from "../../models/api-models.types";
import {
  ApplicationHealthReportDetail,
  OrganizationReportSummary,
  AtRiskApplicationDetail,
  AtRiskMemberDetail,
  CipherHealthReport,
  MemberDetails,
  PasswordHealthData,
  OrganizationReportApplication,
  RiskInsightsData,
} from "../../models/report-models";
import { MemberCipherDetailsApiService } from "../api/member-cipher-details-api.service";
import { RiskInsightsApiService } from "../api/risk-insights-api.service";

import { PasswordHealthService } from "./password-health.service";
import { RiskInsightsEncryptionService } from "./risk-insights-encryption.service";

export class RiskInsightsReportService {
  // [FIXME] CipherData
  // Cipher data
  // private _ciphersSubject = new BehaviorSubject<CipherView[] | null>(null);
  // _ciphers$ = this._ciphersSubject.asObservable();

  constructor(
    private cipherService: CipherService,
    private memberCipherDetailsApiService: MemberCipherDetailsApiService,
    private passwordHealthService: PasswordHealthService,
    private riskInsightsApiService: RiskInsightsApiService,
    private riskInsightsEncryptionService: RiskInsightsEncryptionService,
  ) {}

  // [FIXME] CipherData
  // async loadCiphersForOrganization(organizationId: OrganizationId): Promise<void> {
  //   await this.cipherService.getAllFromApiForOrganization(organizationId).then((ciphers) => {
  //     this._ciphersSubject.next(ciphers);
  //   });
  // }

  /**
   * Report data for the aggregation of uris to like uris and getting password/member counts,
   * members, and at risk statuses.
   *
   * @param organizationId Id of the organization
   * @returns The all applications health report data
   */
  generateApplicationsReport$(
    organizationId: OrganizationId,
  ): Observable<ApplicationHealthReportDetail[]> {
    const allCiphers$ = from(this.cipherService.getAllFromApiForOrganization(organizationId));
    const memberCiphers$ = from(
      this.memberCipherDetailsApiService.getMemberCipherDetails(organizationId),
    ).pipe(map((memberCiphers) => flattenMemberDetails(memberCiphers)));

    return forkJoin([allCiphers$, memberCiphers$]).pipe(
      switchMap(([ciphers, memberCiphers]) => this._getCipherDetails(ciphers, memberCiphers)),
      map((cipherApplications) => {
        const groupedByApplication = this._groupCiphersByApplication(cipherApplications);

        return Array.from(groupedByApplication.entries()).map(([application, ciphers]) =>
          this._getApplicationHealthReport(application, ciphers),
        );
      }),
    );
  }

  /**
   * Generates a list of members with at-risk passwords along with the number of at-risk passwords.
   */
  generateAtRiskMemberList(
    cipherHealthReportDetails: ApplicationHealthReportDetail[],
  ): AtRiskMemberDetail[] {
    const memberRiskMap = new Map<string, number>();

    cipherHealthReportDetails.forEach((app) => {
      app.atRiskMemberDetails.forEach((member) => {
        const currentCount = memberRiskMap.get(member.email) ?? 0;
        memberRiskMap.set(member.email, currentCount + 1);
      });
    });

    return Array.from(memberRiskMap.entries()).map(([email, atRiskPasswordCount]) => ({
      email,
      atRiskPasswordCount,
    }));
  }

  generateAtRiskApplicationList(
    cipherHealthReportDetails: ApplicationHealthReportDetail[],
  ): AtRiskApplicationDetail[] {
    const applicationPasswordRiskMap = new Map<string, number>();

    cipherHealthReportDetails
      .filter((app) => app.atRiskPasswordCount > 0)
      .forEach((app) => {
        const atRiskPasswordCount = applicationPasswordRiskMap.get(app.applicationName) ?? 0;
        applicationPasswordRiskMap.set(
          app.applicationName,
          atRiskPasswordCount + app.atRiskPasswordCount,
        );
      });

    return Array.from(applicationPasswordRiskMap.entries()).map(
      ([applicationName, atRiskPasswordCount]) => ({
        applicationName,
        atRiskPasswordCount,
      }),
    );
  }

  /**
   * Gets the summary from the application health report. Returns total members and applications as well
   * as the total at risk members and at risk applications
   * @param reports The previously calculated application health report data
   * @returns A summary object containing report totals
   */
  generateApplicationsSummary(reports: ApplicationHealthReportDetail[]): OrganizationReportSummary {
    const totalMembers = reports.flatMap((x) => x.memberDetails);
    const uniqueMembers = getUniqueMembers(totalMembers);

    const atRiskMembers = reports.flatMap((x) => x.atRiskMemberDetails);
    const uniqueAtRiskMembers = getUniqueMembers(atRiskMembers);

    // TODO: Replace with actual new applications detection logic (PM-26185)
    const dummyNewApplications = [
      "github.com",
      "google.com",
      "stackoverflow.com",
      "gitlab.com",
      "bitbucket.org",
      "npmjs.com",
      "docker.com",
      "aws.amazon.com",
      "azure.microsoft.com",
      "jenkins.io",
      "terraform.io",
      "kubernetes.io",
      "atlassian.net",
    ];

    return {
      totalMemberCount: uniqueMembers.length,
      totalAtRiskMemberCount: uniqueAtRiskMembers.length,
      totalApplicationCount: reports.length,
      totalAtRiskApplicationCount: reports.filter((app) => app.atRiskPasswordCount > 0).length,
      totalCriticalMemberCount: 0,
      totalCriticalAtRiskMemberCount: 0,
      totalCriticalApplicationCount: 0,
      totalCriticalAtRiskApplicationCount: 0,
      newApplications: dummyNewApplications,
    };
  }

  /**
   * Generate a snapshot of applications and related data associated to this report
   *
   * @param reports
   * @returns A list of applications with a critical marking flag
   */
  generateOrganizationApplications(
    reports: ApplicationHealthReportDetail[],
  ): OrganizationReportApplication[] {
    return reports.map((report) => ({
      applicationName: report.applicationName,
      isCritical: false,
    }));
  }

  /**
   * Gets the risk insights report for a specific organization and user.
   *
   * @param organizationId
   * @param userId
   * @returns An observable that emits the decrypted risk insights report data.
   */
  getRiskInsightsReport$(
    organizationId: OrganizationId,
    userId: UserId,
  ): Observable<RiskInsightsData> {
    return this.riskInsightsApiService.getRiskInsightsReport$(organizationId).pipe(
      switchMap((response) => {
        if (!response) {
          // Return an empty report and summary if response is falsy
          return of<RiskInsightsData>(createNewReportData());
        }
        if (!response.contentEncryptionKey || response.contentEncryptionKey.data == "") {
          return throwError(() => new Error("Report key not found"));
        }
        if (!response.reportData) {
          return throwError(() => new Error("Report data not found"));
        }
        if (!response.summaryData) {
          return throwError(() => new Error("Summary data not found"));
        }
        if (!response.applicationData) {
          return throwError(() => new Error("Application data not found"));
        }

        return from(
          this.riskInsightsEncryptionService.decryptRiskInsightsReport(
            {
              organizationId,
              userId,
            },
            {
              encryptedReportData: response.reportData,
              encryptedSummaryData: response.summaryData,
              encryptedApplicationData: response.applicationData,
            },
            response.contentEncryptionKey,
          ),
        ).pipe(
          map((decryptedData) => ({
            reportData: decryptedData.reportData,
            summaryData: decryptedData.summaryData,
            applicationData: decryptedData.applicationData,
            creationDate: response.creationDate,
          })),
          catchError((error: unknown) => {
            // TODO Handle errors appropriately
            // console.error("An error occurred when decrypting report", error);
            return EMPTY;
          }),
        );
      }),
      catchError((error: unknown) => {
        // console.error("An error occurred when fetching the last report", error);
        return EMPTY;
      }),
    );
  }

  /**
   * Encrypts the risk insights report data for a specific organization.
   * @param organizationId The ID of the organization.
   * @param userId The ID of the user.
   * @param report The report data to encrypt.
   * @returns A promise that resolves to an object containing the encrypted data and encryption key.
   */
  saveRiskInsightsReport$(
    report: ApplicationHealthReportDetail[],
    summary: OrganizationReportSummary,
    applications: OrganizationReportApplication[],
    encryptionParameters: {
      organizationId: OrganizationId;
      userId: UserId;
    },
  ): Observable<SaveRiskInsightsReportResponse> {
    return from(
      this.riskInsightsEncryptionService.encryptRiskInsightsReport(
        {
          organizationId: encryptionParameters.organizationId,
          userId: encryptionParameters.userId,
        },
        {
          reportData: report,
          summaryData: summary,
          applicationData: applications,
        },
      ),
    ).pipe(
      map(
        ({
          encryptedReportData,
          encryptedSummaryData,
          encryptedApplicationData,
          contentEncryptionKey,
        }) => ({
          data: {
            organizationId: encryptionParameters.organizationId,
            creationDate: new Date().toISOString(),
            reportData: encryptedReportData.toSdk(),
            summaryData: encryptedSummaryData.toSdk(),
            applicationData: encryptedApplicationData.toSdk(),
            contentEncryptionKey: contentEncryptionKey.toSdk(),
          },
        }),
      ),
      switchMap((encryptedReport) =>
        this.riskInsightsApiService.saveRiskInsightsReport$(
          encryptedReport,
          encryptionParameters.organizationId,
        ),
      ),
      catchError((error: unknown) => {
        return EMPTY;
      }),
      map((response) => {
        if (!isSaveRiskInsightsReportResponse(response)) {
          throw new Error("Invalid response from API");
        }
        return response;
      }),
    );
  }

  private _buildPasswordUseMap(ciphers: CipherView[]): Map<string, number> {
    const passwordUseMap = new Map<string, number>();
    ciphers.forEach((cipher) => {
      const password = cipher.login.password!;
      passwordUseMap.set(password, (passwordUseMap.get(password) || 0) + 1);
    });
    return passwordUseMap;
  }

  private _groupCiphersByApplication(
    cipherHealthData: CipherHealthReport[],
  ): Map<string, CipherHealthReport[]> {
    const applicationMap = new Map<string, CipherHealthReport[]>();

    cipherHealthData.forEach((cipher: CipherHealthReport) => {
      // Warning: Currently does not show ciphers with NO Application
      // if (cipher.applications.length === 0) {
      //   const existingApplication = applicationMap.get("None") || [];
      //   existingApplication.push(cipher);
      //   applicationMap.set("None", existingApplication);
      // }

      cipher.applications.forEach((application) => {
        const existingApplication = applicationMap.get(application) || [];
        existingApplication.push(cipher);
        applicationMap.set(application, existingApplication);
      });
    });

    return applicationMap;
  }

  /**
   *
   * @param applications The list of application health report details to map ciphers to
   * @param organizationId
   * @returns
   */
  async getApplicationCipherMap(
    applications: ApplicationHealthReportDetail[],
    organizationId: OrganizationId,
  ): Promise<Map<string, CipherView[]>> {
    // [FIXME] CipherData
    // This call is made multiple times. We can optimize this
    // by loading the ciphers once via a load method to avoid multiple API calls
    // for the same organization
    const allCiphers = await this.cipherService.getAllFromApiForOrganization(organizationId);
    const cipherMap = new Map<string, CipherView[]>();

    applications.forEach((app) => {
      const filteredCiphers = allCiphers.filter((c) => app.cipherIds.includes(c.id));
      cipherMap.set(app.applicationName, filteredCiphers);
    });
    return cipherMap;
  }

  // --------------------------- Aggregation methods ---------------------------
  /**
   * Loop through the flattened cipher to uri data. If the item exists it's values need to be updated with the new item.
   * If the item is new, create and add the object with the flattened details
   * @param cipherHealthReport Cipher and password health info broken out into their uris
   * @returns Application health reports
   */
  private _getApplicationHealthReport(
    application: string,
    ciphers: CipherHealthReport[],
  ): ApplicationHealthReportDetail {
    let aggregatedReport: ApplicationHealthReportDetail | undefined;

    ciphers.forEach((cipher) => {
      const isAtRisk = this._isPasswordAtRisk(cipher.healthData);
      aggregatedReport = this._aggregateReport(application, cipher, isAtRisk, aggregatedReport);
    });

    return aggregatedReport!;
  }

  private _aggregateReport(
    application: string,
    newCipherReport: CipherHealthReport,
    isAtRisk: boolean,
    existingReport?: ApplicationHealthReportDetail,
  ): ApplicationHealthReportDetail {
    let baseReport = existingReport
      ? this._updateExistingReport(existingReport, newCipherReport)
      : this._createNewReport(application, newCipherReport);
    if (isAtRisk) {
      baseReport = { ...baseReport, ...this._getAtRiskData(baseReport, newCipherReport) };
    }

    baseReport.memberCount = baseReport.memberDetails.length;
    baseReport.atRiskMemberCount = baseReport.atRiskMemberDetails.length;

    return baseReport;
  }
  private _createNewReport(
    application: string,
    cipherReport: CipherHealthReport,
  ): ApplicationHealthReportDetail {
    return {
      applicationName: application,
      cipherIds: [cipherReport.cipher.id],
      passwordCount: 1,
      memberDetails: [...cipherReport.cipherMembers],
      memberCount: cipherReport.cipherMembers.length,
      atRiskCipherIds: [],
      atRiskMemberCount: 0,
      atRiskMemberDetails: [],
      atRiskPasswordCount: 0,
    };
  }

  private _updateExistingReport(
    existingReport: ApplicationHealthReportDetail,
    newCipherReport: CipherHealthReport,
  ): ApplicationHealthReportDetail {
    return {
      ...existingReport,
      passwordCount: existingReport.passwordCount + 1,
      memberDetails: getUniqueMembers(
        existingReport.memberDetails.concat(newCipherReport.cipherMembers),
      ),
      cipherIds: existingReport.cipherIds.concat(newCipherReport.cipher.id),
    };
  }

  private _getAtRiskData(report: ApplicationHealthReportDetail, cipherReport: CipherHealthReport) {
    const atRiskMemberDetails = getUniqueMembers(
      report.atRiskMemberDetails.concat(cipherReport.cipherMembers),
    );
    return {
      atRiskPasswordCount: report.atRiskPasswordCount + 1,
      atRiskCipherIds: report.atRiskCipherIds.concat(cipherReport.cipher.id),
      atRiskMemberDetails,
      atRiskMemberCount: atRiskMemberDetails.length,
    };
  }

  // TODO Move to health service
  private _isPasswordAtRisk(healthData: PasswordHealthData): boolean {
    return !!(
      healthData.exposedPasswordDetail ||
      healthData.weakPasswordDetail ||
      healthData.reusedPasswordCount > 1
    );
  }
  /**
   * Associates the members with the ciphers they have access to. Calculates the password health.
   * Finds the trimmed uris.
   * @param ciphers Org ciphers
   * @param memberDetails Org members
   * @returns Cipher password health data with trimmed uris and associated members
   */
  private _getCipherDetails(
    ciphers: CipherView[],
    memberDetails: MemberDetails[],
  ): Observable<CipherHealthReport[]> {
    const validCiphers = ciphers.filter((cipher) =>
      this.passwordHealthService.isValidCipher(cipher),
    );
    // Build password use map
    const passwordUseMap = this._buildPasswordUseMap(validCiphers);

    return this.passwordHealthService.auditPasswordLeaks$(validCiphers).pipe(
      map((exposedDetails) => {
        return validCiphers.map((cipher) => {
          const exposedPassword = exposedDetails.find((x) => x?.cipherId === cipher.id);
          const cipherMembers = memberDetails.filter((x) => x.cipherId === cipher.id);

          const result = {
            cipher: cipher,
            cipherMembers,
            healthData: {
              weakPasswordDetail: this.passwordHealthService.findWeakPasswordDetails(cipher),
              exposedPasswordDetail: exposedPassword,
              reusedPasswordCount: passwordUseMap.get(cipher.login.password!) ?? 0,
            },
            applications: getTrimmedCipherUris(cipher),
          } as CipherHealthReport;
          return result;
        });
      }),
    );
  }
}
