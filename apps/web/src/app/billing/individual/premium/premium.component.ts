// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Component } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, concatMap, firstValueFrom, from, Observable, of, switchMap } from "rxjs";
import { map, shareReplay } from "rxjs/operators";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { TokenService } from "@bitwarden/common/auth/abstractions/token.service";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions";
import { TaxServiceAbstraction } from "@bitwarden/common/billing/abstractions/tax.service.abstraction";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { SyncService } from "@bitwarden/common/platform/sync";
import { DialogService, ToastService } from "@bitwarden/components";

import { SubscriptionPricingService } from "../../services/subscription-pricing.service";
import {
  PersonalSubscriptionPricingTier,
  PersonalSubscriptionPricingTierIds,
} from "../../types/subscription-pricing-tier";
import { BitwardenSubscriber, mapAccountToSubscriber } from "../../types/bitwarden-subscriber";
import {
  UpgradePaymentDialogComponent,
  UpgradePaymentDialogResult,
} from "../upgrade/upgrade-payment-dialog/upgrade-payment-dialog.component";

@Component({
  templateUrl: "./premium.component.html",
  standalone: false,
})
export class PremiumComponent {
  protected hasPremiumFromAnyOrganization$: Observable<boolean>;
  protected hasPremiumPersonally$: Observable<boolean>;
  protected shouldShowNewDesign$: Observable<boolean>;
  protected personalPricingTiers$: Observable<PersonalSubscriptionPricingTier[]>;
  protected premiumCardData$: Observable<{
    tier: PersonalSubscriptionPricingTier | undefined;
    price: number;
    features: string[];
  }>;
  protected familiesCardData$: Observable<{
    tier: PersonalSubscriptionPricingTier | undefined;
    price: number;
    features: string[];
  }>;

  protected addOnFormGroup = new FormGroup({
    additionalStorage: new FormControl<number>(0, [Validators.min(0), Validators.max(99)]),
  });

  protected licenseFormGroup = new FormGroup({
    file: new FormControl<File>(null, [Validators.required]),
  });

  protected cloudWebVaultURL: string;
  protected isSelfHost = false;
  protected providerId: string;
  protected subscriber: BitwardenSubscriber;

  protected estimatedTax: number = 0;
  protected readonly familyPlanMaxUserCount = 6;

  constructor(
    private activatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private billingAccountProfileStateService: BillingAccountProfileStateService,
    private configService: ConfigService,
    private environmentService: EnvironmentService,
    private i18nService: I18nService,
    private platformUtilsService: PlatformUtilsService,
    private router: Router,
    private syncService: SyncService,
    private toastService: ToastService,
    private tokenService: TokenService,
    private taxService: TaxServiceAbstraction,
    private accountService: AccountService,
    private dialogService: DialogService,
    private subscriptionPricingService: SubscriptionPricingService,
  ) {
    this.isSelfHost = this.platformUtilsService.isSelfHost();

    this.hasPremiumFromAnyOrganization$ = this.accountService.activeAccount$.pipe(
      switchMap((account) =>
        this.billingAccountProfileStateService.hasPremiumFromAnyOrganization$(account.id),
      ),
    );

    this.hasPremiumPersonally$ = this.accountService.activeAccount$.pipe(
      switchMap((account) =>
        this.billingAccountProfileStateService.hasPremiumPersonally$(account.id),
      ),
    );

    this.accountService.activeAccount$
      .pipe(mapAccountToSubscriber, takeUntilDestroyed())
      .subscribe((subscriber) => {
        this.subscriber = subscriber;
      });

    this.shouldShowNewDesign$ = combineLatest([
      this.hasPremiumFromAnyOrganization$,
      this.hasPremiumPersonally$,
    ]).pipe(map(([hasOrgPremium, hasPersonalPremium]) => !hasOrgPremium && !hasPersonalPremium));

    this.personalPricingTiers$ =
      this.subscriptionPricingService.getPersonalSubscriptionPricingTiers$();

    this.premiumCardData$ = this.personalPricingTiers$.pipe(
      map((tiers) => {
        const tier = tiers.find((t) => t.id === "premium");
        return {
          tier,
          price:
            tier?.passwordManager.type === "standalone"
              ? Number((tier.passwordManager.annualPrice / 12).toFixed(2))
              : 0,
          features: tier?.passwordManager.features.map((f) => f.value) || [],
        };
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.familiesCardData$ = this.personalPricingTiers$.pipe(
      map((tiers) => {
        const tier = tiers.find((t) => t.id === "families");
        return {
          tier,
          price:
            tier?.passwordManager.type === "packaged"
              ? Number((tier.passwordManager.annualPrice / 12).toFixed(2))
              : 0,
          features: tier?.passwordManager.features.map((f) => f.value) || [],
        };
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    combineLatest([
      this.accountService.activeAccount$.pipe(
        switchMap((account) =>
          this.billingAccountProfileStateService.hasPremiumPersonally$(account.id),
        ),
      ),
      this.environmentService.cloudWebVaultUrl$,
    ])
      .pipe(
        takeUntilDestroyed(),
        concatMap(([hasPremiumPersonally, cloudWebVaultURL]) => {
          if (hasPremiumPersonally) {
            return from(this.navigateToSubscriptionPage());
          }

          this.cloudWebVaultURL = cloudWebVaultURL;
          return of(true);
        }),
      )
      .subscribe();

    this.activatedRoute.parent.parent.parent.params
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.providerId = params.providerId;
      });
  }

  finalizeUpgrade = async () => {
    await this.apiService.refreshIdentityToken();
    await this.syncService.fullSync(true);
  };

  postFinalizeUpgrade = async () => {
    this.toastService.showToast({
      variant: "success",
      title: null,
      message: this.i18nService.t("premiumUpdated"),
    });
    await this.navigateToSubscriptionPage();
  };

  navigateToSubscriptionPage = (): Promise<boolean> =>
    this.router.navigate(["../user-subscription"], { relativeTo: this.activatedRoute });

  onLicenseFileSelected = (event: Event): void => {
    const element = event.target as HTMLInputElement;
    this.licenseFormGroup.value.file = element.files.length > 0 ? element.files[0] : null;
  };

  submitPremiumLicense = async (): Promise<void> => {
    this.licenseFormGroup.markAllAsTouched();

    if (this.licenseFormGroup.invalid) {
      return this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("selectFile"),
      });
    }

    const emailVerified = await this.tokenService.getEmailVerified();
    if (!emailVerified) {
      return this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("verifyEmailFirst"),
      });
    }

    const formData = new FormData();
    formData.append("license", this.licenseFormGroup.value.file);

    await this.apiService.postAccountLicense(formData);
    await this.finalizeUpgrade();
    await this.postFinalizeUpgrade();
  };

  protected get premiumURL(): string {
    return `${this.cloudWebVaultURL}/#/settings/subscription/premium`;
  }

  protected async onLicenseFileSelectedChanged(): Promise<void> {
    await this.postFinalizeUpgrade();
  }

  protected async openUpgradeDialog(type: "Premium" | "Families"): Promise<void> {
    try {
      const planId =
        type === "Premium"
          ? PersonalSubscriptionPricingTierIds.Premium
          : PersonalSubscriptionPricingTierIds.Families;

      if (!this.subscriber) {
        throw new Error("No subscriber found");
      }

      const paymentDialogRef = UpgradePaymentDialogComponent.open(this.dialogService, {
        data: {
          plan: planId,
          subscriber: this.subscriber,
        },
      });

      const paymentResult = await firstValueFrom(paymentDialogRef.closed);
      await this.handleUpgradeResult(paymentResult, planId);
    } catch (error) {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("unexpectedError"),
      });
    }
  }

  private async handleUpgradeResult(
    result: UpgradePaymentDialogResult | null,
    plan: string,
  ): Promise<void> {
    if (!result) {
      return;
    }

    switch (result) {
      case "upgradedToPremium":
        await this.finalizeUpgrade();
        await this.postFinalizeUpgrade();
        break;
      case "upgradedToFamilies":
        this.toastService.showToast({
          variant: "success",
          title: null,
          message: this.i18nService.t("familiesUpgradeSuccess"),
        });
        // Navigate to the organizations page after successful families upgrade
        // Note: We would need the organization ID from the upgrade service to navigate properly
        break;
      case "back":
        // User went back, could re-open the account dialog
        break;
    }
  }

  // Helper methods for backward compatibility (if needed elsewhere)
  protected getPremiumTier(): Observable<PersonalSubscriptionPricingTier | undefined> {
    return this.premiumCardData$.pipe(map((data) => data.tier));
  }

  protected getFamiliesTier(): Observable<PersonalSubscriptionPricingTier | undefined> {
    return this.familiesCardData$.pipe(map((data) => data.tier));
  }

  protected getPremiumPrice(): Observable<number> {
    return this.premiumCardData$.pipe(map((data) => data.price));
  }

  protected getFamiliesPrice(): Observable<number> {
    return this.familiesCardData$.pipe(map((data) => data.price));
  }

  protected getPremiumFeatures(): Observable<string[]> {
    return this.premiumCardData$.pipe(map((data) => data.features));
  }

  protected getFamiliesFeatures(): Observable<string[]> {
    return this.familiesCardData$.pipe(map((data) => data.features));
  }
}
