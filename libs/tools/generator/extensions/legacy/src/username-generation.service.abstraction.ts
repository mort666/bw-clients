import { Observable } from "rxjs";

import { UsernameGeneratorOptions } from "./username-generation-options";

/** @deprecated Use {@link GeneratorService} with a username {@link GeneratorStrategy} instead. */
export abstract class UsernameGenerationServiceAbstraction {
  abstract generateUsername(options: UsernameGeneratorOptions): Promise<string>;
  abstract generateWord(options: UsernameGeneratorOptions): Promise<string>;
  abstract generateSubaddress(options: UsernameGeneratorOptions): Promise<string>;
  abstract generateCatchall(options: UsernameGeneratorOptions): Promise<string>;
  abstract generateForwarded(options: UsernameGeneratorOptions): Promise<string>;
  abstract getOptions(): Promise<UsernameGeneratorOptions>;
  abstract getOptions$(): Observable<UsernameGeneratorOptions>;
  abstract saveOptions(options: UsernameGeneratorOptions): Promise<void>;
}
