import { DefaultLoginComponentService, LoginComponentService } from "@bitwarden/auth/angular";

import { flagEnabled } from "../../../platform/flags"; // TODO-rr-bw: do I need a client specific `flagEnabled()` fn?

export class ExtensionLoginComponentService
  extends DefaultLoginComponentService
  implements LoginComponentService
{
  isLoginViaAuthRequestSupported(): boolean {
    return flagEnabled("showPasswordless");
  }
}
