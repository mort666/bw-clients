import {
  CredentialGenerator,
  GenerateRequest,
  GeneratedCredential,
  PassphraseGenerationOptions,
  PasswordGenerationOptions,
} from "../types";
import { optionsToEffWordListRequest, optionsToRandomAsciiRequest } from "../util";

import { EffWordListRequest, RandomAsciiRequest } from "./types";

/** Generation algorithms that produce randomized secrets */
export class SDKPasswordRandomizer
  implements
    CredentialGenerator<PassphraseGenerationOptions>,
    CredentialGenerator<PasswordGenerationOptions>
{
  /** Instantiates the password randomizer
   */
  constructor() {}

  /** create a password from ASCII codepoints
   *  @param request refines the generated password
   *  @returns a promise that completes with the generated password
   */
  async randomSDKAscii(request: RandomAsciiRequest) {
    // TODO
    return "";
  }

  /** create a passphrase from the EFF's "5 dice" word list
   *  @param request refines the generated passphrase
   * @returns a promise that completes with the generated passphrase
   */
  async randomSDKEffLongWords(request: EffWordListRequest) {
    // TODO

    return "";
  }

  generate(
    request: GenerateRequest,
    settings: PasswordGenerationOptions,
  ): Promise<GeneratedCredential>;
  generate(
    request: GenerateRequest,
    settings: PassphraseGenerationOptions,
  ): Promise<GeneratedCredential>;
  async generate(
    request: GenerateRequest,
    settings: PasswordGenerationOptions | PassphraseGenerationOptions,
  ) {
    if (isPasswordGenerationOptions(settings)) {
      const req = optionsToRandomAsciiRequest(settings);
      const password = await this.randomSDKAscii(req);

      return new GeneratedCredential(
        password,
        "password",
        Date.now(),
        request.source,
        request.website,
      );
    } else if (isPassphraseGenerationOptions(settings)) {
      const req = optionsToEffWordListRequest(settings);
      const passphrase = await this.randomSDKEffLongWords(req);

      return new GeneratedCredential(
        passphrase,
        "passphrase",
        Date.now(),
        request.source,
        request.website,
      );
    }

    throw new Error("Invalid settings received by generator.");
  }
}

function isPasswordGenerationOptions(settings: any): settings is PasswordGenerationOptions {
  return "length" in (settings ?? {});
}

function isPassphraseGenerationOptions(settings: any): settings is PassphraseGenerationOptions {
  return "numWords" in (settings ?? {});
}
