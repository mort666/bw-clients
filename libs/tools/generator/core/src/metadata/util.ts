import {
  IntegrationId,
  IntegrationIds,
  IntegrationMetadata,
} from "@bitwarden/common/tools/integration";

import { AlgorithmsByType } from "./data";
import {
  CredentialAlgorithm,
  EmailAlgorithm,
  ForwarderIntegration,
  PasswordAlgorithm,
  UsernameAlgorithm,
} from "./type";

/** Returns true when the input algorithm is a password algorithm. */
export function isPasswordAlgorithm(
  algorithm: CredentialAlgorithm,
): algorithm is PasswordAlgorithm {
  return AlgorithmsByType.password.includes(algorithm as any);
}

/** Returns true when the input algorithm is a username algorithm. */
export function isUsernameAlgorithm(
  algorithm: CredentialAlgorithm,
): algorithm is UsernameAlgorithm {
  return AlgorithmsByType.username.includes(algorithm as any);
}

/** Returns true when the input algorithm is a forwarder integration. */
export function isForwarderIntegration(
  algorithm: CredentialAlgorithm,
): algorithm is ForwarderIntegration {
  return algorithm && typeof algorithm === "object" && "forwarder" in algorithm;
}

/** Returns true when the input algorithm is an email algorithm. */
export function isEmailAlgorithm(algorithm: CredentialAlgorithm): algorithm is EmailAlgorithm {
  return AlgorithmsByType.email.includes(algorithm as any) || isForwarderIntegration(algorithm);
}

export function isSameAlgorithm(lhs: CredentialAlgorithm, rhs: CredentialAlgorithm) {
  if (lhs === rhs) {
    return true;
  } else if (isForwarderIntegration(lhs) && isForwarderIntegration(rhs)) {
    return lhs.forwarder === rhs.forwarder;
  } else {
    return false;
  }
}

export function toForwarderIntegration(value: IntegrationMetadata): ForwarderIntegration;
export function toForwarderIntegration(value: IntegrationId): ForwarderIntegration;
export function toForwarderIntegration(
  value: IntegrationId | IntegrationMetadata,
): ForwarderIntegration {
  if (value == null) {
    throw new Error("`value` cannot be `null` or `undefined`");
  }

  let possibleId = undefined;
  if (typeof value === "string") {
    possibleId = value;
  } else if (typeof value === "object" && "id" in value) {
    possibleId = typeof value.id === "string" ? value.id : undefined;
  } else {
    throw new Error("Invalid `value` received.");
  }

  if (possibleId && IntegrationIds.includes(possibleId)) {
    return { forwarder: possibleId } satisfies ForwarderIntegration;
  } else {
    throw new Error("Invalid `value` received.");
  }
}
