import { inject, Signal } from "@angular/core";
import { tapResponse } from "@ngrx/operators";
import {
  PartialStateUpdater,
  patchState,
  signalStoreFeature,
  withMethods,
  withProps,
  withState,
} from "@ngrx/signals";
import { rxMethod } from "@ngrx/signals/rxjs-interop";
import { exhaustMap, filter, from, pipe, tap } from "rxjs";

import { CriticalAppsService } from "@bitwarden/bit-common/dirt/reports/risk-insights";
import { PasswordHealthReportApplicationsResponse } from "@bitwarden/bit-common/dirt/reports/risk-insights/models/password-health";
import { OrganizationId } from "@bitwarden/common/types/guid";

export type CriticalApplicationsFeatureState = {
  isMarkingAppsAsCritical: boolean;
  loadingCriticalApps: boolean;
  criticalApps: PasswordHealthReportApplicationsResponse[];
};

export function setLoadingCriticalApps(
  isLoading: boolean,
): PartialStateUpdater<CriticalApplicationsFeatureState> {
  return (state) => ({
    ...state,
    loadingCriticalApps: isLoading,
  });
}

export function setCriticalApps(
  applications: PasswordHealthReportApplicationsResponse[],
): PartialStateUpdater<CriticalApplicationsFeatureState> {
  return (state) => ({
    ...state,
    criticalApps: applications,
  });
}

export function setMarkingCriticalApps(
  isMarking: boolean,
): Partial<CriticalApplicationsFeatureState> {
  return { isMarkingAppsAsCritical: isMarking };
}

/**
 * Exposes values from the `CriticalApplicationsService` as a feature for use in signal stores.
 *
 * @returns A feature that provides access to the critical applications and.
 */
export function withCriticalApplicationsFeature(orgId: Signal<string>) {
  return signalStoreFeature(
    withState<CriticalApplicationsFeatureState>({
      isMarkingAppsAsCritical: false,
      loadingCriticalApps: false,
      criticalApps: [],
    }),
    withProps(() => ({
      criticalApplicationsService: inject(CriticalAppsService),
    })),
    withMethods((store) => ({
      setOrganizationId: rxMethod<string>(
        pipe(
          filter((orgId) => !!orgId),
          tap((orgId) => {
            return store.criticalApplicationsService.setOrganizationId(orgId as OrganizationId);
          }),
        ),
      ),
      loadCriticalApps: rxMethod<string>(
        exhaustMap((orgId) => {
          const org = orgId;
          // No organization ID provided, return empty state
          if (!org) {
            patchState(store, setCriticalApps([]));
            return from([]); // Return an empty observable
          }

          patchState(store, setLoadingCriticalApps(true));
          return store.criticalApplicationsService.generateAppsListForOrg$(org).pipe(
            tapResponse({
              next: (applications) => {
                patchState(store, setCriticalApps(applications), setLoadingCriticalApps(false));
              },
              error: (err) => {
                patchState(store, setCriticalApps([]), setLoadingCriticalApps(false));
                // TODO: Handle error appropriately, e.g., show a toast notification
                // console.error(err);
              },
            }),
          );
        }),
      ),
      saveCriticalApps: rxMethod<string[]>(
        exhaustMap((selectedUrls) => {
          patchState(store, setMarkingCriticalApps(true));
          return from(
            store.criticalApplicationsService.setCriticalApps(orgId(), selectedUrls),
          ).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, setMarkingCriticalApps(false), setCriticalApps(response));
              },
              error: (err) => {
                patchState(store, setMarkingCriticalApps(false));
                // TODO: Handle error appropriately
                // console.error(err);
              },
            }),
          );
        }),
      ),
    })),
  );
}
