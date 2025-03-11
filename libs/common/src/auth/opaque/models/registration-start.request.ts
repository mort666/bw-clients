import { CipherConfiguration } from "./cipher-configuration";

export class RegistrationStartRequest {
  constructor(
    readonly clientRegistrationStartResult: string,
    readonly cipherConfiguration: CipherConfiguration,
  ) {}
}
