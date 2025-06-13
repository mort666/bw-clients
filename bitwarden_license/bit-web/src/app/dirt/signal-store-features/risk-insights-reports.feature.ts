import { inject } from "@angular/core";
import { tapResponse } from "@ngrx/operators";
import {
  PartialStateUpdater,
  patchState,
  signalStoreFeature,
  withMethods,
  withProps,
  withState,
} from "@ngrx/signals";
import { SelectEntityId, setAllEntities, withEntities } from "@ngrx/signals/entities";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { exhaustMap, from } from "rxjs";

import { RiskInsightsReportService } from "@bitwarden/bit-common/dirt/reports/risk-insights";
import { ApplicationHealthReportDetail } from "@bitwarden/bit-common/dirt/reports/risk-insights/models/password-health";

import { withSelectedEntitiesFeature } from "./selected-entities.feature";

export type RiskInsightsReportsFeatureState = {
  loadingApplicationReports: boolean;
  lastUpdated: Date | null;
};

export function setLoadingApps(
  isLoading: boolean,
): PartialStateUpdater<RiskInsightsReportsFeatureState> {
  return (state) => ({
    ...state,
    loadingApplicationReports: isLoading,
  });
}

export function setLastUpdated(
  lastUpdated: Date,
): PartialStateUpdater<RiskInsightsReportsFeatureState> {
  return (state) => ({
    ...state,
    lastUpdated,
  });
}

export const applicationSelectId: SelectEntityId<ApplicationHealthReportDetail> = (app) =>
  app.applicationName;

/**
 * Exposes values from the `RiskInsightsReportsService` as a feature for use in signal stores.
 *
 * @returns A feature that provides access to the application reports.
 */
export function withRiskInsightsReportsFeature() {
  return signalStoreFeature(
    withState<RiskInsightsReportsFeatureState>({
      loadingApplicationReports: false,
      lastUpdated: null,
    }),
    withEntities<ApplicationHealthReportDetail>(),
    withSelectedEntitiesFeature(),
    withProps(() => ({
      riskInsightsReportsService: inject(RiskInsightsReportService),
    })),
    withMethods((store) => ({
      loadApplicationReports: rxMethod<string>(
        exhaustMap((orgId) => {
          // No organization ID provided, return empty state
          if (!orgId) {
            patchState(store, setAllEntities([], { selectId: applicationSelectId }));
          }

          patchState(store, setLoadingApps(true));
          return store.riskInsightsReportsService.generateApplicationsReport$(orgId).pipe(
            tapResponse({
              next: (applications) => {
                patchState(
                  store,
                  setAllEntities(applications, { selectId: applicationSelectId }),
                  setLastUpdated(new Date()),
                  setLoadingApps(false),
                );
                return from([]); // Return an empty observable
              },
              error: (err) => {
                patchState(
                  store,
                  setAllEntities([], { selectId: applicationSelectId }),
                  setLoadingApps(false),
                );
                // TODO: Handle error appropriately, e.g., show a toast notification
                // console.error(err);
              },
            }),
          );
        }),
      ),
    })),
  );
}
