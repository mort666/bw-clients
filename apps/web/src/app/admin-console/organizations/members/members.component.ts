import { Component, computed, Signal } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import {
  combineLatest,
  concatMap,
  filter,
  firstValueFrom,
  map,
  merge,
  Observable,
  shareReplay,
  switchMap,
  take,
} from "rxjs";

import { OrganizationUserUserDetailsResponse } from "@bitwarden/admin-console/common";
import { UserNamePipe } from "@bitwarden/angular/pipes/user-name.pipe";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationManagementPreferencesService } from "@bitwarden/common/admin-console/abstractions/organization-management-preferences/organization-management-preferences.service";
import {
  OrganizationUserStatusType,
  OrganizationUserType,
} from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { OrganizationBillingMetadataResponse } from "@bitwarden/common/billing/models/response/organization-billing-metadata.response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { ValidationService } from "@bitwarden/common/platform/abstractions/validation.service";
import { DialogService, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";
import { OrganizationWarningsService } from "@bitwarden/web-vault/app/billing/organizations/warnings/services";

import { BaseMembersComponent } from "../../common/base-members.component";
import { PeopleTableDataSource } from "../../common/people-table-data-source";
import { OrganizationUserView } from "../core/views/organization-user.view";

import { AccountRecoveryDialogResultType } from "./components/account-recovery/account-recovery-dialog.component";
import { MemberDialogResult, MemberDialogTab } from "./components/member-dialog";
import {
  BillingConstraintService,
  MemberDialogManagerService,
  OrganizationMembersService,
} from "./services";
import { DeleteManagedMemberWarningService } from "./services/delete-managed-member/delete-managed-member-warning.service";
import { MemberActionsService } from "./services/member-actions/member-actions.service";

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
  protected billingMetadata$: Observable<OrganizationBillingMetadataResponse>;

  // Fixed sizes used for cdkVirtualScroll
  protected rowHeight = 66;
  protected rowHeightClass = `tw-h-[66px]`;

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
    private route: ActivatedRoute,
    protected deleteManagedMemberWarningService: DeleteManagedMemberWarningService,
    private organizationWarningsService: OrganizationWarningsService,
    private memberActionsService: MemberActionsService,
    private memberDialogManager: MemberDialogManagerService,
    protected billingConstraint: BillingConstraintService,
    protected memberService: OrganizationMembersService,
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

    const memberState$ = this.route.params.pipe(
      switchMap((params) => this.memberService.getMemberState(params.organizationId)),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );

    const organization$ = memberState$.pipe(
      map((state) => state.organization),
      filter((organization): organization is Organization => organization != null),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );

    this.organization = toSignal(organization$);

    combineLatest([this.route.queryParams, memberState$])
      .pipe(
        concatMap(async ([qParams, memberState]) => {
          // Backfill pub/priv key if necessary
          try {
            await this.memberActionsService.ensureOrganizationKeys(memberState.organization!);
          } catch {
            throw new Error(this.i18nService.t("resetPasswordOrgKeysError"));
          }

          this.orgResetPasswordPolicyEnabled = memberState.resetPasswordPolicyEnabled;

          await this.load(memberState.organization!);

          this.searchControl.setValue(qParams.search);

          if (qParams.viewEvents != null) {
            const user = this.dataSource.data.filter((u) => u.id === qParams.viewEvents);
            if (user.length > 0 && user[0].status === OrganizationUserStatusType.Confirmed) {
              this.openEventsDialog(user[0], memberState.organization!);
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
    await super.load(organization);
  }

  async getUsers(organization: Organization): Promise<OrganizationUserView[]> {
    return await this.memberService.loadUsers(organization);
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
    const allUserEmails = this.dataSource.data?.map((user) => user.email) ?? [];

    const result = await this.memberDialogManager.openInviteDialog(
      organization,
      billingMetadata,
      allUserEmails,
    );

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

    const result = await this.memberDialogManager.openEditDialog(
      user,
      organization,
      billingMetadata,
      initialTab,
    );

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

    await this.memberDialogManager.openBulkRemoveDialog(
      organization,
      this.dataSource.getCheckedUsers(),
    );
    await this.load(organization);
  }

  async bulkDelete(organization: Organization) {
    if (this.actionPromise != null) {
      return;
    }

    await this.memberDialogManager.openBulkDeleteDialog(
      organization,
      this.dataSource.getCheckedUsers(),
    );
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

    await this.memberDialogManager.openBulkRestoreRevokeDialog(
      organization,
      this.dataSource.getCheckedUsers(),
      isRevoking,
    );
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
      await this.memberDialogManager.openBulkStatusDialog(
        users,
        filteredUsers,
        Promise.resolve(result.successful),
        this.i18nService.t("bulkReinviteMessage"),
      );
    } catch (e) {
      this.validationService.showError(e);
    }
    this.actionPromise = undefined;
  }

  async bulkConfirm(organization: Organization) {
    if (this.actionPromise != null) {
      return;
    }

    await this.memberDialogManager.openBulkConfirmDialog(
      organization,
      this.dataSource.getCheckedUsers(),
    );
    await this.load(organization);
  }

  async bulkEnableSM(organization: Organization) {
    const users = this.dataSource.getCheckedUsers();

    await this.memberDialogManager.openBulkEnableSecretsManagerDialog(organization, users);

    this.dataSource.uncheckAllUsers();
    await this.load(organization);
  }

  openEventsDialog(user: OrganizationUserView, organization: Organization) {
    this.memberDialogManager.openEventsDialog(user, organization);
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

    const result = await this.memberDialogManager.openAccountRecoveryDialog(user, organization);
    if (result === AccountRecoveryDialogResultType.Ok) {
      await this.load(organization);
    }

    return;
  }

  protected async removeUserConfirmationDialog(user: OrganizationUserView) {
    return await this.memberDialogManager.openRemoveUserConfirmationDialog(user);
  }

  protected async revokeUserConfirmationDialog(user: OrganizationUserView) {
    return await this.memberDialogManager.openRevokeUserConfirmationDialog(user);
  }

  async deleteUser(user: OrganizationUserView, organization: Organization) {
    const confirmed = await this.memberDialogManager.openDeleteUserConfirmationDialog(
      user,
      organization,
    );

    if (!confirmed) {
      return false;
    }

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
