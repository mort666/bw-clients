import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { GENERATOR_DISK } from "@bitwarden/common/platform/state";
import { PublicClassifier } from "@bitwarden/common/tools/public-classifier";
import { ObjectKey } from "@bitwarden/common/tools/state/object-key";

import { PasswordRandomizer } from "../../engine";
import { passphraseLeastPrivilege, PassphrasePolicyConstraints } from "../../policies";
import {
  CredentialGenerator,
  GeneratorDependencyProvider,
  PassphraseGenerationOptions,
  PassphraseGeneratorPolicy,
} from "../../types";
import { Algorithm, Purpose, Type } from "../data";
import { GeneratorMetadata } from "../generator-metadata";

const passphrase: GeneratorMetadata<PassphraseGenerationOptions, PassphraseGeneratorPolicy> = {
  id: Algorithm.passphrase,
  category: Type.password,
  i18nKeys: {
    name: "passphrase",
    generateCredential: "generatePassphrase",
    credentialGenerated: "passphrase",
    copyCredential: "copyPassphrase",
  },
  capabilities: {
    autogenerate: false,
    fields: [],
  },
  engine: {
    create(
      dependencies: GeneratorDependencyProvider,
    ): CredentialGenerator<PassphraseGenerationOptions> {
      return new PasswordRandomizer(dependencies.randomizer);
    },
  },
  options: {
    constraints: {
      numWords: {
        min: 3,
        max: 20,
        recommendation: 6,
      },
      wordSeparator: { maxLength: 1 },
    },
    [Purpose.account]: {
      storage: {
        key: "passphraseGeneratorSettings",
        target: "object",
        format: "plain",
        classifier: new PublicClassifier<PassphraseGenerationOptions>([
          "numWords",
          "wordSeparator",
          "capitalize",
          "includeNumber",
        ]),
        state: GENERATOR_DISK,
        initial: {
          numWords: 6,
          wordSeparator: "-",
          capitalize: false,
          includeNumber: false,
        },
        options: {
          deserializer(value) {
            return value;
          },
          clearOn: ["logout"],
        },
      } satisfies ObjectKey<PassphraseGenerationOptions>,
      policy: {
        type: PolicyType.PasswordGenerator,
        disabledValue: {
          minNumberWords: 0,
          capitalize: false,
          includeNumber: false,
        },
      },
    },
  },
  policy: {
    combine: passphraseLeastPrivilege,
    toConstraints(policy) {
      return new PassphrasePolicyConstraints(policy, passphrase.options.constraints);
    },
  },
};

export default passphrase;
