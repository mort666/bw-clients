import {
  PassphraseGenerationOptions,
  PassphraseGeneratorPolicy,
  PasswordGenerationOptions,
  PasswordGeneratorPolicy,
  PolicyConfiguration,
} from "../types";
import { SshKeyGenerationOptions } from "../types/sshkey-generation-options";
import { SshKeyGeneratorPolicy } from "../types/sshkey-generator-policy";

import { Generators } from "./generators";

/** Policy configurations
 *  @deprecated use Generator.*.policy instead
 */
export const Policies = Object.freeze({
  Passphrase: Generators.passphrase.policy,
  Password: Generators.password.policy,
  SshKey: Generators.sshKey.policy,
} satisfies {
  /** Passphrase policy configuration */
  Passphrase: PolicyConfiguration<PassphraseGeneratorPolicy, PassphraseGenerationOptions>;

  /** Password policy configuration */
  Password: PolicyConfiguration<PasswordGeneratorPolicy, PasswordGenerationOptions>;

  SshKey: PolicyConfiguration<SshKeyGeneratorPolicy, SshKeyGenerationOptions>;
});
