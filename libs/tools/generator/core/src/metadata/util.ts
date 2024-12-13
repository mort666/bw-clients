import { CategorizedAlgorithm } from "./data";
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
  return CategorizedAlgorithm.password.includes(algorithm as any);
}

/** Returns true when the input algorithm is a username algorithm. */
export function isUsernameAlgorithm(
  algorithm: CredentialAlgorithm,
): algorithm is UsernameAlgorithm {
  return CategorizedAlgorithm.username.includes(algorithm as any);
}

/** Returns true when the input algorithm is a forwarder integration. */
export function isForwarderIntegration(
  algorithm: CredentialAlgorithm,
): algorithm is ForwarderIntegration {
  return algorithm && typeof algorithm === "object" && "forwarder" in algorithm;
}

/** Returns true when the input algorithm is an email algorithm. */
export function isEmailAlgorithm(algorithm: CredentialAlgorithm): algorithm is EmailAlgorithm {
  return CategorizedAlgorithm.email.includes(algorithm as any) || isForwarderIntegration(algorithm);
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
