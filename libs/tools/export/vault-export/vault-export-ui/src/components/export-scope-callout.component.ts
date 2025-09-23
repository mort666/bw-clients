// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, Optional, effect, input } from "@angular/core";
import { Router } from "@angular/router";
import { firstValueFrom, map } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { ClientType } from "@bitwarden/common/enums";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { getById } from "@bitwarden/common/platform/misc/rxjs-operators";
import { CalloutModule } from "@bitwarden/components";

@Component({
  selector: "tools-export-scope-callout",
  templateUrl: "export-scope-callout.component.html",
  imports: [CommonModule, JslibModule, CalloutModule],
})
export class ExportScopeCalloutComponent {
  show = false;
  scopeConfig: {
    title: string;
    description: string;
    scopeIdentifier: string;
  };

  /* Optional OrganizationId, if not provided, it will display individual vault export message */
  readonly organizationId = input<string>();
  /* Optional export format, determines which individual export description to display */
  readonly exportFormat = input<string>();

  constructor(
    protected organizationService: OrganizationService,
    protected accountService: AccountService,
    private configService: ConfigService,
    private platformUtilsService: PlatformUtilsService,
    @Optional() private router?: Router,
  ) {
    effect(async () => {
      this.show = false;
      await this.getScopeMessage(this.organizationId(), this.exportFormat());
      this.show = true;
    });
  }

  private get isAdminConsoleContext(): boolean {
    const isWeb = this.platformUtilsService.getClientType?.() === ClientType.Web;
    if (!isWeb || !this.router) {
      return false;
    }
    try {
      const url = this.router.url ?? "";
      return url.includes("/organizations/");
    } catch {
      return false;
    }
  }

  private async getScopeMessage(organizationId: string, exportFormat: string): Promise<void> {
    const userId = await firstValueFrom(getUserId(this.accountService.activeAccount$));
    const enforceOrgDataOwnershipPolicyEnabled = await this.configService.getFeatureFlag(
      FeatureFlag.CreateDefaultLocation,
    );

    const orgExportDescription = enforceOrgDataOwnershipPolicyEnabled
      ? this.isAdminConsoleContext
        ? "exportingOrganizationVaultFromAdminConsoleWithDataOwnershipDesc"
        : "exportingOrganizationVaultFromPasswordManagerWithDataOwnershipDesc"
      : "exportingOrganizationVaultDesc";

    if (organizationId != null) {
      // exporting from organizational vault
      const org = await firstValueFrom(
        // TODO remove this after testing
        //this.organizationService.organizations$(userId).pipe(getOrganizationById(organizationId)),
        this.organizationService.organizations$(userId).pipe(getById(organizationId)),
      );

      this.scopeConfig = {
        title: "exportingOrganizationVaultTitle",
        description: orgExportDescription,
        scopeIdentifier: org?.name ?? "",
      };
    } else {
      this.scopeConfig = {
        // exporting from individual vault
        title: "exportingPersonalVaultTitle",
        description:
          exportFormat === "zip"
            ? "exportingIndividualVaultWithAttachmentsDescription"
            : "exportingIndividualVaultDescription",
        scopeIdentifier:
          (await firstValueFrom(this.accountService.activeAccount$.pipe(map((a) => a?.email)))) ??
          "",
      };
    }
  }
}
