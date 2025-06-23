import { MasterPasswordPolicyOptions } from "@bitwarden/common/admin-console/models/domain/master-password-policy-options";
import { UserId } from "@bitwarden/common/types/guid";

export abstract class MasterPasswordPolicyServiceAbstraction {
  /**
   * Used for a logged-in user is changing their password. Would probably be deprecated once
   * PolicyService is refactored.
   */
  abstract getByUserId: (loggedInUserId: UserId) => Promise<MasterPasswordPolicyOptions>;

  /**
   * Used to evaluate compliance before accepting an invite.
   */
  abstract getForInvitedMember: (inviteToken: string) => Promise<MasterPasswordPolicyOptions>;

  /**
   * Used when resetting a grantor's password during an emergency access takeover.
   */
  abstract getForEmergencyAccessGrantor: (grantorUserId: UserId) => MasterPasswordPolicyOptions;

  /**
   * Used when resetting a member's password during an account recovery. Gets the master
   * password policy options for the user who is having their account reset. This makes sure
   * that an admin is keeping the user in compliance with the users whose password
   * they are setting and not using the policies that they are a part of.
   */
  abstract getForAccountRecoveryMember: (userId: UserId) => Promise<MasterPasswordPolicyOptions>;
}
