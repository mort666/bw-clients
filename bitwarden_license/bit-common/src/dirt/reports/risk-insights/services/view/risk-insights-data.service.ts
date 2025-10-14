import { BehaviorSubject, EMPTY, firstValueFrom, Observable, of, Subject, throwError } from "rxjs";
import { catchError, distinctUntilChanged, exhaustMap, map } from "rxjs/operators";

import { OrganizationId } from "@bitwarden/common/types/guid";

import { getAtRiskApplicationList, getAtRiskMemberList } from "../../helpers";
import { ReportState, DrawerDetails, DrawerType, RiskInsightsEnrichedData } from "../../models";
import { CriticalAppsService } from "../domain/critical-apps.service";
import { RiskInsightsOrchestratorService } from "../domain/risk-insights-orchestrator.service";
import { RiskInsightsReportService } from "../domain/risk-insights-report.service";

export class RiskInsightsDataService {
  private _destroy$ = new Subject<void>();

  // -------------------------- Context state --------------------------
  // Organization the user is currently viewing
  readonly organizationDetails$: Observable<{
    organizationId: OrganizationId;
    organizationName: string;
  } | null> = of(null);

  // --------------------------- UI State ------------------------------------
  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  // -------------------------- Orchestrator-driven state  -------------
  // The full report state (for internal facade use or complex components)
  private readonly reportState$: Observable<ReportState>;
  readonly isLoading$: Observable<boolean> = of(false);
  readonly enrichedReportData$: Observable<RiskInsightsEnrichedData | null> = of(null);
  readonly isGeneratingReport$: Observable<boolean> = of(false);
  readonly criticalReportResults$: Observable<RiskInsightsEnrichedData | null> = of(null);

  // ------------------------- Drawer Variables ---------------------
  // Drawer variables unified into a single BehaviorSubject
  private drawerDetailsSubject = new BehaviorSubject<DrawerDetails>({
    open: false,
    invokerId: "",
    activeDrawerType: DrawerType.None,
    atRiskMemberDetails: [],
    appAtRiskMembers: null,
    atRiskAppDetails: null,
  });
  drawerDetails$ = this.drawerDetailsSubject.asObservable();

  // --------------------------- Critical Application data ---------------------
  constructor(
    private criticalAppsService: CriticalAppsService,
    private reportService: RiskInsightsReportService,
    private orchestrator: RiskInsightsOrchestratorService,
  ) {
    this.reportState$ = this.orchestrator.rawReportData$;
    this.isGeneratingReport$ = this.orchestrator.generatingReport$;
    this.organizationDetails$ = this.orchestrator.organizationDetails$;
    this.enrichedReportData$ = this.orchestrator.enrichedReportData$;
    this.criticalReportResults$ = this.orchestrator.criticalReportResults$;

    // Expose the loading state
    this.isLoading$ = this.reportState$.pipe(
      map((state) => state.loading),
      distinctUntilChanged(), // Prevent unnecessary component re-renders
    );
  }

  destroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ----- UI-triggered methods (delegate to orchestrator) -----
  initializeForOrganization(organizationId: OrganizationId) {
    this.orchestrator.initializeForOrganization(organizationId);
  }

  triggerReport(): void {
    this.orchestrator.generateReport();
  }

  fetchReport(): void {
    this.orchestrator.fetchReport();
  }

  // ------------------------- Drawer functions -----------------------------
  isActiveDrawerType = (drawerType: DrawerType): boolean => {
    return this.drawerDetailsSubject.value.activeDrawerType === drawerType;
  };

  isDrawerOpenForInvoker = (applicationName: string): boolean => {
    return this.drawerDetailsSubject.value.invokerId === applicationName;
  };

  closeDrawer = (): void => {
    this.drawerDetailsSubject.next({
      open: false,
      invokerId: "",
      activeDrawerType: DrawerType.None,
      atRiskMemberDetails: [],
      appAtRiskMembers: null,
      atRiskAppDetails: null,
    });
  };

  setDrawerForOrgAtRiskMembers = async (invokerId: string = ""): Promise<void> => {
    const { open, activeDrawerType, invokerId: currentInvokerId } = this.drawerDetailsSubject.value;
    const shouldClose =
      open && activeDrawerType === DrawerType.OrgAtRiskMembers && currentInvokerId === invokerId;

    if (shouldClose) {
      this.closeDrawer();
    } else {
      const reportResults = await firstValueFrom(this.enrichedReportData$);
      if (!reportResults) {
        return;
      }

      const atRiskMemberDetails = getAtRiskMemberList(reportResults.reportData);

      this.drawerDetailsSubject.next({
        open: true,
        invokerId,
        activeDrawerType: DrawerType.OrgAtRiskMembers,
        atRiskMemberDetails,
        appAtRiskMembers: null,
        atRiskAppDetails: null,
      });
    }
  };

  setDrawerForAppAtRiskMembers = async (invokerId: string = ""): Promise<void> => {
    const { open, activeDrawerType, invokerId: currentInvokerId } = this.drawerDetailsSubject.value;
    const shouldClose =
      open && activeDrawerType === DrawerType.AppAtRiskMembers && currentInvokerId === invokerId;

    if (shouldClose) {
      this.closeDrawer();
    } else {
      const reportResults = await firstValueFrom(this.enrichedReportData$);
      if (!reportResults) {
        return;
      }

      const atRiskMembers = {
        members:
          reportResults.reportData.find((app) => app.applicationName === invokerId)
            ?.atRiskMemberDetails ?? [],
        applicationName: invokerId,
      };
      this.drawerDetailsSubject.next({
        open: true,
        invokerId,
        activeDrawerType: DrawerType.AppAtRiskMembers,
        atRiskMemberDetails: [],
        appAtRiskMembers: atRiskMembers,
        atRiskAppDetails: null,
      });
    }
  };

  setDrawerForOrgAtRiskApps = async (invokerId: string = ""): Promise<void> => {
    const { open, activeDrawerType, invokerId: currentInvokerId } = this.drawerDetailsSubject.value;
    const shouldClose =
      open && activeDrawerType === DrawerType.OrgAtRiskApps && currentInvokerId === invokerId;

    if (shouldClose) {
      this.closeDrawer();
    } else {
      const reportResults = await firstValueFrom(this.enrichedReportData$);
      if (!reportResults) {
        return;
      }
      const atRiskAppDetails = getAtRiskApplicationList(reportResults.reportData);

      this.drawerDetailsSubject.next({
        open: true,
        invokerId,
        activeDrawerType: DrawerType.OrgAtRiskApps,
        atRiskMemberDetails: [],
        appAtRiskMembers: null,
        atRiskAppDetails,
      });
    }
  };

  // ------------------------------ Critical application methods --------------
  saveCriticalApplications(selectedUrls: string[]) {
    // Saving critical applications to the report
    this.orchestrator.saveCriticalApplications$(selectedUrls);

    // Legacy support: also save to the CriticalAppsService for backward compatibility
    return this.organizationDetails$.pipe(
      exhaustMap((organizationDetails) => {
        if (!organizationDetails?.organizationId) {
          return EMPTY;
        }
        return this.criticalAppsService.setCriticalApps(
          organizationDetails?.organizationId,
          selectedUrls,
        );
      }),
      catchError((error: unknown) => {
        this.errorSubject.next("Failed to save critical applications");
        return throwError(() => error);
      }),
    );
  }

  removeCriticalApplication(hostname: string) {
    return this.organizationDetails$.pipe(
      exhaustMap((organizationDetails) => {
        if (!organizationDetails?.organizationId) {
          return EMPTY;
        }
        return this.criticalAppsService.dropCriticalAppByUrl(
          organizationDetails?.organizationId,
          hostname,
        );
      }),
      catchError((error: unknown) => {
        this.errorSubject.next("Failed to remove critical application");
        return throwError(() => error);
      }),
    );
  }
}
