import { inject } from "@angular/core";

import { OrganizationUserApiService } from "@bitwarden/admin-console/common";
import {
  DefaultSetPasswordJitService,
  SetPasswordCredentials,
  SetPasswordJitService,
} from "@bitwarden/auth/angular";
import { InternalUserDecryptionOptionsServiceAbstraction } from "@bitwarden/auth/common";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import { MasterPasswordApiService } from "@bitwarden/common/auth/abstractions/master-password-api.service.abstraction";
import { OrganizationInviteService } from "@bitwarden/common/auth/services/organization-invite/organization-invite.service";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/key-management/master-password/abstractions/master-password.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { KdfConfigService, KeyService } from "@bitwarden/key-management";

import { RouterService } from "../../../../core/router.service";

export class WebSetPasswordJitService
  extends DefaultSetPasswordJitService
  implements SetPasswordJitService
{
  routerService = inject(RouterService);
  constructor(
    protected encryptService: EncryptService,
    protected i18nService: I18nService,
    protected kdfConfigService: KdfConfigService,
    protected keyService: KeyService,
    protected masterPasswordApiService: MasterPasswordApiService,
    protected masterPasswordService: InternalMasterPasswordServiceAbstraction,
    protected organizationApiService: OrganizationApiServiceAbstraction,
    protected organizationUserApiService: OrganizationUserApiService,
    protected userDecryptionOptionsService: InternalUserDecryptionOptionsServiceAbstraction,
    private organizationInviteService: OrganizationInviteService,
  ) {
    super(
      encryptService,
      i18nService,
      kdfConfigService,
      keyService,
      masterPasswordApiService,
      masterPasswordService,
      organizationApiService,
      organizationUserApiService,
      userDecryptionOptionsService,
    );
  }

  override async setPassword(credentials: SetPasswordCredentials) {
    await super.setPassword(credentials);

    // SSO JIT accepts org invites when setting their MP, meaning
    // we can clear the deep linked url for accepting it.
    await this.routerService.getAndClearLoginRedirectUrl();
    await this.organizationInviteService.clearOrganizationInvitation();
  }
}
