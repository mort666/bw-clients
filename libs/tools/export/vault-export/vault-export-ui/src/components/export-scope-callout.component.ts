import { CommonModule } from "@angular/common";
import { Component, Optional, input } from "@angular/core";
import { toObservable, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import {
  combineLatest,
  defer,
  distinctUntilChanged,
  from,
  map,
  of,
  shareReplay,
  filter,
  switchMap,
} from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums/policy-type.enum";
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
  scopeConfig!: {
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
    private policyService: PolicyService,
    @Optional() private router?: Router,
  ) {
    const organizationId$ = toObservable(this.organizationId).pipe(distinctUntilChanged());
    const exportFormat$ = toObservable(this.exportFormat).pipe(distinctUntilChanged());

    const activeAccount$ = this.accountService.activeAccount$;
    const userId$ = activeAccount$.pipe(getUserId);
    const email$ = activeAccount$.pipe(
      map((a) => a?.email ?? ""),
      distinctUntilChanged(),
    );

    const defaultLocationFlag$ = defer(() =>
      from(this.configService.getFeatureFlag(FeatureFlag.CreateDefaultLocation)),
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    const orgDataOwnershipEnforced$ = userId$.pipe(
      switchMap((userId) =>
        userId == null
          ? of(false)
          : this.policyService.policyAppliesToUser$(PolicyType.OrganizationDataOwnership, userId),
      ),
    );

    combineLatest({
      organizationId: organizationId$,
      exportFormat: exportFormat$,
      userId: userId$,
      email: email$,
      defaultLocationFlagEnabled: defaultLocationFlag$,
      hasOwnership: orgDataOwnershipEnforced$,
    })
      .pipe(
        // organizationId is null for an individual vault export which actually doesn't require a userId (in the code below)
        // if organizationId is set, userId is required to get the org name for the organizational export
        filter(({ organizationId, userId }) => organizationId == null || userId != null),
        switchMap(
          ({
            organizationId,
            exportFormat,
            userId,
            email,
            defaultLocationFlagEnabled,
            hasOwnership,
          }) => {
            const orgExportDescription =
              defaultLocationFlagEnabled && hasOwnership
                ? this.isAdminConsoleContext
                  ? "exportingOrganizationVaultFromAdminConsoleWithDataOwnershipDesc"
                  : "exportingOrganizationVaultFromPasswordManagerWithDataOwnershipDesc"
                : "exportingOrganizationVaultDesc";

            if (organizationId != null) {
              // exporting from organizational vault
              return this.organizationService.organizations$(userId).pipe(
                getById(organizationId),
                map((org) => ({
                  title: "exportingOrganizationVaultTitle",
                  description: orgExportDescription,
                  scopeIdentifier: org?.name ?? "",
                })),
              );
            }

            // exporting from individual vault
            const description =
              exportFormat === "zip"
                ? "exportingIndividualVaultWithAttachmentsDescription"
                : "exportingIndividualVaultDescription";

            return of({
              title: "exportingPersonalVaultTitle",
              description,
              scopeIdentifier: email,
            });
          },
        ),
        takeUntilDestroyed(),
      )
      .subscribe((cfg) => {
        this.scopeConfig = cfg;
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
}
