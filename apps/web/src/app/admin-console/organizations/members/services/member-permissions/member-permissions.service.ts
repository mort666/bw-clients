import { Injectable } from "@angular/core";

import { OrganizationUserUserDetailsResponse } from "@bitwarden/admin-console/common";
import {
  OrganizationUserType,
  OrganizationUserStatusType,
} from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { ProductTierType } from "@bitwarden/common/billing/enums";

import { OrganizationUserView } from "../../../core/views/organization-user.view";

@Injectable()
export class MemberPermissionsService {
  canManageUsers(organization: Organization): boolean {
    return organization?.canManageUsers ?? false;
  }

  canUseSecretsManager(organization: Organization): boolean {
    return organization?.useSecretsManager ?? false;
  }

  showUserManagementControls(organization: Organization): boolean {
    return organization?.canManageUsers ?? false;
  }

  allowResetPassword(
    orgUser: OrganizationUserView,
    organization: Organization,
    resetPasswordPolicyEnabled: boolean,
  ): boolean {
    let callingUserHasPermission = false;

    switch (organization.type) {
      case OrganizationUserType.Owner:
        callingUserHasPermission = true;
        break;
      case OrganizationUserType.Admin:
        callingUserHasPermission = orgUser.type !== OrganizationUserType.Owner;
        break;
      case OrganizationUserType.Custom:
        callingUserHasPermission =
          orgUser.type !== OrganizationUserType.Owner &&
          orgUser.type !== OrganizationUserType.Admin;
        break;
    }

    return (
      organization.canManageUsersPassword &&
      callingUserHasPermission &&
      organization.useResetPassword &&
      organization.hasPublicAndPrivateKeys &&
      orgUser.resetPasswordEnrolled &&
      resetPasswordPolicyEnabled &&
      orgUser.status === OrganizationUserStatusType.Confirmed
    );
  }

  showEnrolledStatus(
    orgUser: OrganizationUserUserDetailsResponse,
    organization: Organization,
    resetPasswordPolicyEnabled: boolean,
  ): boolean {
    return (
      organization.useResetPassword && orgUser.resetPasswordEnrolled && resetPasswordPolicyEnabled
    );
  }

  canDeleteUser(user: OrganizationUserView): boolean {
    const validStatuses = [
      OrganizationUserStatusType.Accepted,
      OrganizationUserStatusType.Confirmed,
      OrganizationUserStatusType.Revoked,
    ];

    return user.managedByOrganization && validStatuses.includes(user.status);
  }

  canRemoveUser(user: OrganizationUserView): boolean {
    return !user.managedByOrganization;
  }

  canRevokeUser(user: OrganizationUserView): boolean {
    return user.status !== OrganizationUserStatusType.Revoked;
  }

  canRestoreUser(user: OrganizationUserView): boolean {
    return user.status === OrganizationUserStatusType.Revoked;
  }

  canReinviteUser(user: OrganizationUserView): boolean {
    return user.status === OrganizationUserStatusType.Invited;
  }

  canConfirmUser(user: OrganizationUserView): boolean {
    return user.status === OrganizationUserStatusType.Accepted;
  }

  requiresManagedUserWarning(organization: Organization): boolean {
    return (
      organization.canManageUsers && organization.productTierType === ProductTierType.Enterprise
    );
  }

  canEditUser(user: OrganizationUserView, organization: Organization): boolean {
    if (!organization.canManageUsers) {
      return false;
    }

    // Add additional permission checks as needed
    return true;
  }

  canViewEvents(user: OrganizationUserView, organization: Organization): boolean {
    return organization.useEvents && user.status === OrganizationUserStatusType.Confirmed;
  }

  canEnableSecretsManager(user: OrganizationUserView, organization: Organization): boolean {
    return organization.useSecretsManager && !user.accessSecretsManager;
  }

  getBulkActionPermissions(users: OrganizationUserView[]) {
    return {
      showBulkRemove: users.every((user) => this.canRemoveUser(user)),
      showBulkDelete: users.every((user) => this.canDeleteUser(user)),
      showBulkRevoke: users.every((user) => this.canRevokeUser(user)),
      showBulkRestore: users.every((user) => this.canRestoreUser(user)),
      showBulkReinvite: users.every((user) => this.canReinviteUser(user)),
      showBulkConfirm: users.every((user) => this.canConfirmUser(user)),
    };
  }

  shouldShowConfirmBanner(
    activeUserCount: number,
    confirmedUserCount: number,
    acceptedUserCount: number,
  ): boolean {
    return (
      activeUserCount > 1 &&
      confirmedUserCount > 0 &&
      confirmedUserCount < 3 &&
      acceptedUserCount > 0
    );
  }
}
