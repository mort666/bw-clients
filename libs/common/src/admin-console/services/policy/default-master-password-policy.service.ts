import {
  MasterPasswordPolicyServiceAbstraction
} from "@bitwarden/common/admin-console/abstractions/policy/master-password-policy.service.abstraction";
import {
  PolicyApiServiceAbstraction
} from "@bitwarden/common/admin-console/abstractions/policy/policy-api.service.abstraction";
import {
  MasterPasswordPolicyOptions
} from "@bitwarden/common/admin-console/models/domain/master-password-policy-options";
import { UserId } from "@bitwarden/common/types/guid";


export class DefaultMasterPasswordPolicyService implements MasterPasswordPolicyServiceAbstraction {

  constructor(
    private readonly policyApiService: PolicyApiServiceAbstraction,
  ) {
  }

  getByUserId(userId: UserId): Promise<MasterPasswordPolicyOptions> {
    //
    // const result = await this.policyApiService.getMasterPasswordPolicyOptsForOrgUser(userId);
    //
    // if (!result) {
    //   throw new Error("No policy found for user id.");
    // }
    //
    // return result;
    return new Promise<MasterPasswordPolicyOptions>((resolve, reject) => resolve(new MasterPasswordPolicyOptions()));
  }

  getForInvitedMember(inviteToken: string): Promise<MasterPasswordPolicyOptions> {
    return new Promise<MasterPasswordPolicyOptions>((resolve, reject) => resolve(new MasterPasswordPolicyOptions()));
  }

}
