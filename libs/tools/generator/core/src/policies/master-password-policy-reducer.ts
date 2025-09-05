import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";

import { PasswordGeneratorPolicy } from "../types";

export function masterPasswordReducer(acc: PasswordGeneratorPolicy, policy: Policy) {
  if (policy.type !== PolicyType.MasterPassword || !policy.enabled) {
    return acc;
  }
  return {
    minLength: Math.max(acc.minLength, policy.data.minLength ?? acc.minLength),
    useUppercase: policy.data.requireUpper || acc.useUppercase,
    useLowercase: policy.data.requireLower || acc.useLowercase,
    useNumbers: policy.data.requireNumbers || acc.useNumbers,
    numberCount: acc.numberCount,
    useSpecial: policy.data.requireSpecial || acc.useSpecial,
    specialCount: acc.specialCount,
  };
}
