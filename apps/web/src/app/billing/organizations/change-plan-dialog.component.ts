// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { firstValueFrom, map, Subject, switchMap, takeUntil } from "rxjs";

import { ManageTaxInformationComponent } from "@bitwarden/angular/billing/components";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import {
  getOrganizationById,
  OrganizationService,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { OrganizationKeysRequest } from "@bitwarden/common/admin-console/models/request/organization-keys.request";
import { OrganizationUpgradeRequest } from "@bitwarden/common/admin-console/models/request/organization-upgrade.request";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import {
  BillingApiServiceAbstraction,
  BillingInformation,
  OrganizationBillingServiceAbstraction as OrganizationBillingService,
  OrganizationInformation,
  PaymentInformation,
  PlanInformation,
} from "@bitwarden/common/billing/abstractions";
import { TaxServiceAbstraction } from "@bitwarden/common/billing/abstractions/tax.service.abstraction";
import {
  PaymentMethodType,
  PlanInterval,
  PlanType,
  ProductTierType,
} from "@bitwarden/common/billing/enums";
import { TaxInformation } from "@bitwarden/common/billing/models/domain";
import { ExpandedTaxInfoUpdateRequest } from "@bitwarden/common/billing/models/request/expanded-tax-info-update.request";
import { PreviewOrganizationInvoiceRequest } from "@bitwarden/common/billing/models/request/preview-organization-invoice.request";
import { UpdatePaymentMethodRequest } from "@bitwarden/common/billing/models/request/update-payment-method.request";
import { BillingResponse } from "@bitwarden/common/billing/models/response/billing.response";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { PaymentSourceResponse } from "@bitwarden/common/billing/models/response/payment-source.response";
import { PlanResponse } from "@bitwarden/common/billing/models/response/plan.response";
import { ListResponse } from "@bitwarden/common/models/response/list.response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import {
  DIALOG_DATA,
  DialogConfig,
  DialogRef,
  DialogService,
  ToastService,
} from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

import { BillingNotificationService } from "../services/billing-notification.service";
import { PlanCardService } from "../services/plan-card.service";
import { PricingSummaryService } from "../services/pricing-summary.service";
import { BillingSharedModule } from "../shared/billing-shared.module";
import { PaymentComponent } from "../shared/payment/payment.component";
import { PlanCard } from "../shared/plan-card/plan-card.component";
import { PricingSummaryData } from "../shared/pricing-summary/pricing-summary.component";

type ChangePlanDialogParams = {
  organizationId: string;
  subscription: OrganizationSubscriptionResponse;
  productTierType: ProductTierType;
};

// FIXME: update to use a const object instead of a typescript enum
// eslint-disable-next-line @bitwarden/platform/no-enums
export enum ChangePlanDialogResultType {
  Closed = "closed",
  Submitted = "submitted",
}

// PlanCardState enum removed - plan card styling is now handled by app-plan-card component

export const openChangePlanDialog = (
  dialogService: DialogService,
  dialogConfig: DialogConfig<ChangePlanDialogParams>,
) =>
  dialogService.open<ChangePlanDialogResultType, ChangePlanDialogParams>(
    ChangePlanDialogComponent,
    dialogConfig,
  );

type PlanCardLegacy = {
  name: string;
  selected: boolean;
};

interface OnSuccessArgs {
  organizationId: string;
}

@Component({
  templateUrl: "./change-plan-dialog.component.html",
  imports: [BillingSharedModule],
})
export class ChangePlanDialogComponent implements OnInit, OnDestroy {
  @ViewChild(PaymentComponent) paymentComponent: PaymentComponent;
  @ViewChild(ManageTaxInformationComponent) taxComponent: ManageTaxInformationComponent;

  @Input() acceptingSponsorship = false;
  @Input() organizationId: string;
  @Input() showFree = false;
  @Input() showCancel = false;

  @Input()
  get productTier(): ProductTierType {
    return this._productTier;
  }

  set productTier(product: ProductTierType) {
    this._productTier = product;
    this.formGroup?.controls?.productTier?.setValue(product);
  }

  private _productTier = ProductTierType.Free;

  @Input()
  get plan(): PlanType {
    return this._plan;
  }

  set plan(plan: PlanType) {
    this._plan = plan;
    this.formGroup?.controls?.plan?.setValue(plan);
  }

  private _plan = PlanType.Free;
  @Input() providerId?: string;
  @Output() onSuccess = new EventEmitter<OnSuccessArgs>();
  @Output() onCanceled = new EventEmitter<void>();
  @Output() onTrialBillingSuccess = new EventEmitter();

  protected discountPercentage: number = 20;
  protected discountPercentageFromSub: number;
  protected loading = true;
  protected planCards: PlanCardLegacy[];
  protected upgradePlanCards: PlanCard[] = [];
  protected ResultType = ChangePlanDialogResultType;

  selfHosted = false;
  productTypes = ProductTierType;
  formPromise: Promise<string>;
  singleOrgPolicyAppliesToActiveUser = false;
  isInTrialFlow = false;
  discount = 0;

  formGroup = this.formBuilder.group({
    name: [""],
    billingEmail: ["", [Validators.email]],
    businessOwned: [false],
    premiumAccessAddon: [false],
    additionalSeats: [0, [Validators.min(0), Validators.max(100000)]],
    clientOwnerEmail: ["", [Validators.email]],
    plan: [this.plan],
    productTier: [this.productTier],
    // planInterval: [1],
  });

  planType: string;
  selectedPlan: PlanResponse;
  selectedInterval: number = 1;
  planIntervals = PlanInterval;
  passwordManagerPlans: PlanResponse[];
  secretsManagerPlans: PlanResponse[];
  organization: Organization;
  sub: OrganizationSubscriptionResponse;
  billing: BillingResponse;
  dialogHeaderName: string;
  currentPlanName: string;
  showPayment: boolean = false;
  currentPlan: PlanResponse;
  isCardStateDisabled = false;
  focusedIndex: number | null = null;
  accountCredit: number;
  paymentSource?: PaymentSourceResponse;
  plans: ListResponse<PlanResponse>;
  isSubscriptionCanceled: boolean = false;
  secretsManagerTotal: number;
  pricingSummaryData: PricingSummaryData;

  private destroy$ = new Subject<void>();
  private planSelectionDebounceTimer: any;

  protected taxInformation: TaxInformation;

  constructor(
    @Inject(DIALOG_DATA) private dialogParams: ChangePlanDialogParams,
    private dialogRef: DialogRef<ChangePlanDialogResultType>,
    private toastService: ToastService,
    private apiService: ApiService,
    private i18nService: I18nService,
    private keyService: KeyService,
    private router: Router,
    private syncService: SyncService,
    private policyService: PolicyService,
    private organizationService: OrganizationService,
    private messagingService: MessagingService,
    private formBuilder: FormBuilder,
    private organizationApiService: OrganizationApiServiceAbstraction,
    private billingApiService: BillingApiServiceAbstraction,
    private taxService: TaxServiceAbstraction,
    private accountService: AccountService,
    private organizationBillingService: OrganizationBillingService,
    private billingNotificationService: BillingNotificationService,
    private pricingSummaryService: PricingSummaryService,
    private planCardService: PlanCardService,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.dialogParams.organizationId) {
      this.currentPlanName = this.resolvePlanName(this.dialogParams.productTierType);
      this.sub =
        this.dialogParams.subscription ??
        (await this.organizationApiService.getSubscription(this.dialogParams.organizationId));
      this.dialogHeaderName = this.resolveHeaderName(this.sub);
      this.organizationId = this.dialogParams.organizationId;
      this.currentPlan = this.sub?.plan;
      // Don't set selectedPlan here - let the upgrade card logic choose Enterprise by default
      const userId = await firstValueFrom(
        this.accountService.activeAccount$.pipe(map((a) => a?.id)),
      );
      this.organization = await firstValueFrom(
        this.organizationService
          .organizations$(userId)
          .pipe(getOrganizationById(this.organizationId)),
      );
      if (this.sub?.subscription?.status !== "canceled") {
        try {
          const { accountCredit, paymentSource } =
            await this.billingApiService.getOrganizationPaymentMethod(this.organizationId);
          this.accountCredit = accountCredit;
          this.paymentSource = paymentSource;
        } catch (error) {
          this.billingNotificationService.handleError(error);
        }
      }
    }

    if (!this.selfHosted) {
      this.plans = await this.apiService.getPlans();
      this.passwordManagerPlans = this.plans.data.filter((plan) => !!plan.PasswordManager);
      this.secretsManagerPlans = this.plans.data.filter((plan) => !!plan.SecretsManager);

      if (
        this.productTier === ProductTierType.Enterprise ||
        this.productTier === ProductTierType.Teams
      ) {
        this.formGroup.controls.businessOwned.setValue(true);
      }
    }

    if (this.currentPlan && this.currentPlan.productTier !== ProductTierType.Enterprise) {
      const upgradedPlan = this.passwordManagerPlans.find((plan) =>
        this.currentPlan.productTier === ProductTierType.Free
          ? plan.type === PlanType.FamiliesAnnually
          : plan.upgradeSortOrder == this.currentPlan.upgradeSortOrder + 1,
      );

      this.plan = upgradedPlan.type;
      this.productTier = upgradedPlan.productTier;
    }
    this.upgradeFlowPrefillForm();

    this.accountService.activeAccount$
      .pipe(
        getUserId,
        switchMap((userId) =>
          this.policyService.policyAppliesToUser$(PolicyType.SingleOrg, userId),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((policyAppliesToActiveUser) => {
        this.singleOrgPolicyAppliesToActiveUser = policyAppliesToActiveUser;
      });

    if (!this.selfHosted) {
      this.changedProduct();
    }

    this.planCards = [
      {
        name: this.i18nService.t("planNameTeams"),
        selected: true,
      },
      {
        name: this.i18nService.t("planNameEnterprise"),
        selected: false,
      },
    ];
    this.discountPercentageFromSub = this.isSecretsManagerTrial()
      ? 0
      : (this.sub?.customerDiscount?.percentOff ?? 0);

    // Initialize upgrade plan cards first
    await this.initializeUpgradePlanCards();

    // Initial plan selection is now handled in initializeUpgradePlanCards()
    // No need for additional logic here

    this.loading = false;

    const taxInfo = await this.organizationApiService.getTaxInfo(this.organizationId);
    this.taxInformation = TaxInformation.from(taxInfo);

    // Initialize pricing summary data
    await this.updatePricingSummaryData();

    if (!this.isSubscriptionCanceled) {
      this.refreshSalesTax();
    }
  }

  resolveHeaderName(subscription: OrganizationSubscriptionResponse): string {
    if (subscription.subscription != null) {
      this.isSubscriptionCanceled =
        subscription.subscription.cancelled && this.sub?.plan.productTier !== ProductTierType.Free;
      if (this.isSubscriptionCanceled) {
        return this.i18nService.t("restartSubscription");
      }
    }

    return this.i18nService.t(
      "upgradeFreeOrganization",
      this.resolvePlanName(this.dialogParams.productTierType),
    );
  }

  // These methods are no longer needed since we use upgradePlanCards from the service
  // The Enterprise plan selection is now handled in initializeUpgradePlanCards()

  isPaymentSourceEmpty() {
    return this.paymentSource === null || this.paymentSource === undefined;
  }

  isSecretsManagerTrial(): boolean {
    return (
      this.sub?.subscription?.items?.some((item) =>
        this.sub?.customerDiscount?.appliesTo?.includes(item.productId),
      ) ?? false
    );
  }

  planTypeChanged() {
    // Find Enterprise plan from upgradePlanCards instead
    const enterprisePlan = this.upgradePlanCards.find(
      (card) => card.planResponse?.productTier === ProductTierType.Enterprise,
    );
    if (enterprisePlan?.planResponse) {
      this.selectPlan(enterprisePlan.planResponse);
    }
  }

  updateInterval(event: number) {
    this.selectedInterval = event;
    this.planTypeChanged();

    // Debounce API calls when changing intervals too
    this.debouncePlanSelection();
    void this.updateUpgradePlanCardsOnIntervalChange();
  }

  protected getPlanIntervals() {
    return [
      {
        name: PlanInterval[PlanInterval.Annually],
        value: PlanInterval.Annually,
      },
      {
        name: PlanInterval[PlanInterval.Monthly],
        value: PlanInterval.Monthly,
      },
    ];
  }

  optimizedNgForRender(index: number) {
    return index;
  }

  // getPlanCardContainerClasses method removed - plan card styling is now handled by app-plan-card component

  protected selectPlan(plan: PlanResponse) {
    if (!plan) {
      return;
    }

    if (
      this.selectedInterval === PlanInterval.Monthly &&
      plan.productTier == ProductTierType.Families
    ) {
      return;
    }

    if (plan === this.currentPlan && !this.isSubscriptionCanceled) {
      return;
    }

    this.selectedPlan = plan;
    this.formGroup.patchValue({ productTier: plan.productTier });

    // Debounce the API calls to prevent rate limiting
    this.debouncePlanSelection();
  }

  private debouncePlanSelection(): void {
    // Clear any existing timer
    if (this.planSelectionDebounceTimer) {
      clearTimeout(this.planSelectionDebounceTimer);
    }

    // Set a new timer to delay API calls
    this.planSelectionDebounceTimer = setTimeout(() => {
      try {
        this.refreshSalesTax();
      } catch {
        void this.updatePricingSummaryData();
      }
    }, 500); // 500ms delay to prevent rapid API calls
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up any pending debounce timer
    if (this.planSelectionDebounceTimer) {
      clearTimeout(this.planSelectionDebounceTimer);
    }
  }

  get upgradeRequiresPaymentMethod() {
    const isFreeTier = this.organization?.productTierType === ProductTierType.Free;
    const shouldHideFree = !this.showFree;
    const hasNoPaymentSource = !this.paymentSource;

    return isFreeTier && shouldHideFree && hasNoPaymentSource;
  }

  get selectedSecretsManagerPlan() {
    let planResponse: PlanResponse;
    if (this.secretsManagerPlans) {
      return this.secretsManagerPlans.find((plan) => plan.type === this.selectedPlan.type);
    }
    return planResponse;
  }

  get selectedPlanInterval() {
    if (this.isSubscriptionCanceled) {
      return this.currentPlan?.isAnnual ? "year" : "month";
    }
    return this.selectedPlan?.isAnnual ? "year" : "month";
  }

  // selectableProducts and selectablePlans getters removed -
  // This logic is now handled by PlanCardService.getUpgradePlanCards()

  get storageGb() {
    return this.sub?.maxStorageGb ? this.sub?.maxStorageGb - 1 : 0;
  }

  get passwordManagerSeats() {
    if (!this.selectedPlan) {
      return 0;
    }

    if (this.selectedPlan.productTier === ProductTierType.Families) {
      return this.selectedPlan.PasswordManager.baseSeats;
    }
    return this.sub?.seats;
  }

  get teamsStarterPlanIsAvailable() {
    return this.passwordManagerPlans?.some((plan) => plan.type === PlanType.TeamsStarter) || false;
  }

  get additionalServiceAccount() {
    if (!this.currentPlan || !this.currentPlan.SecretsManager) {
      return 0;
    }

    const baseServiceAccount = this.currentPlan.SecretsManager?.baseServiceAccount || 0;
    const usedServiceAccounts = this.sub?.smServiceAccounts || 0;

    const additionalServiceAccounts = baseServiceAccount - usedServiceAccounts;

    return additionalServiceAccounts <= 0 ? Math.abs(additionalServiceAccounts) : 0;
  }

  changedProduct() {
    // Use the currently selected plan instead of selectablePlans[0]
    if (this.selectedPlan) {
      this.setPlanType(this.selectedPlan.type);
      this.handlePremiumAddonAccess(this.selectedPlan.PasswordManager.hasPremiumAccessOption);
      this.handleAdditionalSeats(this.selectedPlan.PasswordManager.hasAdditionalSeatsOption);
    }
  }

  setPlanType(planType: PlanType) {
    this.formGroup.controls.plan.setValue(planType);
  }

  handlePremiumAddonAccess(hasPremiumAccessOption: boolean) {
    this.formGroup.controls.premiumAccessAddon.setValue(!hasPremiumAccessOption);
  }

  handleAdditionalSeats(selectedPlanHasAdditionalSeatsOption: boolean) {
    if (!selectedPlanHasAdditionalSeatsOption) {
      this.formGroup.controls.additionalSeats.setValue(0);
      return;
    }

    if (this.currentPlan && !this.currentPlan.PasswordManager.hasAdditionalSeatsOption) {
      this.formGroup.controls.additionalSeats.setValue(this.currentPlan.PasswordManager.baseSeats);
      return;
    }

    if (this.organization) {
      this.formGroup.controls.additionalSeats.setValue(this.organization.seats);
      return;
    }

    this.formGroup.controls.additionalSeats.setValue(1);
  }

  changedCountry() {
    this.paymentComponent.showBankAccount = this.taxInformation.country === "US";

    if (
      !this.paymentComponent.showBankAccount &&
      this.paymentComponent.selected === PaymentMethodType.BankAccount
    ) {
      this.paymentComponent.select(PaymentMethodType.Card);
    }
  }

  protected taxInformationChanged(event: TaxInformation): void {
    this.taxInformation = event;
    this.changedCountry();
    this.refreshSalesTax();
  }

  submit = async () => {
    if (this.taxComponent !== undefined && !this.taxComponent.validate()) {
      this.taxComponent.markAllAsTouched();
      return;
    }

    const doSubmit = async (): Promise<string> => {
      let orgId: string = null;
      const sub = this.sub?.subscription;
      const isCanceled = sub?.status === "canceled";
      const isCancelledDowngradedToFreeOrg =
        sub?.cancelled && this.organization.productTierType === ProductTierType.Free;

      if (isCanceled || isCancelledDowngradedToFreeOrg) {
        await this.restartSubscription();
        orgId = this.organizationId;
      } else {
        orgId = await this.updateOrganization();
      }
      this.toastService.showToast({
        variant: "success",
        title: null,
        message: this.isSubscriptionCanceled
          ? this.i18nService.t("restartOrganizationSubscription")
          : this.i18nService.t("organizationUpgraded"),
      });

      await this.apiService.refreshIdentityToken();
      await this.syncService.fullSync(true);

      if (!this.acceptingSponsorship && !this.isInTrialFlow) {
        // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.router.navigate(["/organizations/" + orgId + "/billing/subscription"]);
      }

      if (this.isInTrialFlow) {
        this.onTrialBillingSuccess.emit({
          orgId: orgId,
          subLabelText: this.billingSubLabelText(),
        });
      }

      return orgId;
    };

    this.formPromise = doSubmit();
    const organizationId = await this.formPromise;
    this.onSuccess.emit({ organizationId: organizationId });
    // TODO: No one actually listening to this message?
    this.messagingService.send("organizationCreated", { organizationId });
    this.dialogRef.close();
  };

  private async restartSubscription() {
    const org = await this.organizationApiService.get(this.organizationId);
    const organization: OrganizationInformation = {
      name: org.name,
      billingEmail: org.billingEmail,
    };

    const filteredPlan = this.plans.data
      .filter((plan) => plan.productTier === this.selectedPlan.productTier && !plan.legacyYear)
      .find((plan) => {
        const isSameBillingCycle = plan.isAnnual === this.selectedPlan.isAnnual;
        return isSameBillingCycle;
      });

    const plan: PlanInformation = {
      type: filteredPlan.type,
      passwordManagerSeats: org.seats,
    };

    if (org.useSecretsManager) {
      plan.subscribeToSecretsManager = true;
      plan.secretsManagerSeats = org.smSeats;
    }

    const { type, token } = await this.paymentComponent.tokenize();
    const paymentMethod: [string, PaymentMethodType] = [token, type];

    const payment: PaymentInformation = {
      paymentMethod,
      billing: this.getBillingInformationFromTaxInfoComponent(),
    };

    await this.organizationBillingService.restartSubscription(this.organization.id, {
      organization,
      plan,
      payment,
    });
  }

  private async updateOrganization() {
    const request = new OrganizationUpgradeRequest();
    if (this.selectedPlan.productTier !== ProductTierType.Families) {
      request.additionalSeats = this.sub?.seats;
    }
    if (this.sub?.maxStorageGb > this.selectedPlan.PasswordManager.baseStorageGb) {
      request.additionalStorageGb =
        this.sub?.maxStorageGb - this.selectedPlan.PasswordManager.baseStorageGb;
    }
    request.premiumAccessAddon =
      this.selectedPlan.PasswordManager.hasPremiumAccessOption &&
      this.formGroup.controls.premiumAccessAddon.value;
    request.planType = this.selectedPlan.type;
    if (this.showPayment) {
      request.billingAddressCountry = this.taxInformation.country;
      request.billingAddressPostalCode = this.taxInformation.postalCode;
    }

    // Secrets Manager
    this.buildSecretsManagerRequest(request);

    if (this.upgradeRequiresPaymentMethod || this.showPayment || this.isPaymentSourceEmpty()) {
      const tokenizedPaymentSource = await this.paymentComponent.tokenize();
      const updatePaymentMethodRequest = new UpdatePaymentMethodRequest();
      updatePaymentMethodRequest.paymentSource = tokenizedPaymentSource;
      updatePaymentMethodRequest.taxInformation = ExpandedTaxInfoUpdateRequest.From(
        this.taxInformation,
      );

      await this.billingApiService.updateOrganizationPaymentMethod(
        this.organizationId,
        updatePaymentMethodRequest,
      );
    }

    // Backfill pub/priv key if necessary
    if (!this.organization.hasPublicAndPrivateKeys) {
      const orgShareKey = await this.keyService.getOrgKey(this.organizationId);
      const orgKeys = await this.keyService.makeKeyPair(orgShareKey);
      request.keys = new OrganizationKeysRequest(orgKeys[0], orgKeys[1].encryptedString);
    }

    await this.organizationApiService.upgrade(this.organizationId, request);
    return this.organizationId;
  }

  private billingSubLabelText(): string {
    const selectedPlan = this.selectedPlan;
    const price =
      selectedPlan.PasswordManager.basePrice === 0
        ? selectedPlan.PasswordManager.seatPrice
        : selectedPlan.PasswordManager.basePrice;
    let text = "";

    if (selectedPlan.isAnnual) {
      text += `${this.i18nService.t("annual")} ($${price}/${this.i18nService.t("yr")})`;
    } else {
      text += `${this.i18nService.t("monthly")} ($${price}/${this.i18nService.t("monthAbbr")})`;
    }

    return text;
  }

  private getBillingInformationFromTaxInfoComponent(): BillingInformation {
    return {
      country: this.taxInformation.country,
      postalCode: this.taxInformation.postalCode,
      taxId: this.taxInformation.taxId,
      addressLine1: this.taxInformation.line1,
      addressLine2: this.taxInformation.line2,
      city: this.taxInformation.city,
      state: this.taxInformation.state,
    };
  }

  private buildSecretsManagerRequest(request: OrganizationUpgradeRequest): void {
    request.useSecretsManager = this.organization.useSecretsManager;
    if (!this.organization.useSecretsManager) {
      return;
    }

    if (
      this.selectedPlan.SecretsManager.hasAdditionalSeatsOption &&
      this.currentPlan.productTier === ProductTierType.Free
    ) {
      request.additionalSmSeats = this.organization.seats;
    } else {
      request.additionalSmSeats = this.sub?.smSeats;
      request.additionalServiceAccounts = this.additionalServiceAccount;
    }
  }

  private upgradeFlowPrefillForm() {
    if (this.acceptingSponsorship) {
      this.formGroup.controls.productTier.setValue(ProductTierType.Families);
      this.changedProduct();
      return;
    }

    if (this.currentPlan && this.currentPlan.productTier !== ProductTierType.Enterprise) {
      const upgradedPlan = this.passwordManagerPlans.find((plan) => {
        if (this.currentPlan.productTier === ProductTierType.Free) {
          return plan.type === PlanType.FamiliesAnnually;
        }

        if (
          this.currentPlan.productTier === ProductTierType.Families &&
          !this.teamsStarterPlanIsAvailable
        ) {
          return plan.type === PlanType.TeamsAnnually;
        }

        return plan.upgradeSortOrder === this.currentPlan.upgradeSortOrder + 1;
      });

      this.plan = upgradedPlan.type;
      this.productTier = upgradedPlan.productTier;
      this.changedProduct();
    }
  }

  private planIsEnabled(plan: PlanResponse) {
    return !plan.disabled && !plan.legacyYear;
  }

  toggleShowPayment() {
    this.showPayment = true;
  }

  get paymentSourceClasses() {
    if (this.paymentSource == null) {
      return [];
    }
    switch (this.paymentSource.type) {
      case PaymentMethodType.Card:
        return ["bwi-credit-card"];
      case PaymentMethodType.BankAccount:
      case PaymentMethodType.Check:
        return ["bwi-billing"];
      case PaymentMethodType.PayPal:
        return ["bwi-paypal text-primary"];
      default:
        return [];
    }
  }

  resolvePlanName(productTier: ProductTierType) {
    switch (productTier) {
      case ProductTierType.Enterprise:
        return this.i18nService.t("planNameEnterprise");
      case ProductTierType.Free:
        return this.i18nService.t("planNameFree");
      case ProductTierType.Families:
        return this.i18nService.t("planNameFamilies");
      case ProductTierType.Teams:
        return this.i18nService.t("planNameTeams");
      case ProductTierType.TeamsStarter:
        return this.i18nService.t("planNameTeamsStarter");
    }
  }

  onKeydown(event: KeyboardEvent, index: number) {
    const cardElements = Array.from(document.querySelectorAll(".product-card")) as HTMLElement[];
    let newIndex = index;
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;

    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
      do {
        newIndex = (newIndex + direction + cardElements.length) % cardElements.length;
      } while (this.isUpgradeCardDisabled(this.upgradePlanCards[newIndex]) && newIndex !== index);

      event.preventDefault();

      setTimeout(() => {
        const card = cardElements[newIndex];
        if (
          !(
            card.classList.contains("tw-bg-secondary-100") &&
            card.classList.contains("tw-text-muted")
          )
        ) {
          card?.focus();
        }
      }, 0);
    }
  }

  onFocus(index: number) {
    this.focusedIndex = index;
    // Plan selection is now handled by the app-plan-card component click events
  }

  // isCardDisabled removed - this logic is now in the app-plan-card component

  // manageSelectableProduct removed - now using manageUpgradePlanCard for tracking

  private refreshSalesTax(): void {
    if (
      this.taxInformation === undefined ||
      !this.taxInformation.country ||
      !this.taxInformation.postalCode
    ) {
      return;
    }

    const request: PreviewOrganizationInvoiceRequest = {
      organizationId: this.organizationId,
      passwordManager: {
        additionalStorage: 0,
        plan: this.selectedPlan?.type,
        seats: this.sub.seats,
      },
      taxInformation: {
        postalCode: this.taxInformation.postalCode,
        country: this.taxInformation.country,
        taxId: this.taxInformation.taxId,
      },
    };

    if (this.organization.useSecretsManager) {
      request.secretsManager = {
        seats: this.sub.smSeats,
        additionalMachineAccounts:
          this.sub.smServiceAccounts - this.sub.plan.SecretsManager.baseServiceAccount,
      };
    }

    this.taxService
      .previewOrganizationInvoice(request)
      .then((invoice) => {
        void this.updatePricingSummaryData();
      })
      .catch((error) => {
        const translatedMessage = this.i18nService.t(error.message);
        this.toastService.showToast({
          title: "",
          variant: "error",
          message:
            !translatedMessage || translatedMessage === "" ? error.message : translatedMessage,
        });
      });
  }

  private async updatePricingSummaryData(): Promise<void> {
    if (!this.selectedPlan || !this.organization || !this.taxInformation) {
      return;
    }

    this.pricingSummaryData = await this.pricingSummaryService.getPricingSummaryData(
      this.selectedPlan,
      this.sub,
      this.organization,
      this.selectedInterval,
      this.taxInformation,
      this.isSecretsManagerTrial(),
    );
  }

  protected canUpdatePaymentInformation(): boolean {
    return (
      this.upgradeRequiresPaymentMethod ||
      this.showPayment ||
      this.isPaymentSourceEmpty() ||
      this.isSubscriptionCanceled
    );
  }

  get submitButtonLabel(): string {
    if (
      this.organization &&
      this.sub &&
      this.organization.productTierType !== ProductTierType.Free &&
      this.sub.subscription?.status === "canceled"
    ) {
      return this.i18nService.t("restart");
    } else {
      return this.i18nService.t("upgrade");
    }
  }

  /**
   * Initialize upgrade plan cards using the new PlanCardService method
   */
  async initializeUpgradePlanCards(): Promise<void> {
    if (this.currentPlan && this.sub && this.organization) {
      const businessOwned = this.formGroup.controls.businessOwned.value;
      this.upgradePlanCards = await this.planCardService.getUpgradePlanCards(
        this.currentPlan,
        this.sub,
        this.organization,
        this.selectedInterval,
        this.showFree,
        this.acceptingSponsorship,
        businessOwned,
      );

      // Ensure Enterprise plan (recommended) is selected by default
      if (!this.isSubscriptionCanceled && this.upgradePlanCards.length > 0) {
        const enterprisePlan = this.upgradePlanCards.find(
          (card) => card.planResponse?.productTier === ProductTierType.Enterprise,
        );
        if (enterprisePlan?.planResponse) {
          this.selectPlan(enterprisePlan.planResponse);
        } else {
          // Fallback to last plan if Enterprise not available
          const lastPlan = this.upgradePlanCards[this.upgradePlanCards.length - 1];
          if (lastPlan?.planResponse) {
            this.selectPlan(lastPlan.planResponse);
          }
        }
      }

      // Set selected state for the plan cards based on current selected plan
      this.updateUpgradePlanCardSelection();
    }
  }

  /**
   * Update the selected state of upgrade plan cards
   */
  updateUpgradePlanCardSelection(): void {
    this.upgradePlanCards.forEach((card) => {
      card.isSelected = card.planResponse === this.selectedPlan;
    });
  }

  /**
   * Handle plan selection from upgrade plan cards
   */
  selectUpgradePlan(planCard: PlanCard): void {
    if (planCard.planResponse) {
      this.selectPlan(planCard.planResponse);
      this.updateUpgradePlanCardSelection();
    }
  }

  /**
   * Check if an upgrade plan card is disabled
   */
  isUpgradeCardDisabled(planCard: PlanCard): boolean {
    if (!planCard.planResponse) {
      return true;
    }

    return (
      this.selectedInterval === PlanInterval.Monthly &&
      planCard.planResponse.productTier === ProductTierType.Families
    );
  }

  /**
   * Track by function for upgrade plan cards
   */
  manageUpgradePlanCard(index: number, planCard: PlanCard): any {
    return planCard.planResponse
      ? `${planCard.planResponse.type}_${planCard.planResponse.productTier}_${planCard.planResponse.isAnnual}`
      : index;
  }

  /**
   * Update upgrade plan cards when interval changes
   */
  async updateUpgradePlanCardsOnIntervalChange(): Promise<void> {
    const previousSelectedTier = this.selectedPlan?.productTier;
    await this.initializeUpgradePlanCards();

    // Try to maintain the same tier selection after interval change
    if (previousSelectedTier && this.upgradePlanCards.length > 0) {
      const sameTierPlan = this.upgradePlanCards.find(
        (card) => card.planResponse?.productTier === previousSelectedTier,
      );
      if (sameTierPlan?.planResponse) {
        this.selectPlan(sameTierPlan.planResponse);
        this.updateUpgradePlanCardSelection();
      }
    }
  }
}
