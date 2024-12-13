import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { GENERATOR_DISK } from "@bitwarden/common/platform/state";
import { PublicClassifier } from "@bitwarden/common/tools/public-classifier";
import { ObjectKey } from "@bitwarden/common/tools/state/object-key";

import { PasswordRandomizer } from "../../engine";
import {
  DynamicPasswordPolicyConstraints,
  PasswordGeneratorOptionsEvaluator,
  passwordLeastPrivilege,
} from "../../policies";
import {
  CredentialGenerator,
  CredentialGeneratorConfiguration,
  GeneratorDependencyProvider,
  PasswordGenerationOptions,
  PasswordGeneratorPolicy,
} from "../../types";
import { deepFreeze } from "../../util";
import { Algorithm, Category } from "../data";

const password: CredentialGeneratorConfiguration<
  PasswordGenerationOptions,
  PasswordGeneratorPolicy
> = deepFreeze({
  id: Algorithm.password,
  category: Category.password,
  nameKey: "password",
  generateKey: "generatePassword",
  generatedValueKey: "password",
  copyKey: "copyPassword",
  onlyOnRequest: false,
  request: [],
  engine: {
    create(
      dependencies: GeneratorDependencyProvider,
    ): CredentialGenerator<PasswordGenerationOptions> {
      return new PasswordRandomizer(dependencies.randomizer);
    },
  },
  settings: {
    initial: {
      length: 14,
      ambiguous: true,
      uppercase: true,
      minUppercase: 1,
      lowercase: true,
      minLowercase: 1,
      number: true,
      minNumber: 1,
      special: false,
      minSpecial: 0,
    },
    constraints: {
      length: {
        min: 5,
        max: 128,
        recommendation: 14,
      },
      minNumber: {
        min: 0,
        max: 9,
      },
      minSpecial: {
        min: 0,
        max: 9,
      },
    },
    account: {
      key: "passwordGeneratorSettings",
      target: "object",
      format: "plain",
      classifier: new PublicClassifier<PasswordGenerationOptions>([
        "length",
        "ambiguous",
        "uppercase",
        "minUppercase",
        "lowercase",
        "minLowercase",
        "number",
        "minNumber",
        "special",
        "minSpecial",
      ]),
      state: GENERATOR_DISK,
      initial: {
        length: 14,
        ambiguous: true,
        uppercase: true,
        minUppercase: 1,
        lowercase: true,
        minLowercase: 1,
        number: true,
        minNumber: 1,
        special: false,
        minSpecial: 0,
      },
      options: {
        deserializer(value) {
          return value;
        },
        clearOn: ["logout"],
      },
    } satisfies ObjectKey<PasswordGenerationOptions>,
  },
  policy: {
    type: PolicyType.PasswordGenerator,
    disabledValue: {
      minLength: 0,
      useUppercase: false,
      useLowercase: false,
      useNumbers: false,
      numberCount: 0,
      useSpecial: false,
      specialCount: 0,
    },
    combine: passwordLeastPrivilege,
    createEvaluator(policy) {
      return new PasswordGeneratorOptionsEvaluator(policy);
    },
    toConstraints(policy) {
      return new DynamicPasswordPolicyConstraints(policy, password.settings.constraints);
    },
  },
});

export default password;
