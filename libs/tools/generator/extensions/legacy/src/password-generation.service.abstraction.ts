import { Observable } from "rxjs";

import { PasswordGeneratorPolicyOptions } from "@bitwarden/common/admin-console/models/domain/password-generator-policy-options";
import { GeneratedPasswordHistory } from "@bitwarden/generator-history";

import { PasswordGeneratorOptions } from "./password-generator-options";

/** @deprecated Use {@link GeneratorService} with a password or passphrase {@link GeneratorStrategy} instead. */
export abstract class PasswordGenerationServiceAbstraction {
  abstract generatePassword(options: PasswordGeneratorOptions): Promise<string>;
  abstract generatePassphrase(options: PasswordGeneratorOptions): Promise<string>;
  abstract getOptions(): Promise<[PasswordGeneratorOptions, PasswordGeneratorPolicyOptions]>;
  abstract getOptions$(): Observable<[PasswordGeneratorOptions, PasswordGeneratorPolicyOptions]>;
  abstract enforcePasswordGeneratorPoliciesOnOptions(
    options: PasswordGeneratorOptions,
  ): Promise<[PasswordGeneratorOptions, PasswordGeneratorPolicyOptions]>;
  abstract saveOptions(options: PasswordGeneratorOptions): Promise<void>;
  abstract getHistory(): Promise<GeneratedPasswordHistory[]>;
  abstract addHistory(password: string): Promise<void>;
  abstract clear(userId?: string): Promise<GeneratedPasswordHistory[]>;
}
