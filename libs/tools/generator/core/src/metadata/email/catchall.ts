import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Policy } from "@bitwarden/common/admin-console/models/domain/policy";
import { GENERATOR_DISK } from "@bitwarden/common/platform/state";
import { PublicClassifier } from "@bitwarden/common/tools/public-classifier";

import { EmailRandomizer } from "../../engine";
import { CatchallConstraints } from "../../policies/catchall-constraints";
import {
  CatchallGenerationOptions,
  CredentialGenerator,
  GeneratorDependencyProvider,
  NoPolicy,
} from "../../types";
import { deepFreeze } from "../../util";
import { Algorithm, Type } from "../data";
import { GeneratorMetadata } from "../generator-metadata";

const catchall: GeneratorMetadata<CatchallGenerationOptions, NoPolicy> = deepFreeze({
  id: Algorithm.catchall,
  category: Type.email,
  i18nKeys: {
    name: "catchallEmail",
    description: "catchallEmailDesc",
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
    ): CredentialGenerator<CatchallGenerationOptions> {
      return new EmailRandomizer(dependencies.randomizer);
    },
  },
  options: {
    constraints: { catchallDomain: { minLength: 1 } },
    account: {
      storage: {
        key: "catchallGeneratorSettings",
        target: "object",
        format: "plain",
        classifier: new PublicClassifier<CatchallGenerationOptions>([
          "catchallType",
          "catchallDomain",
        ]),
        state: GENERATOR_DISK,
        initial: {
          catchallType: "random",
          catchallDomain: "",
        },
        options: {
          deserializer: (value) => value,
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
      return new CatchallConstraints(email);
    },
  },
});

export default catchall;
