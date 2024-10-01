import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { StateProvider } from "@bitwarden/common/platform/state";

import { GeneratorStrategy } from "../abstractions";
import { DefaultSshKeyGenerationOptions } from "../data/default-sshkey-generation-options";
import { SshKeyGenerator } from "../engine/sshkey-generator";
import { newDefaultEvaluator } from "../rx";
import { NoPolicy } from "../types";
import { SshKeyGenerationOptions } from "../types/sshkey-generation-options";
import { observe$PerUserId, sharedStateByUserId } from "../util";

import { SSHKEY_SETTINGS } from "./storage";

/** Generates passwords composed of random characters */
export class SshKeyGeneratorStrategy
  implements GeneratorStrategy<SshKeyGenerationOptions, NoPolicy>
{
  /**
   * Instantiates the generation strategy
   * @param sshkeyNativeGenerator generates an ssh private key in openssh format using a native implementation (sdk/desktop_native)
   * @param stateProvider provides durable state
   */
  constructor(
    private sshkeyGenerator: SshKeyGenerator,
    private stateProvider: StateProvider,
  ) {}

  policy: PolicyType = PolicyType.PasswordGenerator;
  toEvaluator = newDefaultEvaluator<SshKeyGenerationOptions>();

  // configuration
  durableState = sharedStateByUserId(SSHKEY_SETTINGS, this.stateProvider);
  defaults$ = observe$PerUserId(() => DefaultSshKeyGenerationOptions);

  async generate(options: SshKeyGenerationOptions): Promise<string> {
    const result = await this.sshkeyGenerator.generate({}, options);
    return result.credential;
  }
}
