import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Policy as AdminPolicy } from "@bitwarden/common/admin-console/models/domain/policy";
import { ObjectKey } from "@bitwarden/common/tools/state/object-key";
import { Constraints } from "@bitwarden/common/tools/types";

import { CredentialGenerator, GeneratorConstraints, GeneratorDependencyProvider } from "../types";

import { AlgorithmMetadata } from "./algorithm-metadata";
import { Purpose } from "./data";

/** Extends the algorithm metadata with storage and engine configurations.
 * @example
 *   // Use `isForwarderIntegration(algorithm: CredentialAlgorithm)`
 *   // to pattern test whether the credential describes a forwarder algorithm
 *   const meta : CredentialGeneratorInfo = // ...
 *   const { forwarder } = isForwarderIntegration(meta.id) ? credentialId : {};
 */
export type GeneratorMetadata<Options, Policy> = AlgorithmMetadata & {
  /** An algorithm that generates credentials when ran. */
  engine: {
    /** Factory for the generator
     */
    create: (randomizer: GeneratorDependencyProvider) => CredentialGenerator<Options>;
  };

  /** Defines parameters for credential generation */
  options: {
    /** global constraints; these apply to *all* generators */
    constraints: Constraints<Options>;

    /** account-local generator options */
    [Purpose.account]: {
      /** plaintext import buffer */
      import?: ObjectKey<Options, Record<string, never>, Options> & { format: "plain" };

      /** persistent storage location */
      storage: ObjectKey<Options>;

      /** policy enforced when saving the options */
      policy: {
        /** policy administration storage location for the policy */
        type: PolicyType;

        /** The value of the policy when it is not in effect. */
        disabledValue: Policy;
      };
    };
  };

  policy: {
    /** Combines multiple policies set by the administrative console into
     *  a single policy.
     */
    combine: (acc: Policy, policy: AdminPolicy) => Policy;

    /** Converts policy service data into actionable policy constraints.
     *
     *  @param policy - the policy to map into policy constraints.
     *  @param email - the default email to extend.
     *
     * @remarks this version includes constraints needed for the reactive forms;
     *  it was introduced so that the constraints can be incrementally introduced
     *  as the new UI is built.
     */
    toConstraints: (policy: Policy, email: string) => GeneratorConstraints<Options>;
  };
};
