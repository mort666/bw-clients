import { Component, computed, Signal } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import {
  BehaviorSubject,
  combineLatest,
  concatMap,
  filter,
  firstValueFrom,
  from,
  lastValueFrom,
  map,
  merge,
  Observable,
  shareReplay,
  switchMap,
  take,
} from "rxjs";

import {
  OrganizationUserApiService,
  OrganizationUserUserDetailsResponse,
  CollectionService,
  CollectionData,
  Collection,
  CollectionDetailsResponse,
} from "@bitwarden/admin-console/common";
import { UserNamePipe } from "@bitwarden/angular/pipes/user-name.pipe";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import {
  getOrganizationById,
  OrganizationService,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { OrganizationManagementPreferencesService } from "@bitwarden/common/admin-console/abstractions/organization-management-preferences/organization-management-preferences.service";
import { PolicyApiServiceAbstraction as PolicyApiService } from "@bitwarden/common/admin-console/abstractions/policy/policy-api.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import {
  OrganizationUserStatusType,
  OrganizationUserType,
  PolicyType,
} from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { ProductTierType } from "@bitwarden/common/billing/enums";
import { OrganizationBillingMetadataResponse } from "@bitwarden/common/billing/models/response/organization-billing-metadata.response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { ValidationService } from "@bitwarden/common/platform/abstractions/validation.service";
import { OrganizationId, UserId } from "@bitwarden/common/types/guid";
import { DialogService, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";
import { OrganizationWarningsService } from "@bitwarden/web-vault/app/billing/organizations/warnings/services";

import { BaseMembersComponent } from "../../common/base-members.component";
import { PeopleTableDataSource } from "../../common/people-table-data-source";
import { GroupApiService } from "../core";
import { OrganizationUserView } from "../core/views/organization-user.view";
import { openEntityEventsDialog } from "../manage/entity-events.component";

import {
  AccountRecoveryDialogComponent,
  AccountRecoveryDialogResultType,
} from "./components/account-recovery/account-recovery-dialog.component";
import { BulkConfirmDialogComponent } from "./components/bulk/bulk-confirm-dialog.component";
import { BulkDeleteDialogComponent } from "./components/bulk/bulk-delete-dialog.component";
import { BulkEnableSecretsManagerDialogComponent } from "./components/bulk/bulk-enable-sm-dialog.component";
import { BulkRemoveDialogComponent } from "./components/bulk/bulk-remove-dialog.component";
import { BulkRestoreRevokeComponent } from "./components/bulk/bulk-restore-revoke.component";
import { BulkStatusComponent } from "./components/bulk/bulk-status.component";
import {
  MemberDialogResult,
  MemberDialogTab,
  openUserAddEditDialog,
} from "./components/member-dialog";
import { BillingConstraintService } from "./services";
import { DeleteManagedMemberWarningService } from "./services/delete-managed-member/delete-managed-member-warning.service";
import { MemberActionsService } from "./services/member-actions/member-actions.service";
import { OrganizationUserService } from "./services/organization-user/organization-user.service";

class MembersTableDataSource extends PeopleTableDataSource<OrganizationUserView> {
  protected statusType = OrganizationUserStatusType;
}

@Component({
  templateUrl: "members.component.html",
  standalone: false,
})
export class MembersComponent extends BaseMembersComponent<OrganizationUserView> {
  userType = OrganizationUserType;
  userStatusType = OrganizationUserStatusType;
  memberTab = MemberDialogTab;
  protected dataSource = new MembersTableDataSource();

  organization: Signal<Organization | undefined>;
  status: OrganizationUserStatusType | undefined;
  orgResetPasswordPolicyEnabled = false;

  protected canUseSecretsManager: Signal<boolean> = computed(
    () => this.organization()?.useSecretsManager ?? false,
  );
  protected showUserManagementControls: Signal<boolean> = computed(
    () => this.organization()?.canManageUsers ?? false,
  );
  private refreshBillingMetadata$: BehaviorSubject<null> = new BehaviorSubject(null);
  protected billingMetadata$: Observable<OrganizationBillingMetadataResponse>;

  // Fixed sizes used for cdkVirtualScroll
  protected rowHeight = 66;
  protected rowHeightClass = `tw-h-[66px]`;

  private userId$: Observable<UserId> = this.accountService.activeAccount$.pipe(getUserId);

  constructor(
    apiService: ApiService,
    i18nService: I18nService,
    organizationManagementPreferencesService: OrganizationManagementPreferencesService,
    keyService: KeyService,
    validationService: ValidationService,
    logService: LogService,
    userNamePipe: UserNamePipe,
    dialogService: DialogService,
    toastService: ToastService,
    private policyService: PolicyService,
    private policyApiService: PolicyApiService,
    private route: ActivatedRoute,
    private organizationService: OrganizationService,
    private accountService: AccountService,
    private organizationUserApiService: OrganizationUserApiService,
    private groupService: GroupApiService,
    private collectionService: CollectionService,
    protected deleteManagedMemberWarningService: DeleteManagedMemberWarningService,
    private organizationUserService: OrganizationUserService,
    private organizationWarningsService: OrganizationWarningsService,
    private memberActionsService: MemberActionsService,
    protected billingConstraint: BillingConstraintService,
  ) {
    super(
      apiService,
      i18nService,
      keyService,
      validationService,
      logService,
      userNamePipe,
      dialogService,
      organizationManagementPreferencesService,
      toastService,
    );

    const organization$ = this.route.params.pipe(
      concatMap((params) =>
        this.userId$.pipe(
          switchMap((userId) =>
            this.organizationService
              .organizations$(userId)
              .pipe(getOrganizationById(params.organizationId)),
          ),
        ),
      ),
      filter((organization): organization is Organization => organization != null),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );

    this.organization = toSignal(organization$);

    const policies$ = combineLatest([this.userId$, organization$]).pipe(
      switchMap(([userId, organization]) =>
        organization.isProviderUser
          ? from(this.policyApiService.getPolicies(organization.id)).pipe(
              map((response) => Policy.fromListResponse(response)),
            )
          : this.policyService.policies$(userId),
      ),
    );

    combineLatest([this.route.queryParams, policies$, organization$])
      .pipe(
        concatMap(async ([qParams, policies, organization]) => {
          // Backfill pub/priv key if necessary
          try {
            await this.memberActionsService.ensureOrganizationKeys(organization);
          } catch {
            throw new Error(this.i18nService.t("resetPasswordOrgKeysError"));
          }

          const resetPasswordPolicy = policies
            .filter((policy) => policy.type === PolicyType.ResetPassword)
            .find((p) => p.organizationId === organization.id);
          this.orgResetPasswordPolicyEnabled = resetPasswordPolicy?.enabled ?? false;

          await this.load(organization);

          this.searchControl.setValue(qParams.search);

          if (qParams.viewEvents != null) {
            const user = this.dataSource.data.filter((u) => u.id === qParams.viewEvents);
            if (user.length > 0 && user[0].status === OrganizationUserStatusType.Confirmed) {
              this.openEventsDialog(user[0], organization);
            }
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    organization$
      .pipe(
        switchMap((organization) =>
          merge(
            this.organizationWarningsService.showInactiveSubscriptionDialog$(organization),
            this.organizationWarningsService.showSubscribeBeforeFreeTrialEndsDialog$(organization),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();

    this.billingMetadata$ = organization$.pipe(
      switchMap((organization) => this.billingConstraint.getBillingMetadata$(organization.id)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    // Stripe is slow, so kick this off in the background but without blocking page load.
    // Anyone who needs it will still await the first emission.
    this.billingMetadata$.pipe(take(1), takeUntilDestroyed()).subscribe();
  }

  override async load(organization: Organization) {
    this.refreshBillingMetadata$.next(null);
    await super.load(organization);
  }

  async getUsers(organization: Organization): Promise<OrganizationUserView[]> {
    let groupsPromise: Promise<Map<string, string>> | undefined;
    let collectionsPromise: Promise<Map<string, string>> | undefined;

    // We don't need both groups and collections for the table, so only load one
    const userPromise = this.organizationUserApiService.getAllUsers(organization.id, {
      includeGroups: organization.useGroups,
      includeCollections: !organization.useGroups,
    });

    // Depending on which column is displayed, we need to load the group/collection names
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
          .map((g) => groupNamesMap?.get(g))
          .filter((name): name is string => name != null)
          .sort(this.i18nService.collator?.compare);
        userView.collectionNames = userView.collections
          .map((c) => collectionNamesMap?.get(c.id))
          .filter((name): name is string => name != null)
          .sort(this.i18nService.collator?.compare);

        return userView;
      }) ?? []
    );
  }

  async getGroupNameMap(organization: Organization): Promise<Map<string, string>> {
    const groups = await this.groupService.getAll(organization.id);
    const groupNameMap = new Map<string, string>();
    groups.forEach((g) => groupNameMap.set(g.id, g.name));
    return groupNameMap;
  }

  /**
   * Retrieve a map of all collection IDs <-> names for the organization.
   */
  async getCollectionNameMap(organization: Organization) {
    const response = from(this.apiService.getCollections(organization.id)).pipe(
      map((res) =>
        res.data.map((r) =>
          Collection.fromCollectionData(new CollectionData(r as CollectionDetailsResponse)),
        ),
      ),
    );

    const decryptedCollections$ = combineLatest([
      this.userId$.pipe(
        switchMap((userId) => this.keyService.orgKeys$(userId)),
        filter((orgKeys) => orgKeys != null),
      ),
      response,
    ]).pipe(
      switchMap(([orgKeys, collections]) =>
        this.collectionService.decryptMany$(collections, orgKeys),
      ),
      map((collections) => {
        const collectionMap = new Map<string, string>();
        collections.forEach((c) => collectionMap.set(c.id, c.name));
        return collectionMap;
      }),
    );

    return await firstValueFrom(decryptedCollections$);
  }

  async removeUser(id: string, organization: Organization): Promise<void> {
    const result = await this.memberActionsService.removeUser(organization, id);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async revokeUser(id: string, organization: Organization): Promise<void> {
    const result = await this.memberActionsService.revokeUser(organization, id);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async restoreUser(id: string, organization: Organization): Promise<void> {
    const result = await this.memberActionsService.restoreUser(organization, id);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async reinviteUser(id: string, organization: Organization): Promise<void> {
    const result = await this.memberActionsService.reinviteUser(organization, id);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async confirmUser(
    user: OrganizationUserView,
    publicKey: Uint8Array,
    organization: Organization,
  ): Promise<void> {
    const result = await this.memberActionsService.confirmUser(user, publicKey, organization);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async revoke(user: OrganizationUserView, organization: Organization) {
    const confirmed = await this.revokeUserConfirmationDialog(user);

    if (!confirmed) {
      return false;
    }

    this.actionPromise = this.revokeUser(user.id, organization);
    try {
      await this.actionPromise;
      this.toastService.showToast({
        variant: "success",
        message: this.i18nService.t("revokedUserId", this.userNamePipe.transform(user)),
      });
      await this.load(organization);
    } catch (e) {
      this.validationService.showError(e);
    }
    this.actionPromise = undefined;
  }

  async restore(user: OrganizationUserView, organization: Organization) {
    this.actionPromise = this.restoreUser(user.id, organization);
    try {
      await this.actionPromise;
      this.toastService.showToast({
        variant: "success",
        message: this.i18nService.t("restoredUserId", this.userNamePipe.transform(user)),
      });
      await this.load(organization);
    } catch (e) {
      this.validationService.showError(e);
    }
    this.actionPromise = undefined;
  }

  allowResetPassword(orgUser: OrganizationUserView, organization: Organization): boolean {
    return this.memberActionsService.allowResetPassword(
      orgUser,
      organization,
      this.orgResetPasswordPolicyEnabled,
    );
  }

  showEnrolledStatus(
    orgUser: OrganizationUserUserDetailsResponse,
    organization: Organization,
  ): boolean {
    return (
      organization.useResetPassword &&
      orgUser.resetPasswordEnrolled &&
      this.orgResetPasswordPolicyEnabled
    );
  }

  private async handleInviteDialog(organization: Organization) {
    const billingMetadata = await firstValueFrom(this.billingMetadata$);
    const dialog = openUserAddEditDialog(this.dialogService, {
      data: {
        kind: "Add",
        organizationId: organization.id,
        allOrganizationUserEmails: this.dataSource.data?.map((user) => user.email) ?? [],
        occupiedSeatCount: billingMetadata?.organizationOccupiedSeats ?? 0,
        isOnSecretsManagerStandalone: billingMetadata?.isOnSecretsManagerStandalone ?? false,
      },
    });

    const result = await lastValueFrom(dialog.closed);

    if (result === MemberDialogResult.Saved) {
      await this.load(organization);
    }
  }

  async invite(organization: Organization) {
    const billingMetadata = await firstValueFrom(this.billingMetadata$);
    const seatLimitResult = this.billingConstraint.checkSeatLimit(organization, billingMetadata);
    if (!(await this.billingConstraint.seatLimitReached(seatLimitResult, organization))) {
      await this.handleInviteDialog(organization);
      this.billingConstraint.refreshBillingMetadata();
    }
  }

  async edit(
    user: OrganizationUserView,
    organization: Organization,
    initialTab: MemberDialogTab = MemberDialogTab.Role,
  ) {
    const billingMetadata = await firstValueFrom(
      this.billingConstraint.getBillingMetadata$(organization.id),
    );
    const dialog = openUserAddEditDialog(this.dialogService, {
      data: {
        kind: "Edit",
        name: this.userNamePipe.transform(user),
        organizationId: organization.id,
        organizationUserId: user.id,
        usesKeyConnector: user.usesKeyConnector,
        isOnSecretsManagerStandalone: billingMetadata?.isOnSecretsManagerStandalone ?? false,
        initialTab: initialTab,
        managedByOrganization: user.managedByOrganization,
      },
    });

    const result = await lastValueFrom(dialog.closed);
    switch (result) {
      case MemberDialogResult.Deleted:
        this.dataSource.removeUser(user);
        break;
      case MemberDialogResult.Saved:
      case MemberDialogResult.Revoked:
      case MemberDialogResult.Restored:
        await this.load(organization);
        break;
    }
  }

  async bulkRemove(organization: Organization) {
    if (this.actionPromise != null) {
      return;
    }

    const dialogRef = BulkRemoveDialogComponent.open(this.dialogService, {
      data: {
        organizationId: organization.id,
        users: this.dataSource.getCheckedUsers(),
      },
    });
    await lastValueFrom(dialogRef.closed);
    await this.load(organization);
  }

  async bulkDelete(organization: Organization) {
    const warningAcknowledged = await firstValueFrom(
      this.deleteManagedMemberWarningService.warningAcknowledged(organization.id),
    );

    if (
      !warningAcknowledged &&
      organization.canManageUsers &&
      organization.productTierType === ProductTierType.Enterprise
    ) {
      const acknowledged = await this.deleteManagedMemberWarningService.showWarning();
      if (!acknowledged) {
        return;
      }
    }

    if (this.actionPromise != null) {
      return;
    }

    const dialogRef = BulkDeleteDialogComponent.open(this.dialogService, {
      data: {
        organizationId: organization.id,
        users: this.dataSource.getCheckedUsers(),
      },
    });
    await lastValueFrom(dialogRef.closed);
    await this.load(organization);
  }

  async bulkRevoke(organization: Organization) {
    await this.bulkRevokeOrRestore(true, organization);
  }

  async bulkRestore(organization: Organization) {
    await this.bulkRevokeOrRestore(false, organization);
  }

  async bulkRevokeOrRestore(isRevoking: boolean, organization: Organization) {
    if (this.actionPromise != null) {
      return;
    }

    const ref = BulkRestoreRevokeComponent.open(this.dialogService, {
      organizationId: organization.id,
      users: this.dataSource.getCheckedUsers(),
      isRevoking: isRevoking,
    });

    await firstValueFrom(ref.closed);
    await this.load(organization);
  }

  async bulkReinvite(organization: Organization) {
    if (this.actionPromise != null) {
      return;
    }

    const users = this.dataSource.getCheckedUsers();
    const filteredUsers = users.filter((u) => u.status === OrganizationUserStatusType.Invited);

    if (filteredUsers.length <= 0) {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("noSelectedUsersApplicable"),
      });
      return;
    }

    try {
      const result = await this.memberActionsService.bulkReinvite(
        organization,
        filteredUsers.map((user) => user.id),
      );

      if (!result.successful) {
        throw new Error();
      }

      // Bulk Status component open
      const dialogRef = BulkStatusComponent.open(this.dialogService, {
        data: {
          users: users,
          filteredUsers: filteredUsers,
          request: Promise.resolve(result.successful),
          successfulMessage: this.i18nService.t("bulkReinviteMessage"),
        },
      });
      await lastValueFrom(dialogRef.closed);
    } catch (e) {
      this.validationService.showError(e);
    }
    this.actionPromise = undefined;
  }

  async bulkConfirm(organization: Organization) {
    if (this.actionPromise != null) {
      return;
    }

    const dialogRef = BulkConfirmDialogComponent.open(this.dialogService, {
      data: {
        organization: organization,
        users: this.dataSource.getCheckedUsers(),
      },
    });

    await lastValueFrom(dialogRef.closed);
    await this.load(organization);
  }

  async bulkEnableSM(organization: Organization) {
    const users = this.dataSource.getCheckedUsers().filter((ou) => !ou.accessSecretsManager);

    if (users.length === 0) {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("noSelectedUsersApplicable"),
      });
      return;
    }

    const dialogRef = BulkEnableSecretsManagerDialogComponent.open(this.dialogService, {
      orgId: organization.id,
      users,
    });

    await lastValueFrom(dialogRef.closed);
    this.dataSource.uncheckAllUsers();
    await this.load(organization);
  }

  openEventsDialog(user: OrganizationUserView, organization: Organization) {
    openEntityEventsDialog(this.dialogService, {
      data: {
        name: this.userNamePipe.transform(user),
        organizationId: organization.id,
        entityId: user.id,
        showUser: false,
        entity: "user",
      },
    });
  }

  async resetPassword(user: OrganizationUserView, organization: Organization) {
    if (!user || !user.email || !user.id) {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("orgUserDetailsNotFound"),
      });
      this.logService.error("Org user details not found when attempting account recovery");

      return;
    }

    const dialogRef = AccountRecoveryDialogComponent.open(this.dialogService, {
      data: {
        name: this.userNamePipe.transform(user),
        email: user.email,
        organizationId: organization.id as OrganizationId,
        organizationUserId: user.id,
      },
    });

    const result = await lastValueFrom(dialogRef.closed);
    if (result === AccountRecoveryDialogResultType.Ok) {
      await this.load(organization);
    }

    return;
  }

  protected async removeUserConfirmationDialog(user: OrganizationUserView) {
    const content = user.usesKeyConnector
      ? "removeUserConfirmationKeyConnector"
      : "removeOrgUserConfirmation";

    const confirmed = await this.dialogService.openSimpleDialog({
      title: {
        key: "removeUserIdAccess",
        placeholders: [this.userNamePipe.transform(user)],
      },
      content: { key: content },
      type: "warning",
    });

    if (!confirmed) {
      return false;
    }

    if (user.status > OrganizationUserStatusType.Invited && user.hasMasterPassword === false) {
      return await this.noMasterPasswordConfirmationDialog(user);
    }

    return true;
  }

  protected async revokeUserConfirmationDialog(user: OrganizationUserView) {
    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "revokeAccess", placeholders: [this.userNamePipe.transform(user)] },
      content: this.i18nService.t("revokeUserConfirmation"),
      acceptButtonText: { key: "revokeAccess" },
      type: "warning",
    });

    if (!confirmed) {
      return false;
    }

    if (user.status > OrganizationUserStatusType.Invited && user.hasMasterPassword === false) {
      return await this.noMasterPasswordConfirmationDialog(user);
    }

    return true;
  }

  async deleteUser(user: OrganizationUserView, organization: Organization) {
    const warningAcknowledged = await firstValueFrom(
      this.deleteManagedMemberWarningService.warningAcknowledged(organization.id),
    );

    if (
      !warningAcknowledged &&
      organization.canManageUsers &&
      organization.productTierType === ProductTierType.Enterprise
    ) {
      const acknowledged = await this.deleteManagedMemberWarningService.showWarning();
      if (!acknowledged) {
        return false;
      }
    }

    const confirmed = await this.dialogService.openSimpleDialog({
      title: {
        key: "deleteOrganizationUser",
        placeholders: [this.userNamePipe.transform(user)],
      },
      content: {
        key: "deleteOrganizationUserWarningDesc",
        placeholders: [this.userNamePipe.transform(user)],
      },
      type: "warning",
      acceptButtonText: { key: "delete" },
      cancelButtonText: { key: "cancel" },
    });

    if (!confirmed) {
      return false;
    }

    await this.deleteManagedMemberWarningService.acknowledgeWarning(organization.id);

    this.actionPromise2 = this.memberActionsService.deleteUser(organization, user.id);
    try {
      const result = await this.actionPromise2;
      if (!result.success) {
        throw new Error(result.error);
      }
      this.toastService.showToast({
        variant: "success",
        message: this.i18nService.t("organizationUserDeleted", this.userNamePipe.transform(user)),
      });
      this.dataSource.removeUser(user);
    } catch (e) {
      this.validationService.showError(e);
    }
    this.actionPromise = undefined;
  }

  private async noMasterPasswordConfirmationDialog(user: OrganizationUserView) {
    return this.dialogService.openSimpleDialog({
      title: {
        key: "removeOrgUserNoMasterPasswordTitle",
      },
      content: {
        key: "removeOrgUserNoMasterPasswordDesc",
        placeholders: [this.userNamePipe.transform(user)],
      },
      type: "warning",
    });
  }

  get showBulkRestoreUsers(): boolean {
    return this.dataSource
      .getCheckedUsers()
      .every((member) => member.status == this.userStatusType.Revoked);
  }

  get showBulkRevokeUsers(): boolean {
    return this.dataSource
      .getCheckedUsers()
      .every((member) => member.status != this.userStatusType.Revoked);
  }

  get showBulkRemoveUsers(): boolean {
    return this.dataSource.getCheckedUsers().every((member) => !member.managedByOrganization);
  }

  get showBulkDeleteUsers(): boolean {
    const validStatuses = [
      this.userStatusType.Accepted,
      this.userStatusType.Confirmed,
      this.userStatusType.Revoked,
    ];

    return this.dataSource
      .getCheckedUsers()
      .every((member) => member.managedByOrganization && validStatuses.includes(member.status));
  }
}
