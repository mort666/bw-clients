import { RotateableKeySet } from "@bitwarden/auth/common";

export class RegistrationFinishRequest {
  constructor(
    readonly clientRegistrationFinishResult: string,
    readonly keySet: RotateableKeySet,
  ) {}
}
