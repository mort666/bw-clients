import { Injectable } from "@angular/core";
import { Observable, combineLatest, switchMap, map, filter, shareReplay, from } from "rxjs";

import { OrganizationUserApiService } from "@bitwarden/admin-console/common";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import {
  getOrganizationById,
  OrganizationService,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { PolicyApiServiceAbstraction as PolicyApiService } from "@bitwarden/common/admin-console/abstractions/policy/policy-api.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { OrganizationId } from "@bitwarden/common/types/guid";

import { GroupApiService } from "../../../core";
import { OrganizationUserView } from "../../../core/views/organization-user.view";

export interface OrganizationMemberState {
  organization: Organization | null;
  users: OrganizationUserView[];
  policies: Policy[];
  resetPasswordPolicyEnabled: boolean;
  loading: boolean;
}

@Injectable()
export class OrganizationMembersService {
  constructor(
    private organizationService: OrganizationService,
    private organizationUserApiService: OrganizationUserApiService,
    private policyService: PolicyService,
    private policyApiService: PolicyApiService,
    private groupService: GroupApiService,
    private apiService: ApiService,
    private accountService: AccountService,
  ) {}

  getMemberState(organizationId: OrganizationId): Observable<OrganizationMemberState> {
    const userId$ = this.accountService.activeAccount$.pipe(getUserId);

    const organization$ = userId$.pipe(
      switchMap((userId) =>
        this.organizationService.organizations$(userId).pipe(getOrganizationById(organizationId)),
      ),
      filter((organization): organization is Organization => organization != null),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );

    const policies$ = combineLatest([userId$, organization$]).pipe(
      switchMap(([userId, organization]) =>
        organization.isProviderUser
          ? from(this.policyApiService.getPolicies(organization.id)).pipe(
              map((response) => Policy.fromListResponse(response)),
            )
          : this.policyService.policies$(userId),
      ),
    );

    const users$ = organization$.pipe(switchMap((organization) => this.loadUsers(organization)));

    return combineLatest([organization$, users$, policies$]).pipe(
      map(([organization, users, policies]) => {
        const resetPasswordPolicy = policies
          .filter((policy) => policy.type === PolicyType.ResetPassword)
          .find((p) => p.organizationId === organization.id);

        return {
          organization,
          users,
          policies,
          resetPasswordPolicyEnabled: resetPasswordPolicy?.enabled ?? false,
          loading: false, // Data is loaded when we reach this point
        };
      }),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );
  }

  async loadUsers(organization: Organization): Promise<OrganizationUserView[]> {
    let groupsPromise: Promise<Map<string, string>> | undefined;
    let collectionsPromise: Promise<Map<string, string>> | undefined;

    const userPromise = this.organizationUserApiService.getAllUsers(organization.id, {
      includeGroups: organization.useGroups,
      includeCollections: !organization.useGroups,
    });

    if (organization.useGroups) {
      groupsPromise = this.getGroupNameMap(organization);
    } else {
      collectionsPromise = this.getCollectionNameMap(organization);
    }

    const [usersResponse, groupNamesMap, collectionNamesMap] = await Promise.all([
      userPromise,
      groupsPromise,
      collectionsPromise,
    ]);

    return (
      usersResponse.data?.map<OrganizationUserView>((r) => {
        const userView = OrganizationUserView.fromResponse(r);

        userView.groupNames = userView.groups
          .map((g: string) => groupNamesMap?.get(g))
          .filter((name): name is string => name != null)
          .sort();
        userView.collectionNames = userView.collections
          .map((c: { id: string }) => collectionNamesMap?.get(c.id))
          .filter((name): name is string => name != null)
          .sort();

        return userView;
      }) ?? []
    );
  }

  private async getGroupNameMap(organization: Organization): Promise<Map<string, string>> {
    const groups = await this.groupService.getAll(organization.id);
    const groupNameMap = new Map<string, string>();
    groups.forEach((g: { id: string; name: string }) => groupNameMap.set(g.id, g.name));
    return groupNameMap;
  }

  private async getCollectionNameMap(organization: Organization): Promise<Map<string, string>> {
    const response = this.apiService
      .getCollections(organization.id)
      .then((res) =>
        res.data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })),
      );

    const collections = await response;
    const collectionMap = new Map<string, string>();
    collections.forEach((c: { id: string; name: string }) => collectionMap.set(c.id, c.name));
    return collectionMap;
  }
}
