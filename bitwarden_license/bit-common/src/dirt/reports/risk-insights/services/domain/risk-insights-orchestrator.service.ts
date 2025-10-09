import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  from,
  merge,
  Observable,
  of,
  Subject,
  Subscription,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  scan,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import {
  getOrganizationById,
  OrganizationService,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { OrganizationId, OrganizationReportId, UserId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { LogService } from "@bitwarden/logging";

import { buildPasswordUseMap, flattenMemberDetails, getTrimmedCipherUris } from "../../helpers";
import { ApplicationHealthReportDetailEnriched } from "../../models";
import { RiskInsightsEnrichedData } from "../../models/report-data-service.types";
import {
  CipherHealthReport,
  MemberDetails,
  OrganizationReportApplication,
  ReportState,
} from "../../models/report-models";
import { MemberCipherDetailsApiService } from "../api/member-cipher-details-api.service";
import { RiskInsightsApiService } from "../api/risk-insights-api.service";

import { CriticalAppsService } from "./critical-apps.service";
import { PasswordHealthService } from "./password-health.service";
import { RiskInsightsEncryptionService } from "./risk-insights-encryption.service";
import { RiskInsightsReportService } from "./risk-insights-report.service";

export class RiskInsightsOrchestratorService {
  private _destroy$ = new Subject<void>();

  // -------------------------- Context state --------------------------
  // Current user viewing risk insights
  private _userIdSubject = new BehaviorSubject<UserId | null>(null);
  private _userId$ = this._userIdSubject.asObservable();

  // Organization the user is currently viewing
  private _organizationDetailsSubject = new BehaviorSubject<{
    organizationId: OrganizationId;
    organizationName: string;
  } | null>(null);
  organizationDetails$ = this._organizationDetailsSubject.asObservable();

  // ------------------------- Raw data -------------------------
  private _ciphersSubject = new BehaviorSubject<CipherView[] | null>(null);
  private _ciphers$ = this._ciphersSubject.asObservable();

  // ------------------------- Report Variables ----------------
  private _rawReportDataSubject = new BehaviorSubject<ReportState>({
    loading: true,
    error: null,
    data: null,
  });
  rawReportData$ = this._rawReportDataSubject.asObservable();
  private _enrichedReportDataSubject = new BehaviorSubject<RiskInsightsEnrichedData | null>(null);
  enrichedReportData$ = this._enrichedReportDataSubject.asObservable();

  // Generate report trigger and state
  private _generateReportTriggerSubject = new BehaviorSubject<boolean>(false);
  generatingReport$ = this._generateReportTriggerSubject.asObservable();

  // --------------------------- Critical Application data ---------------------
  criticalReportResults$: Observable<RiskInsightsEnrichedData | null> = of(null);

  // --------------------------- Trigger subjects ---------------------
  private _initializeOrganizationTriggerSubject = new Subject<OrganizationId>();
  private _fetchReportTriggerSubject = new Subject<void>();
  private _reportStateSubscription: Subscription;

  constructor(
    private accountService: AccountService,
    private cipherService: CipherService,
    private criticalAppsService: CriticalAppsService,
    private memberCipherDetailsApiService: MemberCipherDetailsApiService,
    private organizationService: OrganizationService,
    private passwordHealthService: PasswordHealthService,
    private reportApiService: RiskInsightsApiService,
    private reportService: RiskInsightsReportService,
    private riskInsightsEncryptionService: RiskInsightsEncryptionService,
    private logService: LogService,
  ) {
    this.logService.debug("[RiskInsightsOrchestratorService] Setting up");
    this._setupCriticalApplicationContext();
    this._setupCriticalApplicationReport();
    this._setupEnrichedReportData();
    this._setupInitializationPipeline();
    this._setupMigrationAndCleanup();
    this._setupReportState();
    this._setupUserId();
  }

  destroy(): void {
    this.logService.debug("[RiskInsightsOrchestratorService] Destroying");
    if (this._reportStateSubscription) {
      this._reportStateSubscription.unsubscribe();
    }
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Fetches the latest report for the current organization and user
   */
  fetchReport(): void {
    this.logService.debug("[RiskInsightsOrchestratorService] Fetch report triggered");
    this._fetchReportTriggerSubject.next();
  }

  /**
   * Generates a new report for the current organization and user
   */
  generateReport(): void {
    this.logService.debug("[RiskInsightsOrchestratorService] Create new report triggered");
    this._generateReportTriggerSubject.next(true);
  }

  /**
   * Initializes the service context for a specific organization
   *
   * @param organizationId The ID of the organization to initialize context for
   */
  initializeForOrganization(organizationId: OrganizationId) {
    this.logService.debug("[RiskInsightsOrchestratorService] Initializing for org", organizationId);
    this._initializeOrganizationTriggerSubject.next(organizationId);
  }

  setCriticalApplications$(criticalApplications: string[]): Observable<ReportState> {
    return this.rawReportData$.pipe(
      take(1),
      withLatestFrom(this.organizationDetails$, this._userId$),
      map(([reportState, organizationDetails, userId]) => {
        if (!organizationDetails) {
          this.logService.warning(
            "[RiskInsightsOrchestratorService] No organization details available when setting critical applications.",
          );
          return {
            reportState,
            organizationDetails: null,
            updatedState: reportState,
          }; // Return current state if no org details
        }

        // Handle the case where there is no report data
        if (!reportState?.data) {
          this.logService.warning(
            "[RiskInsightsOrchestratorService] Attempted to set critical applications with no report data.",
          );
          return {
            reportState,
            organizationDetails,
            updatedState: reportState,
          };
        }

        // Create a set for quick lookup of the new critical apps
        const newCriticalAppNamesSet = new Set(criticalApplications);

        const existingApplicationData = reportState.data.applicationData || [];
        const updatedApplicationData = this._mergeApplicationData(
          existingApplicationData,
          newCriticalAppNamesSet,
        );

        const updatedState: ReportState = {
          ...reportState,
          data: {
            ...reportState.data,
            applicationData: updatedApplicationData,
          },
        };

        this.logService.debug(
          "[RiskInsightsOrchestratorService] Updated applications data",
          updatedState,
        );
        return { reportState, organizationDetails, updatedState, userId };
      }),
      switchMap(({ reportState, organizationDetails, updatedState, userId }) => {
        return from(
          this.riskInsightsEncryptionService.encryptRiskInsightsReport(
            {
              organizationId: organizationDetails!.organizationId,
              userId,
            },
            {
              reportData: reportState.data.reportData,
              summaryData: reportState.data.summaryData,
              applicationData: updatedState.data.applicationData,
            },
          ),
        ).pipe(
          map((encryptedData) => ({
            reportState,
            organizationDetails,
            updatedState,
            encryptedData,
          })),
        );
      }),
      switchMap(({ reportState, organizationDetails, updatedState, encryptedData }) => {
        // Chain the save operation using switchMap
        return this.reportApiService
          .updateRiskInsightsApplicationData$(
            encryptedData.encryptedApplicationData.encryptedString,
            organizationDetails.organizationId,
            reportState.data.id,
          )
          .pipe(
            // Map the result of the save operation to the updated state
            map(() => updatedState),
            // Use tap to push the updated state to the subject
            tap((finalState) => this._rawReportDataSubject.next(finalState)),
            // Handle errors from the save operation
            catchError((error: unknown) => {
              this.logService.error("Failed to save updated applicationData", error);
              return of({ ...reportState, error: "Failed to save application data" });
            }),
          );
      }),
    );
  }

  private _fetchReport$(organizationId: OrganizationId, userId: UserId): Observable<ReportState> {
    return this.reportService.getRiskInsightsReport$(organizationId, userId).pipe(
      tap(() => this.logService.debug("[RiskInsightsOrchestratorService] Fetching report")),
      map(
        ({ id, reportData, summaryData, applicationData, creationDate }): ReportState => ({
          loading: false,
          error: null,
          data: {
            id,
            reportData,
            summaryData,
            applicationData,
            creationDate,
          },
        }),
      ),
      catchError(() => of({ loading: false, error: "Failed to fetch report", data: null })),
      startWith({ loading: true, error: null, data: null }),
    );
  }

  private _generateNewApplicationsReport$(
    organizationId: OrganizationId,
    userId: UserId,
  ): Observable<ReportState> {
    // Generate the report
    const memberCiphers$ = from(
      this.memberCipherDetailsApiService.getMemberCipherDetails(organizationId),
    ).pipe(map((memberCiphers) => flattenMemberDetails(memberCiphers)));

    return forkJoin([this._ciphers$, memberCiphers$]).pipe(
      tap(() => this.logService.debug("[RiskInsightsOrchestratorService] Generating new report")),
      switchMap(([ciphers, memberCiphers]) => this._getCipherHealth(ciphers, memberCiphers)),
      map((cipherHealthReports) =>
        this.reportService.generateApplicationsReport(cipherHealthReports),
      ),
      withLatestFrom(this.rawReportData$),

      map(([report, previousReport]) => ({
        report: report,
        summary: this.reportService.getApplicationsSummary(report),
        applications: this.reportService.getOrganizationApplications(
          report,
          previousReport.data.applicationData,
        ),
      })),
      switchMap(({ report, summary, applications }) =>
        // Save the report after enrichment
        this.reportService
          .saveRiskInsightsReport$(report, summary, applications, {
            organizationId,
            userId,
          })
          .pipe(
            map(() => ({
              report,
              summary,
              applications,
            })),
          ),
      ),
      // Update the running state
      map(
        ({ report, summary, applications }): ReportState => ({
          loading: false,
          error: null,
          data: {
            id: "" as OrganizationReportId,
            reportData: report,
            summaryData: summary,
            applicationData: applications,
            creationDate: new Date(),
          },
        }),
      ),
      catchError(() => {
        return of({ loading: false, error: "Failed to generate or save report", data: null });
      }),
      startWith({ loading: true, error: null, data: null }),
    );
  }

  /**
   * Associates the members with the ciphers they have access to. Calculates the password health.
   * Finds the trimmed uris.
   * @param ciphers Org ciphers
   * @param memberDetails Org members
   * @returns Cipher password health data with trimmed uris and associated members
   */
  private _getCipherHealth(
    ciphers: CipherView[],
    memberDetails: MemberDetails[],
  ): Observable<CipherHealthReport[]> {
    const validCiphers = ciphers.filter((cipher) =>
      this.passwordHealthService.isValidCipher(cipher),
    );
    const passwordUseMap = buildPasswordUseMap(validCiphers);

    // Check for exposed passwords and map to cipher health report
    return this.passwordHealthService.auditPasswordLeaks$(validCiphers).pipe(
      map((exposedDetails) => {
        return validCiphers.map((cipher) => {
          const exposedPasswordDetail = exposedDetails.find((x) => x?.cipherId === cipher.id);
          const cipherMembers = memberDetails.filter((x) => x.cipherId === cipher.id);
          const applications = getTrimmedCipherUris(cipher);
          const weakPasswordDetail = this.passwordHealthService.findWeakPasswordDetails(cipher);
          const reusedPasswordCount = passwordUseMap.get(cipher.login.password!) ?? 0;

          return {
            cipher,
            cipherMembers,
            applications,
            healthData: {
              weakPasswordDetail,
              reusedPasswordCount,
              exposedPasswordDetail,
            },
          };
        });
      }),
    );
  }

  private _runMigrationAndCleanup$(): Observable<OrganizationReportApplication[]> {
    // Start with rawReportData$ to ensure it has a value
    return this.rawReportData$.pipe(
      // Ensure rawReportData has a data payload
      filter((reportState) => !!reportState.data),
      take(1), // Use the first valid report state
      // Now switch to the migration logic
      switchMap((rawReportData) =>
        this.criticalAppsService.criticalAppsList$.pipe(
          take(1),
          withLatestFrom(this.organizationDetails$),
          switchMap(([savedCriticalApps, organizationDetails]) => {
            // Check if there are any critical apps to migrate.
            if (!savedCriticalApps || savedCriticalApps.length === 0) {
              this.logService.debug(
                "[RiskInsightsOrchestratorService] No critical apps to migrate.",
              );
              return of([]);
            }

            // Map the saved critical apps to the new format
            const migratedApps = savedCriticalApps.map(
              (app): OrganizationReportApplication => ({
                applicationName: app.uri,
                isCritical: true,
                reviewedDate: null,
              }),
            );

            // Use the setCriticalApplications$ function to update and save the report
            return this.setCriticalApplications$(
              migratedApps.map((app) => app.applicationName),
            ).pipe(
              // After setCriticalApplications$ completes, trigger the deletion.
              switchMap(() => {
                const deleteObservables = savedCriticalApps.map(
                  (app) => of(null),
                  // this.criticalAppsService.dropCriticalApp(
                  //   organizationDetails!.organizationId,
                  //   app.id,
                  // ),
                );
                return forkJoin(deleteObservables).pipe(
                  // After all deletes complete, map to the migrated apps.
                  map(() => {
                    this.logService.debug(
                      "[RiskInsightsOrchestratorService] Migrated and deleted critical applications.",
                    );
                    return migratedApps;
                  }),
                );
              }),
            );
          }),
        ),
      ),
    );
  }

  // Setup the pipeline to load critical applications when organization or user changes
  private _setupCriticalApplicationContext() {
    this.organizationDetails$
      .pipe(
        filter((orgDetails) => !!orgDetails),
        withLatestFrom(this._userId$),
        filter(([_, userId]) => !!userId),
        tap(([orgDetails, userId]) => {
          this.logService.debug(
            "[RiskInsightsOrchestratorService] Loading critical applications for org",
            orgDetails!.organizationId,
          );
          this.criticalAppsService.loadOrganizationContext(orgDetails!.organizationId, userId!);
        }),
        takeUntil(this._destroy$),
      )
      .subscribe();
  }

  // Setup the pipeline to create a report view filtered to only critical applications
  private _setupCriticalApplicationReport() {
    const criticalReportResultsPipeline$ = this.enrichedReportData$.pipe(
      filter((state) => !!state),
      map((enrichedReports) => {
        this.logService.debug(
          "[RiskInsightsOrchestratorService] Generating critical applications report from",
          enrichedReports,
        );
        const criticalApplications = enrichedReports!.reportData.filter(
          (app) => app.isMarkedAsCritical,
        );
        // Generate a new summary based on just the critical applications
        const summary = this.reportService.getApplicationsSummary(criticalApplications);
        return {
          ...enrichedReports,
          summaryData: summary,
          reportData: criticalApplications,
        };
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.criticalReportResults$ = criticalReportResultsPipeline$;
  }

  /**
   * Takes the basic application health report details and enriches them to include
   * critical app status and associated ciphers.
   */
  private _setupEnrichedReportData() {
    // Setup the enriched report data pipeline
    const enrichmentSubscription = combineLatest([
      this.rawReportData$.pipe(filter((data) => !!data)),
      this._ciphers$.pipe(filter((data) => !!data)),
    ]).pipe(
      switchMap(([rawReportData, ciphers]) => {
        this.logService.debug(
          "[RiskInsightsOrchestratorService] Enriching report data with ciphers and critical app status",
        );
        const criticalApps = rawReportData?.data?.applicationData.filter((app) => app.isCritical);
        const criticalApplicationNames = new Set(criticalApps.map((ca) => ca.applicationName));
        const rawReports = rawReportData.data?.reportData || [];
        const cipherMap = this.reportService.getApplicationCipherMap(ciphers, rawReports);

        const enrichedReports: ApplicationHealthReportDetailEnriched[] = rawReports.map((app) => ({
          ...app,
          ciphers: cipherMap.get(app.applicationName) || [],
          isMarkedAsCritical: criticalApplicationNames.has(app.applicationName),
        }));

        const enrichedData: RiskInsightsEnrichedData = {
          ...rawReportData.data,
          reportData: enrichedReports,
        };

        return of(enrichedData);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    enrichmentSubscription.pipe(takeUntil(this._destroy$)).subscribe((enrichedData) => {
      this._enrichedReportDataSubject.next(enrichedData);
    });
  }

  // Setup the pipeline to initialize organization context
  private _setupInitializationPipeline() {
    this._initializeOrganizationTriggerSubject
      .pipe(
        withLatestFrom(this._userId$),
        filter(([orgId, userId]) => !!orgId && !!userId),
        exhaustMap(([orgId, userId]) =>
          this.organizationService.organizations$(userId!).pipe(
            getOrganizationById(orgId),
            map((org) => ({ organizationId: orgId, organizationName: org.name })),
          ),
        ),
        tap(async (orgDetails) => {
          this.logService.debug("[RiskInsightsOrchestratorService] Fetching organization ciphers");
          const ciphers = await this.cipherService.getAllFromApiForOrganization(
            orgDetails.organizationId,
          );
          this._ciphersSubject.next(ciphers);
        }),
        takeUntil(this._destroy$),
      )
      .subscribe((orgDetails) => this._organizationDetailsSubject.next(orgDetails));
  }

  private _setupMigrationAndCleanup() {
    this.criticalAppsService.criticalAppsList$
      .pipe(
        filter((criticalApps) => criticalApps.length > 0),
        tap(() => {
          this.logService.debug(
            "[RiskInsightsOrchestratorService] Detected legacy critical apps, running migration and cleanup.",
          );
        }),
        switchMap(() =>
          this._runMigrationAndCleanup$().pipe(
            tap((migratedApps) => {
              if (migratedApps.length > 0) {
                this.logService.debug(
                  "[RiskInsightsOrchestratorService] Migration and cleanup completed.",
                  migratedApps,
                );
              }
            }),
            catchError((error: unknown) => {
              this.logService.error(
                "[RiskInsightsOrchestratorService] Migration and cleanup failed.",
                error,
              );
              return of([]);
            }),
          ),
        ),
      )
      .subscribe();
  }

  // Setup the report state management pipeline
  private _setupReportState() {
    // Dependencies needed for report state
    const reportDependencies$ = combineLatest([
      this.organizationDetails$.pipe(filter((org) => !!org)),
      this._userId$.pipe(filter((user) => !!user)),
    ]).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    // A stream for the initial report fetch (triggered by critical apps loading)
    const initialReportLoad$ = reportDependencies$.pipe(
      take(1), // Fetch only once on initial data load
      exhaustMap(([orgDetails, userId]) => this._fetchReport$(orgDetails!.organizationId, userId!)),
    );

    // A stream for manually triggered fetches
    const manualReportFetch$ = this._fetchReportTriggerSubject.pipe(
      withLatestFrom(reportDependencies$),
      exhaustMap(([_, [orgDetails, userId]]) =>
        this._fetchReport$(orgDetails!.organizationId, userId!),
      ),
    );

    // A stream for generating a new report
    const newReportGeneration$ = this.generatingReport$.pipe(
      distinctUntilChanged(),
      filter((isRunning) => isRunning),
      withLatestFrom(reportDependencies$),
      exhaustMap(([_, [orgDetails, userId]]) =>
        this._generateNewApplicationsReport$(orgDetails!.organizationId, userId),
      ),
    );

    // Combine all triggers and update the single report state
    const mergedReportState$ = merge(
      initialReportLoad$,
      manualReportFetch$,
      newReportGeneration$,
    ).pipe(
      scan((prevState: ReportState, currState: ReportState) => ({
        ...prevState,
        ...currState,
        data: currState.data !== null ? currState.data : prevState.data,
      })),
      startWith({ loading: false, error: null, data: null }),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntil(this._destroy$),
    );

    this._reportStateSubscription = mergedReportState$
      .pipe(takeUntil(this._destroy$))
      .subscribe((state) => {
        this.logService.debug("[RiskInsightsOrchestratorService] Updating report state", state);
        this._rawReportDataSubject.next(state);
      });
  }

  // Setup the user ID observable to track the current user
  private _setupUserId() {
    // Watch userId changes
    this.accountService.activeAccount$.pipe(getUserId).subscribe((userId) => {
      this._userIdSubject.next(userId);
    });
  }

  private _mergeApplicationData(
    existingApps: OrganizationReportApplication[],
    newCriticalAppNamesSet: Set<string>,
  ): OrganizationReportApplication[] {
    // First, iterate through the existing apps and update their isCritical flag
    const updatedApps = existingApps.map((app) => {
      return {
        ...app,
        isCritical: newCriticalAppNamesSet.has(app.applicationName) ?? app.isCritical,
      };
    });

    return updatedApps;
  }
}
