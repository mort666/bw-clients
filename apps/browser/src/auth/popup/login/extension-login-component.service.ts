import { DefaultLoginComponentService, LoginComponentService } from "@bitwarden/auth/angular";
import { ClientType } from "@bitwarden/common/enums";

import { flagEnabled } from "../../../platform/flags";

export class ExtensionLoginComponentService
  extends DefaultLoginComponentService
  implements LoginComponentService
{
  clientType = ClientType.Browser;
  isLoginViaAuthRequestSupported(): boolean {
    return flagEnabled("showPasswordless");
  }
}
