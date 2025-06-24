import { Component, Input } from "@angular/core";

import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { PlanInterval } from "@bitwarden/common/billing/enums";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { PlanResponse } from "@bitwarden/common/billing/models/response/plan.response";

import { SharedModule } from "../../../shared/shared.module";

import { PricingCalculationService } from "./pricing-calculation.service";

@Component({
  selector: "app-cost-summary",
  templateUrl: "./cost-summary.component.html",
  standalone: true,
  providers: [PricingCalculationService],
  imports: [SharedModule],
})
export class CostSummaryComponent {
  @Input() organization: Organization;
  @Input() sub: OrganizationSubscriptionResponse;
  @Input() selectedPlan: PlanResponse;
  @Input() selectedInterval: number;
  @Input() discountPercentageFromSub: number;
  @Input() discountPercentage: number;
  @Input() acceptingSponsorship: boolean;
  @Input() additionalServiceAccount: number;
  @Input() planIntervals = PlanInterval;
  @Input() totalOpened: boolean;
  @Input() storageGb: number;
  @Input() isSecretsManagerTrial: boolean;
  @Input() estimatedTax: number;
  discount = 0;
  secretsManagerTotal: number;

  constructor(public pricingCalculationService: PricingCalculationService) {}

  get selectedPlanInterval(): string {
    return this.selectedPlan?.isAnnual ? "year" : "month";
  }

  get passwordManagerSeats(): number {
    return this.pricingCalculationService.getPasswordManagerSeats(this.selectedPlan, this.sub);
  }

  passwordManagerSeatTotal(plan: PlanResponse): number {
    return this.pricingCalculationService.calculatePasswordManagerSeatTotal(
      plan,
      this.sub,
      this.isSecretsManagerTrial,
    );
  }

  secretsManagerSeatTotal(plan: PlanResponse, seats: number): number {
    return this.pricingCalculationService.calculateSecretsManagerSeatTotal(plan, seats);
  }

  additionalStorageTotal(plan: PlanResponse): number {
    return this.pricingCalculationService.calculateAdditionalStorageTotal(plan, this.sub);
  }

  additionalStoragePriceMonthly(selectedPlan: PlanResponse): number {
    return selectedPlan.PasswordManager.additionalStoragePricePerGb;
  }

  additionalServiceAccountTotal(plan: PlanResponse): number {
    return this.pricingCalculationService.calculateAdditionalServiceAccountTotal(
      plan,
      this.additionalServiceAccount,
    );
  }

  calculateTotalAppliedDiscount(total: number): number {
    return this.pricingCalculationService.calculateTotalAppliedDiscount(
      total,
      this.discountPercentageFromSub,
    );
  }

  toggleTotalOpened(): void {
    this.totalOpened = !this.totalOpened;
  }

  secretsManagerSubtotal() {
    return this.pricingCalculationService.calculateSecretsManagerSubtotal(
      this.selectedPlan,
      this.sub,
      this.secretsManagerTotal,
    );
  }

  get passwordManagerSubtotal() {
    return this.pricingCalculationService.calculatePasswordManagerSubtotal(
      this.selectedPlan,
      this.sub,
      this.discount,
    );
  }

  get total() {
    return this.pricingCalculationService.calculateTotal(
      this.organization,
      this.selectedPlan,
      this.passwordManagerSubtotal,
      this.estimatedTax,
      this.sub,
    );
  }
}
