import { OpaqueSessionId } from "@bitwarden/common/types/guid";

export class LoginFinishRequest {
  constructor(
    readonly loginSessionId: OpaqueSessionId,
    readonly clientLoginFinishResult: string,
  ) {}
}
