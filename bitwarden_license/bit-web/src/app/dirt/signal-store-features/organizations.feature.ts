import { inject, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { signalStoreFeature, withComputed, withProps, withState } from "@ngrx/signals";

import {
  getOrganizationById,
  OrganizationService,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { UserId } from "@bitwarden/common/types/guid";

export type OrganizationFeatureState = {
  currentOrganizationId: string;
};

export function setCurrentOrganizationId(organizationId: string): OrganizationFeatureState {
  return { currentOrganizationId: organizationId };
}

/**
 * Exposes values from the `Organization` as a feature for use in signal stores.
 *
 * @returns A feature that provides access to the active account and its user ID.
 */
export function withOrganizationFeature(activeAccountUserId: Signal<UserId>) {
  return signalStoreFeature(
    withState<OrganizationFeatureState>({ currentOrganizationId: "" }),
    withProps(() => ({
      organizationService: inject(OrganizationService),
    })),
    withComputed(({ currentOrganizationId, organizationService }) => {
      return {
        organizations: toSignal(organizationService.organizations$(activeAccountUserId())),
        currentOrganization: toSignal(
          organizationService
            .organizations$(activeAccountUserId())
            .pipe(getOrganizationById(currentOrganizationId())),
        ),
      };
    }),
    // withMethods(({ organizationService }) => {
    //   return {
    //     getOrganizationById: (id: string) =>
    //       organizationService.organizations$(activeAccountUserId()).pipe(getOrganizationById(id)),
    //   };
    // }),
  );
}
