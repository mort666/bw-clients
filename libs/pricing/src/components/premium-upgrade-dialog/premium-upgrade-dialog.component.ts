import { CdkTrapFocus } from "@angular/cdk/a11y";
import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { catchError, map, Observable, of, startWith } from "rxjs";

import { SubscriptionPricingServiceAbstraction } from "@bitwarden/common/billing/abstractions/subscription-pricing.service.abstraction";
import {
  PersonalSubscriptionPricingTier,
  PersonalSubscriptionPricingTierIds,
  SubscriptionCadenceIds,
} from "@bitwarden/common/billing/types/subscription-pricing-tier";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import {
  ButtonModule,
  ButtonType,
  DialogConfig,
  DialogModule,
  DialogRef,
  DialogService,
  IconButtonModule,
  ToastService,
  TypographyModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { PricingCardComponent } from "../pricing-card/pricing-card.component";

type CardDetails = {
  title: string;
  tagline: string;
  price: { amount: number; cadence: string };
  button: { text: string; type: ButtonType };
  features: string[];
};

@Component({
  selector: "billing-premium-upgrade-dialog",
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    IconButtonModule,
    TypographyModule,
    PricingCardComponent,
    CdkTrapFocus,
    I18nPipe,
  ],
  templateUrl: "./premium-upgrade-dialog.component.html",
})
export class PremiumUpgradeDialogComponent {
  protected cardDetails$: Observable<CardDetails | null> = this.subscriptionPricingService
    .getPersonalSubscriptionPricingTiers$()
    .pipe(
      map((tiers) => tiers.find((tier) => tier.id === PersonalSubscriptionPricingTierIds.Premium)),
      map((tier) => this.mapPremiumTierToCardDetails(tier!)),
      catchError((error: unknown) => {
        this.toastService.showToast({
          variant: "error",
          title: "",
          message: this.i18nService.t("unexpectedError"),
        });
        return of(null);
      }),
    );

  protected loading$: Observable<boolean> = this.cardDetails$.pipe(
    map(() => false),
    startWith(true),
  );

  constructor(
    private dialogRef: DialogRef,
    private subscriptionPricingService: SubscriptionPricingServiceAbstraction,
    private i18nService: I18nService,
    private toastService: ToastService,
  ) {}

  protected onUpgradeClick(): void {
    // todo: redirect to web vault upgrade path
    this.dialogRef.close();
  }

  protected onCloseClick(): void {
    this.dialogRef.close();
  }

  private mapPremiumTierToCardDetails(tier: PersonalSubscriptionPricingTier): CardDetails {
    return {
      title: tier.name,
      tagline: tier.description,
      price: {
        amount: tier.passwordManager.annualPrice / 12,
        cadence: SubscriptionCadenceIds.Monthly,
      },
      button: {
        text: this.i18nService.t("upgradeNow"),
        type: "primary",
      },
      features: tier.passwordManager.features.map((f: { key: string; value: string }) => f.value),
    };
  }

  /**
   * Opens the premium upgrade dialog.
   *
   * @param dialogService - The dialog service used to open the component
   * @param dialogConfig - Optional configuration for the dialog
   * @returns A dialog reference object
   */
  static open(dialogService: DialogService, dialogConfig?: DialogConfig<void>): DialogRef<void> {
    return dialogService.open(PremiumUpgradeDialogComponent, dialogConfig);
  }
}
