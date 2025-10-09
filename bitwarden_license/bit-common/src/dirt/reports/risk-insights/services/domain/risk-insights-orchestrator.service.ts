import {
  BehaviorSubject,
  combineLatest,
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
import { OrganizationId, UserId } from "@bitwarden/common/types/guid";

import { ApplicationHealthReportDetailEnriched } from "../../models";
import { RiskInsightsEnrichedData } from "../../models/report-data-service.types";
import { ReportState } from "../../models/report-models";

import { CriticalAppsService } from "./critical-apps.service";
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
    private criticalAppsService: CriticalAppsService,
    private organizationService: OrganizationService,
    private reportService: RiskInsightsReportService,
  ) {
    this._setupCriticalApplicationContext();
    this._setupCriticalApplicationReport();
    this._setupEnrichedReportData();
    this._setupInitializationPipeline();
    this._setupReportState();
    this._setupUserId();
  }

  destroy(): void {
    if (this._reportStateSubscription) {
      this._reportStateSubscription.unsubscribe();
    }
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Initializes the service context for a specific organization
   *
   * @param organizationId The ID of the organization to initialize context for
   */
  initializeForOrganization(organizationId: OrganizationId) {
    this._initializeOrganizationTriggerSubject.next(organizationId);
  }

  /**
   * Fetches the latest report for the current organization and user
   */
  fetchReport(): void {
    this._fetchReportTriggerSubject.next();
  }

  /**
   * Generates a new report for the current organization and user
   */
  generateReport(): void {
    this._generateReportTriggerSubject.next(true);
  }

  private _fetchReport$(organizationId: OrganizationId, userId: UserId): Observable<ReportState> {
    return this.reportService.getRiskInsightsReport$(organizationId, userId).pipe(
      map(
        ({ reportData, summaryData, applicationData, creationDate }): ReportState => ({
          loading: false,
          error: null,
          data: {
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

  private _generateApplicationsReport$(
    organizationId: OrganizationId,
    userId: UserId,
  ): Observable<ReportState> {
    // Generate the report
    return this.reportService.generateApplicationsReport$(organizationId).pipe(
      map((enrichedReport) => ({
        report: enrichedReport,
        summary: this.reportService.generateApplicationsSummary(enrichedReport),
        applications: this.reportService.generateOrganizationApplications(enrichedReport),
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

  // Setup the pipeline to load critical applications when organization or user changes
  private _setupCriticalApplicationContext() {
    this.organizationDetails$
      .pipe(
        filter((orgDetails) => !!orgDetails),
        withLatestFrom(this._userId$),
        filter(([_, userId]) => !!userId),
        tap(([orgDetails, userId]) => {
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
        const criticalApplications = enrichedReports!.reportData.filter(
          (app) => app.isMarkedAsCritical,
        );
        const summary = this.reportService.generateApplicationsSummary(criticalApplications);
        return {
          ...enrichedReports,
          summaryData: summary,
          reportData: criticalApplications,
        };
      }),
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
      this.organizationDetails$.pipe(filter((details) => !!details)),
      this.criticalAppsService.criticalAppsList$.pipe(filter((list) => !!list)),
    ]).pipe(
      switchMap(([rawReportData, orgDetails, criticalApps]) => {
        const criticalApplicationNames = new Set(criticalApps.map((ca) => ca.uri));
        const rawReports = rawReportData.data?.reportData || [];
        return from(
          this.reportService.getApplicationCipherMap(rawReports, orgDetails!.organizationId),
        ).pipe(
          map((cipherMap) => {
            return rawReports.map((app) => ({
              ...app,
              ciphers: cipherMap.get(app.applicationName) || [],
              isMarkedAsCritical: criticalApplicationNames.has(app.applicationName),
            })) as ApplicationHealthReportDetailEnriched[];
          }),
          map((enrichedReportData) => ({ ...rawReportData.data, reportData: enrichedReportData })),
          catchError(() => {
            return of(null);
          }),
        );
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
        takeUntil(this._destroy$),
      )
      .subscribe((orgDetails) => this._organizationDetailsSubject.next(orgDetails));
  }

  // Setup the report state management pipeline
  private _setupReportState() {
    // Dependencies needed for report state
    const reportDependencies$ = combineLatest([
      this.organizationDetails$.pipe(filter((org) => !!org)),
      this._userId$.pipe(filter((user) => !!user)),
    ]).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    // A stream for the initial report fetch (triggered by critical apps loading)
    const initialReportLoad$ = combineLatest([
      this.criticalAppsService.criticalAppsList$,
      reportDependencies$,
    ]).pipe(
      take(1), // Fetch only once on initial data load
      exhaustMap(([_, [orgDetails, userId]]) =>
        this._fetchReport$(orgDetails!.organizationId, userId!),
      ),
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
        this._generateApplicationsReport$(orgDetails!.organizationId, userId),
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
}
