import { Component, Inject, signal, viewChild } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { ManageTaxInformationComponent } from "@bitwarden/angular/billing/components";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import { OrganizationCreateRequest } from "@bitwarden/common/admin-console/models/request/organization-create.request";
import { OrganizationKeysRequest } from "@bitwarden/common/admin-console/models/request/organization-keys.request";
import { ProviderOrganizationCreateRequest } from "@bitwarden/common/admin-console/models/request/provider/provider-organization-create.request";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { TaxServiceAbstraction } from "@bitwarden/common/billing/abstractions/tax.service.abstraction";
import { PlanType, PlanInterval } from "@bitwarden/common/billing/enums";
import { TaxInformation } from "@bitwarden/common/billing/models/domain/tax-information";
import { PreviewIndividualInvoiceRequest } from "@bitwarden/common/billing/models/request/preview-individual-invoice.request";
import { PreviewOrganizationInvoiceRequest } from "@bitwarden/common/billing/models/request/preview-organization-invoice.request";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { SyncService } from "@bitwarden/common/platform/sync";
import { OrgKey } from "@bitwarden/common/types/key";
import { DIALOG_DATA, DialogRef, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

import { SubscriptionPricingService } from "../../services/subscription-pricing.service";
import { PaymentComponent } from "../../shared/payment/payment.component";
import { PricingSummaryData } from "../../shared/pricing-summary/pricing-summary.component";
import { PersonalSubscriptionPricingTierIds } from "../../types/subscription-pricing-tier";

export interface UpgradeDialogResult {
  success: boolean;
  orgId?: string;
}

@Component({
  templateUrl: "./upgrade-dialog.component.html",
  standalone: false,
})
export class UpgradeDialogComponent {
  paymentComponent = viewChild(PaymentComponent);
  taxInfoComponent = viewChild(ManageTaxInformationComponent);

  protected totalOpened = signal(false);
  protected pricingSummaryData = signal<PricingSummaryData | null>(null);

  protected estimatedTax: number = 0;
  protected taxInformation: TaxInformation;

  upgradeForm = this.formBuilder.group({
    organisationName: ["", [Validators.required]],
  });

  constructor(
    @Inject(DIALOG_DATA)
    public data: { type: "Premium" | "Families"; price: number; providerId: string },
    private dialogRef: DialogRef<UpgradeDialogResult>,
    private apiService: ApiService,
    private i18nService: I18nService,
    private syncService: SyncService,
    private toastService: ToastService,
    private taxService: TaxServiceAbstraction,
    private formBuilder: FormBuilder,
    private keyService: KeyService,
    private encryptService: EncryptService,
    private organizationApiService: OrganizationApiServiceAbstraction,
    private accountService: AccountService,
    private subscriptionPricingService: SubscriptionPricingService,
  ) {
    // Initialize pricing summary for both Premium and Families plans
    void this.initializePricingSummary();
  }

  submit = async () => {
    if (this.data.type === "Premium") {
      await this.upgradeToPremium();
    } else {
      await this.upgradeToFamilies();
    }
  };

  private upgradeToPremium = async (): Promise<void> => {
    if (this.taxInfoComponent() !== undefined && !this.taxInfoComponent().validate()) {
      this.taxInfoComponent().markAllAsTouched();
      return;
    }

    try {
      const { type, token } = await this.paymentComponent().tokenize();

      const formData = new FormData();
      formData.append("paymentMethodType", type.toString());
      formData.append("paymentToken", token);
      formData.append("country", this.taxInfoComponent().getTaxInformation().country);
      formData.append("postalCode", this.taxInfoComponent().getTaxInformation().postalCode);

      await this.apiService.postPremium(formData);
      await this.finalizeUpgrade();

      this.toastService.showToast({
        variant: "success",
        title: null,
        message: this.i18nService.t("premiumUpdated"),
      });

      this.dialogRef.close({ success: true });
    } catch (error) {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: error.message,
      });
    }
  };

  private async upgradeToFamilies(): Promise<void> {
    const activeUserId = await firstValueFrom(getUserId(this.accountService.activeAccount$));
    const activeAccount = await firstValueFrom(this.accountService.activeAccount$);
    const orgKey = await this.keyService.makeOrgKey<OrgKey>(activeUserId);
    const key = orgKey[0].encryptedString;
    const collection = await this.encryptService.encryptString(
      this.i18nService.t("defaultCollection"),
      orgKey[1],
    );
    const collectionCt = collection.encryptedString;
    const orgKeys = await this.keyService.makeKeyPair(orgKey[1]);

    const request = new OrganizationCreateRequest();
    request.key = key;
    request.collectionName = collectionCt;
    request.name = this.upgradeForm.controls.organisationName.value;
    request.billingEmail = activeAccount.email;
    request.initiationPath = "New organization creation in-product";
    request.keys = new OrganizationKeysRequest(orgKeys[0], orgKeys[1].encryptedString);

    const { type, token } = await this.paymentComponent().tokenize();

    request.paymentToken = token;
    request.paymentMethodType = type;
    request.additionalSeats = 0;
    request.additionalStorageGb = 0;
    request.premiumAccessAddon = false;
    request.planType = PlanType.FamiliesAnnually;
    request.billingAddressPostalCode = this.taxInformation?.postalCode;
    request.billingAddressCountry = this.taxInformation?.country;
    request.taxIdNumber = this.taxInformation?.taxId;
    request.billingAddressLine1 = this.taxInformation?.line1;
    request.billingAddressLine2 = this.taxInformation?.line2;
    request.billingAddressCity = this.taxInformation?.city;
    request.billingAddressState = this.taxInformation?.state;
    request.additionalSeats = 0;
    request.additionalServiceAccounts = 0;

    let organisationId: string;

    if (this.data.providerId) {
      const providerRequest = new ProviderOrganizationCreateRequest("", request);
      const providerKey = await this.keyService.getProviderKey(this.data.providerId);
      providerRequest.organizationCreateRequest.key = (
        await this.encryptService.wrapSymmetricKey(orgKey[1], providerKey)
      ).encryptedString;
      const orgId = (
        await this.apiService.postProviderCreateOrganization(this.data.providerId, providerRequest)
      ).organizationId;

      organisationId = orgId;
    } else {
      organisationId = (await this.organizationApiService.create(request)).id;
    }
    if (organisationId) {
      this.dialogRef.close({ success: true, orgId: organisationId });
    }
  }

  private async finalizeUpgrade(): Promise<void> {
    await this.apiService.refreshIdentityToken();
    await this.syncService.fullSync(true);
  }

  protected get total(): number {
    return this.data.price + this.estimatedTax;
  }

  protected get dialogTitle(): string {
    return this.data.type === "Premium" ? "upgradeToPremium" : "upgradeToFamilies";
  }

  /**
   * Initialize pricing summary for both Premium and Families plans using real data
   */
  private async initializePricingSummary(): Promise<void> {
    const personalTiers = await firstValueFrom(
      this.subscriptionPricingService.getPersonalSubscriptionPricingTiers$(),
    );
    const tierId =
      this.data.type === "Premium"
        ? PersonalSubscriptionPricingTierIds.Premium
        : PersonalSubscriptionPricingTierIds.Families;
    const tier = personalTiers.find((t) => t.id === tierId);

    if (!tier) {
      return;
    }

    const isPremium = this.data.type === "Premium";
    const isFamilies = this.data.type === "Families";

    const pricingSummaryData: PricingSummaryData = {
      selectedPlanInterval: "year",
      selectedInterval: PlanInterval.Annually,

      passwordManagerSeats:
        isFamilies && tier.passwordManager.type === "packaged" ? tier.passwordManager.users : 1,
      passwordManagerSeatTotal: tier.passwordManager.annualPrice,
      passwordManagerSubtotal: tier.passwordManager.annualPrice,

      secretsManagerSeatTotal: 0,
      additionalStorageTotal: 0,
      additionalStoragePriceMonthly: tier.passwordManager.annualPricePerAdditionalStorageGB || 0,
      additionalServiceAccountTotal: 0,
      totalAppliedDiscount: 0,
      secretsManagerSubtotal: 0,

      total: this.data.price,
      estimatedTax: this.estimatedTax,
      totalOpened: this.totalOpened(),

      selectedPlan: {
        isAnnual: true,
        PasswordManager: isPremium
          ? {
              basePrice: tier.passwordManager.annualPrice,
              baseSeats: 1,
              seatPrice: 0,
              hasAdditionalSeatsOption: false,
              additionalStoragePricePerGb:
                tier.passwordManager.annualPricePerAdditionalStorageGB || 0,
              hasAdditionalStorageOption: true,
            }
          : {
              basePrice: 0,
              baseSeats: 0,
              seatPrice:
                tier.passwordManager.type === "packaged"
                  ? tier.passwordManager.annualPrice / tier.passwordManager.users
                  : tier.passwordManager.annualPrice,
              hasAdditionalSeatsOption: true,
              additionalStoragePricePerGb:
                tier.passwordManager.annualPricePerAdditionalStorageGB || 0,
              hasAdditionalStorageOption: true,
            },
      } as any,

      organization: { useSecretsManager: false } as any,

      customPasswordManagerTitle: isPremium ? "Premium" : undefined,
    };

    this.pricingSummaryData.set(pricingSummaryData);
  }

  /**
   * Update tax information in pricing summary
   */
  private updatePricingSummaryTax(): void {
    const currentData = this.pricingSummaryData();
    if (currentData) {
      const updatedData: PricingSummaryData = {
        ...currentData,
        estimatedTax: this.estimatedTax,
        total: this.data.price + this.estimatedTax,
        totalOpened: this.totalOpened(),
      };
      this.pricingSummaryData.set(updatedData);
    }
  }

  private refreshSalesTax(): void {
    const { country, postalCode } = this.taxInfoComponent().getTaxInformation();
    if (!country || !postalCode) {
      return;
    }

    let request: PreviewIndividualInvoiceRequest | PreviewOrganizationInvoiceRequest;

    if (this.data.type === "Premium") {
      request = {
        passwordManager: {
          additionalStorage: 0,
        },
        taxInformation: {
          postalCode,
          country,
        },
      };
    } else {
      request = {
        passwordManager: {
          additionalStorage: 0,
          plan: PlanType.FamiliesAnnually,
          seats: 0,
        },
        taxInformation: {
          postalCode,
          country,
        },
      };
    }

    this.taxService
      .previewIndividualInvoice(request)
      .then((invoice) => {
        this.estimatedTax = invoice.taxAmount;
        this.updatePricingSummaryTax();
      })
      .catch((error) => {
        this.toastService.showToast({
          title: this.i18nService.t("errorOccurred"),
          variant: "error",
          message:
            this.i18nService.t("taxCalculationError") || this.i18nService.t("unexpectedError"),
        });
      });
  }

  protected taxInformationChanged(event: TaxInformation): void {
    this.taxInformation = event;
    this.refreshSalesTax();
  }

  close(): void {
    this.dialogRef.close({ success: false });
  }
}
