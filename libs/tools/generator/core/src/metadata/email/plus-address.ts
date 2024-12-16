import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";
import { GENERATOR_DISK } from "@bitwarden/common/platform/state";
import { PublicClassifier } from "@bitwarden/common/tools/public-classifier";

import { EmailRandomizer } from "../../engine";
import { SubaddressConstraints } from "../../policies/subaddress-constraints";
import {
  CredentialGenerator,
  GeneratorDependencyProvider,
  NoPolicy,
  SubaddressGenerationOptions,
} from "../../types";
import { deepFreeze } from "../../util";
import { Algorithm, Purpose, Type } from "../data";
import { GeneratorMetadata } from "../generator-metadata";

const plusAddress: GeneratorMetadata<SubaddressGenerationOptions, NoPolicy> = deepFreeze({
  id: Algorithm.plusAddress,
  category: Type.email,
  i18nKeys: {
    name: "plusAddressedEmail",
    description: "plusAddressedEmailDesc",
    generateCredential: "generateEmail",
    credentialGenerated: "email",
    copyCredential: "copyEmail",
  },
  capabilities: {
    autogenerate: true,
    fields: [],
  },
  engine: {
    create(
      dependencies: GeneratorDependencyProvider,
    ): CredentialGenerator<SubaddressGenerationOptions> {
      return new EmailRandomizer(dependencies.randomizer);
    },
  },
  options: {
    constraints: {},
    [Purpose.account]: {
      storage: {
        key: "subaddressGeneratorSettings",
        target: "object",
        format: "plain",
        classifier: new PublicClassifier<SubaddressGenerationOptions>([
          "subaddressType",
          "subaddressEmail",
        ]),
        state: GENERATOR_DISK,
        initial: {
          subaddressType: "random",
          subaddressEmail: "",
        },
        options: {
          deserializer(value) {
            return value;
          },
          clearOn: ["logout"],
        },
      },
      policy: {
        type: PolicyType.PasswordGenerator,
        disabledValue: {},
      },
    },
  },

  policy: {
    combine(_acc: NoPolicy, _policy: Policy) {
      return {};
    },
    toConstraints(_policy: NoPolicy, email: string) {
      return new SubaddressConstraints(email);
    },
  },
});

export default plusAddress;
