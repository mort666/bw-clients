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
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { BillingApiServiceAbstraction } from "@bitwarden/common/billing/abstractions";
import { TaxServiceAbstraction } from "@bitwarden/common/billing/abstractions/tax.service.abstraction";
import {
  PaymentMethodType,
  PlanInterval,
  PlanType,
  ProductTierType,
} from "@bitwarden/common/billing/enums";
import { TaxInformation } from "@bitwarden/common/billing/models/domain";
import { ExpandedTaxInfoUpdateRequest } from "@bitwarden/common/billing/models/request/expanded-tax-info-update.request";
import { PaymentRequest } from "@bitwarden/common/billing/models/request/payment.request";
import { PreviewOrganizationInvoiceRequest } from "@bitwarden/common/billing/models/request/preview-organization-invoice.request";
import { UpdatePaymentMethodRequest } from "@bitwarden/common/billing/models/request/update-payment-method.request";
import { BillingResponse } from "@bitwarden/common/billing/models/response/billing.response";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { PaymentSourceResponse } from "@bitwarden/common/billing/models/response/payment-source.response";
import { PlanResponse } from "@bitwarden/common/billing/models/response/plan.response";
import { ListResponse } from "@bitwarden/common/models/response/list.response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import {
  DIALOG_DATA,
  DialogConfig,
  DialogRef,
  DialogService,
  ToastService,
} from "@bitwarden/components";

import { BillingSharedModule } from "../billing-shared.module";
import { PaymentComponent } from "../payment/payment.component";

type TrialPaymentMethodParams = {
  organizationId: string;
  subscription: OrganizationSubscriptionResponse;
  productTierType: ProductTierType;
  initialPaymentMethod?: PaymentMethodType;
};

// FIXME: update to use a const object instead of a typescript enum
// eslint-disable-next-line @bitwarden/platform/no-enums
export enum TrialPaymentMethodDialogResultType {
  Closed = "closed",
  Submitted = "submitted",
}

// FIXME: update to use a const object instead of a typescript enum
// eslint-disable-next-line @bitwarden/platform/no-enums
export enum PlanCardState {
  Selected = "selected",
  NotSelected = "not_selected",
  Disabled = "disabled",
}

type PlanCard = {
  name: string;
  selected: boolean;
};

interface OnSuccessArgs {
  organizationId: string;
}

@Component({
  templateUrl: "./trial-payment-method-dialog.component.html",
  imports: [BillingSharedModule],
})
export class TrialPaymentMethodDialogComponent implements OnInit, OnDestroy {
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

  protected estimatedTax: number = 0;
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
  protected planCards: PlanCard[];
  protected ResultType = TrialPaymentMethodDialogResultType;
  protected initialPaymentMethod: PaymentMethodType;

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
  currentPlanName: string;
  showPayment: boolean = false;
  totalOpened: boolean = false;
  currentPlan: PlanResponse;
  isCardStateDisabled = false;
  focusedIndex: number | null = null;
  accountCredit: number;
  paymentSource?: PaymentSourceResponse;
  plans: ListResponse<PlanResponse>;
  secretsManagerTotal: number;

  private destroy$ = new Subject<void>();

  protected taxInformation: TaxInformation;

  constructor(
    @Inject(DIALOG_DATA) private dialogParams: TrialPaymentMethodParams,
    private dialogRef: DialogRef<TrialPaymentMethodDialogResultType>,
    private toastService: ToastService,
    private apiService: ApiService,
    private i18nService: I18nService,
    private router: Router,
    private policyService: PolicyService,
    private organizationService: OrganizationService,
    private formBuilder: FormBuilder,
    private organizationApiService: OrganizationApiServiceAbstraction,
    private billingApiService: BillingApiServiceAbstraction,
    private taxService: TaxServiceAbstraction,
    private accountService: AccountService,
  ) {
    this.initialPaymentMethod = this.dialogParams.initialPaymentMethod ?? PaymentMethodType.Card;
  }

  async ngOnInit(): Promise<void> {
    if (this.dialogParams.organizationId) {
      this.currentPlanName = this.resolvePlanName(this.dialogParams.productTierType);
      this.sub =
        this.dialogParams.subscription ??
        (await this.organizationApiService.getSubscription(this.dialogParams.organizationId));
      this.organizationId = this.dialogParams.organizationId;
      this.currentPlan = this.sub?.plan;
      this.selectedPlan = this.sub?.plan;
      const userId = await firstValueFrom(
        this.accountService.activeAccount$.pipe(map((a) => a?.id)),
      );
      this.organization = await firstValueFrom(
        this.organizationService
          .organizations$(userId)
          .pipe(getOrganizationById(this.organizationId)),
      );
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

    this.setInitialPlanIntervalSelection();
    this.loading = false;

    const taxInfo = await this.organizationApiService.getTaxInfo(this.organizationId);
    this.taxInformation = TaxInformation.from(taxInfo);
  }

  resolveHeaderName(): string {
    return this.i18nService.t(
      "upgradeFreeOrganization",
      this.resolvePlanName(this.dialogParams.productTierType),
    );
  }

  setInitialPlanIntervalSelection() {
    this.focusedIndex = this.selectablePlans.length - 1;
    this.selectPlan(this.selectablePlans.find((product) => product.isAnnual));
  }

  isEnterprise() {
    return this.currentPlan.productTier == ProductTierType.Enterprise;
  }

  isTeams() {
    return this.currentPlan.productTier == ProductTierType.Teams;
  }

  isFamily() {
    return this.currentPlan.productTier == ProductTierType.Families;
  }

  hasSecretsManager() {
    if (this.organization) {
      return this.organization.canAccessSecretsManager;
    }
  }

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

  protected getPlanCardContainerClasses(plan: PlanResponse, index: number): string[] {
    const isSelected = plan.isAnnual;
    const isDisabled = this.isCardDisabled(index);

    if (isDisabled) {
      return [
        "tw-cursor-not-allowed",
        "tw-bg-secondary-100",
        "tw-font-normal",
        "tw-bg-blur",
        "tw-text-muted",
        "tw-block",
        "tw-rounded",
      ];
    }

    return isSelected
      ? [
          "tw-cursor-pointer",
          "tw-block",
          "tw-rounded",
          "tw-border",
          "tw-border-solid",
          "tw-border-primary-600",
          "hover:tw-border-primary-700",
          "focus:tw-border-2",
          "focus:tw-border-primary-700",
          "focus:tw-rounded-lg",
        ]
      : [
          "tw-cursor-pointer",
          "tw-block",
          "tw-rounded",
          "tw-border",
          "tw-border-solid",
          "tw-border-secondary-300",
          "hover:tw-border-text-main",
          "focus:tw-border-2",
          "focus:tw-border-primary-700",
        ];
  }

  protected selectPlan(plan: PlanResponse) {
    if (
      this.selectedInterval === PlanInterval.Monthly &&
      plan.productTier == ProductTierType.Families
    ) {
      return;
    }

    this.selectedPlan = plan;
    this.formGroup.patchValue({ productTier: plan.productTier });

    try {
      this.refreshSalesTax();
    } catch {
      this.estimatedTax = 0;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedPlanInterval() {
    return this.currentPlan.isAnnual ? "year" : "month";
  }

  get selectablePlans() {
    const result =
      this.passwordManagerPlans?.filter(
        (plan) => plan.productTier === this.selectedPlan.productTier && this.planIsEnabled(plan),
      ) || [];

    result.sort((planA, planB) => planA.displaySortOrder - planB.displaySortOrder).reverse();
    return result;
  }

  get storageGb() {
    return this.sub?.maxStorageGb ? this.sub?.maxStorageGb - 1 : 0;
  }

  passwordManagerSeatTotal(plan: PlanResponse): number {
    if (!plan.PasswordManager.hasAdditionalSeatsOption || this.isSecretsManagerTrial()) {
      return 0;
    }

    const result = plan.PasswordManager.seatPrice * Math.abs(this.sub?.seats || 0);
    return result;
  }

  secretsManagerSeatTotal(plan: PlanResponse, seats: number): number {
    if (!plan.SecretsManager.hasAdditionalSeatsOption) {
      return 0;
    }

    return plan.SecretsManager.seatPrice * Math.abs(seats || 0);
  }

  additionalStorageTotal(plan: PlanResponse): number {
    if (!plan.PasswordManager.hasAdditionalStorageOption) {
      return 0;
    }

    return (
      plan.PasswordManager.additionalStoragePricePerGb *
      // TODO: Eslint upgrade. Please resolve this  since the null check does nothing
      // eslint-disable-next-line no-constant-binary-expression
      Math.abs(this.sub?.maxStorageGb ? this.sub?.maxStorageGb - 1 : 0 || 0)
    );
  }

  additionalStoragePriceMonthly(selectedPlan: PlanResponse) {
    return selectedPlan.PasswordManager.additionalStoragePricePerGb;
  }

  additionalServiceAccountTotal(plan: PlanResponse): number {
    if (
      !plan.SecretsManager.hasAdditionalServiceAccountOption ||
      this.additionalServiceAccount == 0
    ) {
      return 0;
    }

    return plan.SecretsManager.additionalPricePerServiceAccount * this.additionalServiceAccount;
  }

  get passwordManagerSubtotal() {
    if (!this.selectedPlan || !this.selectedPlan.PasswordManager) {
      return 0;
    }

    let subTotal = this.selectedPlan.PasswordManager.basePrice;
    if (this.selectedPlan.PasswordManager.hasAdditionalSeatsOption) {
      subTotal += this.passwordManagerSeatTotal(this.selectedPlan);
    }
    if (this.selectedPlan.PasswordManager.hasPremiumAccessOption) {
      subTotal += this.selectedPlan.PasswordManager.premiumAccessOptionPrice;
    }
    return subTotal - this.discount;
  }

  secretsManagerSubtotal() {
    const plan = this.selectedPlan;
    if (!plan || !plan.SecretsManager) {
      return this.secretsManagerTotal || 0;
    }

    if (this.secretsManagerTotal) {
      return this.secretsManagerTotal;
    }

    this.secretsManagerTotal =
      plan.SecretsManager.basePrice +
      this.secretsManagerSeatTotal(plan, this.sub?.smSeats) +
      this.additionalServiceAccountTotal(plan);
    return this.secretsManagerTotal;
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

  get total() {
    if (!this.organization || !this.selectedPlan) {
      return 0;
    }

    if (this.organization.useSecretsManager) {
      return (
        this.passwordManagerSubtotal +
        this.additionalStorageTotal(this.selectedPlan) +
        this.secretsManagerSubtotal() +
        this.estimatedTax
      );
    }
    return (
      this.passwordManagerSubtotal +
      this.additionalStorageTotal(this.selectedPlan) +
      this.estimatedTax
    );
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
    const selectedPlan = this.selectablePlans[0];

    this.setPlanType(selectedPlan.type);
    this.handlePremiumAddonAccess(selectedPlan.PasswordManager.hasPremiumAccessOption);
    this.handleAdditionalSeats(selectedPlan.PasswordManager.hasAdditionalSeatsOption);
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

  submit = async (): Promise<void> => {
    if (!this.taxComponent.validate()) {
      this.taxComponent.markAllAsTouched();
      return;
    }

    try {
      if (this.organizationId) {
        await this.updateOrganizationPaymentMethod();
      } else {
        await this.updatePremiumUserPaymentMethod();
      }

      this.toastService.showToast({
        variant: "success",
        title: null,
        message: this.i18nService.t("updatedPaymentMethod"),
      });

      // Emit success event before closing dialog
      this.onSuccess.emit({ organizationId: this.organizationId });
      this.dialogRef.close(TrialPaymentMethodDialogResultType.Submitted);
    } catch (error) {
      const msg = typeof error == "object" ? error.message : error;
      this.toastService.showToast({
        variant: "error",
        title: null,
        message: this.i18nService.t(msg) || msg,
      });
    }
  };
  private updateOrganizationPaymentMethod = async () => {
    const paymentSource = await this.paymentComponent.tokenize();

    const request = new UpdatePaymentMethodRequest();
    request.paymentSource = paymentSource;
    request.taxInformation = ExpandedTaxInfoUpdateRequest.From(this.taxInformation);

    await this.billingApiService.updateOrganizationPaymentMethod(this.organizationId, request);
  };

  private updatePremiumUserPaymentMethod = async () => {
    const { type, token } = await this.paymentComponent.tokenize();

    const request = new PaymentRequest();
    request.paymentMethodType = type;
    request.paymentToken = token;
    request.country = this.taxInformation.country;
    request.postalCode = this.taxInformation.postalCode;
    request.taxId = this.taxInformation.taxId;
    request.state = this.taxInformation.state;
    request.line1 = this.taxInformation.line1;
    request.line2 = this.taxInformation.line2;
    request.city = this.taxInformation.city;
    request.state = this.taxInformation.state;
    await this.apiService.postAccountPayment(request);
  };

  private planIsEnabled(plan: PlanResponse) {
    return !plan.disabled && !plan.legacyYear;
  }

  toggleTotalOpened() {
    this.totalOpened = !this.totalOpened;
  }

  calculateTotalAppliedDiscount(total: number) {
    const discountedTotal = total * (this.discountPercentageFromSub / 100);
    return discountedTotal;
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
      } while (this.isCardDisabled(newIndex) && newIndex !== index);

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
    this.selectPlan(this.selectablePlans[index]);
  }

  isCardDisabled(index: number): boolean {
    const card = this.selectablePlans[index];
    return card === (this.currentPlan || this.isCardStateDisabled);
  }

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
        this.estimatedTax = invoice.taxAmount;
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

  protected get showTaxIdField(): boolean {
    if (this.organizationId) {
      switch (this.productTier) {
        case ProductTierType.Free:
        case ProductTierType.Families:
          return false;
        default:
          return true;
      }
    } else {
      return !!this.providerId;
    }
  }

  static open = (
    dialogService: DialogService,
    dialogConfig: DialogConfig<TrialPaymentMethodParams>,
  ) =>
    dialogService.open<TrialPaymentMethodDialogResultType>(
      TrialPaymentMethodDialogComponent,
      dialogConfig,
    );
}
