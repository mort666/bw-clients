import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { GENERATOR_DISK } from "@bitwarden/common/platform/state";
import { PublicClassifier } from "@bitwarden/common/tools/public-classifier";
import { ObjectKey } from "@bitwarden/common/tools/state/object-key";

import { PasswordRandomizer } from "../../engine";
import {
  PassphraseGeneratorOptionsEvaluator,
  passphraseLeastPrivilege,
  PassphrasePolicyConstraints,
} from "../../policies";
import {
  CredentialGenerator,
  CredentialGeneratorConfiguration,
  GeneratorDependencyProvider,
  PassphraseGenerationOptions,
  PassphraseGeneratorPolicy,
} from "../../types";
import { Algorithm, Category } from "../data";

const passphrase: CredentialGeneratorConfiguration<
  PassphraseGenerationOptions,
  PassphraseGeneratorPolicy
> = {
  id: Algorithm.passphrase,
  category: Category.password,
  nameKey: "passphrase",
  generateKey: "generatePassphrase",
  generatedValueKey: "passphrase",
  copyKey: "copyPassphrase",
  onlyOnRequest: false,
  request: [],
  engine: {
    create(
      dependencies: GeneratorDependencyProvider,
    ): CredentialGenerator<PassphraseGenerationOptions> {
      return new PasswordRandomizer(dependencies.randomizer);
    },
  },
  settings: {
    initial: {
      numWords: 6,
      wordSeparator: "-",
      capitalize: false,
      includeNumber: false,
    },
    constraints: {
      numWords: {
        min: 3,
        max: 20,
        recommendation: 6,
      },
      wordSeparator: { maxLength: 1 },
    },
    account: {
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
  },
  policy: {
    type: PolicyType.PasswordGenerator,
    disabledValue: {
      minNumberWords: 0,
      capitalize: false,
      includeNumber: false,
    },
    combine: passphraseLeastPrivilege,
    createEvaluator(policy) {
      return new PassphraseGeneratorOptionsEvaluator(policy);
    },
    toConstraints(policy) {
      return new PassphrasePolicyConstraints(policy, passphrase.settings.constraints);
    },
  },
};

export default passphrase;
