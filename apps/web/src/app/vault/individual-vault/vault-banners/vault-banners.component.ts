import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Observable } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/services/i18n.service";
import { BannerModule } from "@bitwarden/components";

import { VerifyEmailComponent } from "../../../auth/settings/verify-email.component";
import { SharedModule } from "../../../shared";
import { OrganizationPaymentStatus } from "../vault.component";

import { VaultBannersService, VisibleVaultBanner } from "./services/vault-banners.service";

@Component({
  standalone: true,
  selector: "app-vault-banners",
  templateUrl: "./vault-banners.component.html",
  imports: [VerifyEmailComponent, SharedModule, BannerModule],
  providers: [VaultBannersService],
})
export class VaultBannersComponent implements OnInit {
  visibleBanners: VisibleVaultBanner[] = [];
  premiumBannerVisible$: Observable<boolean>;
  VisibleVaultBanner = VisibleVaultBanner;
  @Input() organizationsPaymentStatus: OrganizationPaymentStatus[] = [];

  constructor(
    private vaultBannerService: VaultBannersService,
    private router: Router,
    private i18nService: I18nService,
  ) {
    this.premiumBannerVisible$ = this.vaultBannerService.shouldShowPremiumBanner$;
  }

  async ngOnInit(): Promise<void> {
    await this.determineVisibleBanners();
  }

  async dismissBanner(banner: VisibleVaultBanner): Promise<void> {
    await this.vaultBannerService.dismissBanner(banner);

    await this.determineVisibleBanners();
  }

  async navigateToPaymentMethod(organizationId: string): Promise<void> {
    const navigationExtras = {
      state: { launchPaymentModalAutomatically: true },
    };

    await this.router.navigate(
      ["organizations", organizationId, "billing", "payment-method"],
      navigationExtras,
    );
  }

  /** Determine which banners should be present */
  private async determineVisibleBanners(): Promise<void> {
    const showBrowserOutdated = await this.vaultBannerService.shouldShowUpdateBrowserBanner();
    const showVerifyEmail = await this.vaultBannerService.shouldShowVerifyEmailBanner();
    const showLowKdf = await this.vaultBannerService.shouldShowLowKDFBanner();

    this.visibleBanners = [
      showBrowserOutdated ? VisibleVaultBanner.OutdatedBrowser : null,
      showVerifyEmail ? VisibleVaultBanner.VerifyEmail : null,
      showLowKdf ? VisibleVaultBanner.KDFSettings : null,
    ].filter(Boolean); // remove all falsy values, i.e. null
  }

  getTrialStatusMessage(organization: OrganizationPaymentStatus) {
    return organization?.trialRemainingDays >= 2
      ? this.i18nService.t(
          "freeTrialEndPromptAboveTwoDays",
          organization?.orgName,
          organization?.trialRemainingDays.toString(),
        )
      : organization?.trialRemainingDays == 1
        ? this.i18nService.t("freeTrialEndPromptForOneDay", organization?.orgName)
        : this.i18nService.t("freeTrialEndPromptForLessThanADay", organization?.orgName);
  }

  trackBy(index: number) {
    return index;
  }
}
