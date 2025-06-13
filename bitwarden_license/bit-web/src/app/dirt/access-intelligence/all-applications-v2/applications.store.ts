import { computed, effect, inject } from "@angular/core";
import {
  patchState,
  signalStore,
  withComputed,
  withFeature,
  withHooks,
  withMethods,
  withProps,
  withState,
} from "@ngrx/signals";
import { EntityId } from "@ngrx/signals/entities";

import {
  RiskInsightsDataService,
  RiskInsightsReportService,
} from "@bitwarden/bit-common/dirt/reports/risk-insights";
import {
  AppAtRiskMembersDialogParams,
  ApplicationHealthReportSummary,
  AtRiskApplicationDetail,
  AtRiskMemberDetail,
} from "@bitwarden/bit-common/dirt/reports/risk-insights/models/password-health";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { ToastService } from "@bitwarden/components";

import { withActivatedRouteFeature } from "../../signal-store-features/activated-route.feature";
import { withActiveAccountFeature } from "../../signal-store-features/active-account.feature";
import {
  setMarkingCriticalApps,
  withCriticalApplicationsFeature,
} from "../../signal-store-features/critical-applications.feature";
import {
  closeDrawer,
  openDrawerForApplicationMembers,
  openDrawerForApplications,
  openDrawerForOrganizationMembers,
  withDrawerFeature,
} from "../../signal-store-features/drawer.feature";
import {
  setCurrentOrganizationId,
  withOrganizationFeature,
} from "../../signal-store-features/organizations.feature";
import { withRiskInsightsReportsFeature } from "../../signal-store-features/risk-insights-reports.feature";
import {
  addSelectedEntityId,
  clearSelectedEntityIds,
  removeSelectedEntityId,
} from "../../signal-store-features/selected-entities.feature";
// Setup the initial state for the store

type ApplicationStoreState = {
  applicationSummary: ApplicationHealthReportSummary;
  initialized: boolean;
  isLoading: boolean;
  loadingCriticalApps: boolean;
  organization: any;
  atRiskAllMembers: AtRiskMemberDetail[];
  atRiskApplications: AtRiskApplicationDetail[];
  atRiskApplicationMembers: AppAtRiskMembersDialogParams | null;
};

const initialState: ApplicationStoreState = {
  applicationSummary: {
    totalMemberCount: 0,
    totalAtRiskMemberCount: 0,
    totalApplicationCount: 0,
    totalAtRiskApplicationCount: 0,
  },
  initialized: false,
  isLoading: false,
  loadingCriticalApps: false,
  organization: undefined,
  atRiskAllMembers: [],
  atRiskApplications: [],
  atRiskApplicationMembers: null,
};

export const ApplicationStore = signalStore(
  withState(initialState),
  withProps(() => ({
    toastService: inject(ToastService),
    dataService: inject(RiskInsightsDataService),
    reportService: inject(RiskInsightsReportService),
    i18nService: inject(I18nService),
  })),
  withDrawerFeature(), // Adds drawer functionality
  withActivatedRouteFeature(),
  withActiveAccountFeature(),
  withFeature(({ activeAccountUserId }) => withOrganizationFeature(activeAccountUserId)),
  withFeature(({ currentOrganizationId }) =>
    withCriticalApplicationsFeature(currentOrganizationId),
  ),
  withRiskInsightsReportsFeature(),
  // withFeature(({ currentOrganizationId }) => withRiskInsightsReportsFeature(currentOrganizationId)),
  withComputed(({ entities, criticalApps, selectedEntityIds, reportService }) => {
    return {
      // table data
      // Expose drawer invoker ID for the table to use
      // tableDataSource: computed(() => {
      //   const tableDataSource =
      //     new TableDataSource<ApplicationHealthReportDetailWithCriticalFlag>();

      //   tableDataSource.data = entities();
      //   return tableDataSource;
      // }),
      selectedApplicationsIds: computed(() => {
        const stringIds = new Set<string>();
        selectedEntityIds().forEach((id: EntityId) => {
          stringIds.add(id as string);
        });
        return stringIds;
      }),
      applicationsCount: computed(() => entities().length),
      applicationsWithCriticalFlag: computed(() => {
        const apps = entities();
        return apps.map((app) => ({
          ...app,
          isMarkedAsCritical: criticalApps()
            .map((ca) => ca.uri)
            .includes(app.applicationName),
        }));
      }),
      summary: computed(() => reportService.generateApplicationsSummary(entities())),
    };
  }),
  withMethods(({ dataService, reportService, i18nService, toastService, ...store }) => ({
    selectApplication(id: EntityId): void {
      patchState(store, addSelectedEntityId(store.selectedEntityIds(), id));
    },
    deselectApplication(id: EntityId): void {
      patchState(store, removeSelectedEntityId(store.selectedEntityIds(), id));
    },
    isDrawerOpenForTableRow(applicationName: string): boolean {
      return store.drawerInvokerId() === applicationName;
    },
    markAppsAsCritical: async () => {
      patchState(store, setMarkingCriticalApps(true));

      try {
        await store.saveCriticalApps(
          // store.currentOrganizationId(),
          Array.from(store.selectedApplicationsIds()),
        );

        // Use the toast feature from the store
        toastService.showToast({
          variant: "success",
          title: "",
          message: i18nService.t("applicationsMarkedAsCriticalSuccess"),
        });
        patchState(store, clearSelectedEntityIds());
      } finally {
        patchState(store, setMarkingCriticalApps(false));
      }
    },
    closeDrawer: () => {
      patchState(store, closeDrawer());
    },
    showAllAtRiskMembers: () => {
      const atRiskAllMembers = reportService.generateAtRiskMemberList(store.entities());
      patchState(store, { atRiskAllMembers }, openDrawerForOrganizationMembers());
    },
    showAtRiskApplications: () => {
      // TODO: This should be moved to the report service
      const atRiskApplications = reportService.generateAtRiskApplicationList(store.entities());
      patchState(store, { atRiskApplications }, openDrawerForApplications());
    },
    showAtRiskApplicationMembers: (applicationName: string) => {
      const atRiskApplicationMembers = {
        members:
          store.entities().find((app: any) => app.applicationName === applicationName)
            ?.atRiskMemberDetails ?? [],
        applicationName,
      };
      patchState(
        store,
        {
          atRiskApplicationMembers,
        },
        openDrawerForApplicationMembers(applicationName),
      );
    },
  })),

  withHooks({
    onInit(store) {
      // Watch for changes in the route params for organizationId
      effect(() => {
        const orgIdParam = store.activatedRouteParams()?.get("organizationId");
        if (orgIdParam) {
          patchState(store, setCurrentOrganizationId(orgIdParam));
        }
      });
    },
  }),
);
