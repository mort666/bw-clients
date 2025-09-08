import { Component, input, output } from "@angular/core";

import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { ProductTierType } from "@bitwarden/common/billing/enums";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { PlanResponse } from "@bitwarden/common/billing/models/response/plan.response";

export interface PlanCard {
  title: string;
  costPerMember: number;
  discount?: number;
  isDisabled: boolean;
  isAnnual: boolean;
  isSelected: boolean;
  productTier: ProductTierType;
  planResponse?: PlanResponse; // Optional for backward compatibility
  features?: string[]; // Additional feature list for upgrade cards
}

export interface UpgradePlanCardData {
  organization?: Organization;
  subscription?: OrganizationSubscriptionResponse;
  currentPlan?: PlanResponse;
  selectedPlan?: PlanResponse;
  selectedPlanInterval?: string;
  acceptingSponsorship?: boolean;
  isSubscriptionCanceled?: boolean;
  teamsStarterPlanIsAvailable?: boolean;
}

export interface UpgradePlanCard extends PlanCard {
  planResponse: PlanResponse; // Required for upgrade cards
  isCurrent?: boolean;
  isRecommended?: boolean;
  organization?: any; // For organization context
  subscription?: any; // For subscription context
  selectedPlanInterval?: string;
  acceptingSponsorship?: boolean;
  teamsStarterPlanIsAvailable?: boolean;
}

@Component({
  selector: "app-plan-card",
  templateUrl: "./plan-card.component.html",
  standalone: false,
})
export class PlanCardComponent {
  plan = input.required<PlanCard>();
  upgradeData = input<UpgradePlanCardData>();
  productTiers = ProductTierType;

  cardClicked = output();

  onCardClick(): void {
    // Don't emit click if this is the current plan in upgrade mode
    if (this.isUpgradeMode && this.isCurrent) {
      return;
    }
    // Don't emit click if the card is disabled
    if (this.plan().isDisabled) {
      return;
    }
    this.cardClicked.emit();
  }

  get isUpgradeMode(): boolean {
    return !!(this.upgradeData() && this.plan().planResponse);
  }

  get isRecommended(): boolean {
    if (this.isUpgradeMode) {
      const upgradeData = this.upgradeData();
      return (
        this.plan().planResponse?.productTier === ProductTierType.Enterprise &&
        !upgradeData?.isSubscriptionCanceled
      );
    }
    return this.plan().isAnnual;
  }

  get isCurrent(): boolean {
    if (this.isUpgradeMode) {
      const upgradeData = this.upgradeData();
      return this.plan().planResponse === upgradeData?.currentPlan;
    }
    return false;
  }

  get selectableProduct(): PlanResponse | undefined {
    return this.plan().planResponse;
  }

  getPlanCardContainerClasses(): string[] {
    const isSelected = this.plan().isSelected;
    const isDisabled = this.plan().isDisabled;
    const isCurrent = this.isCurrent;

    // Disable current plan cards in upgrade mode
    if (isDisabled || (this.isUpgradeMode && isCurrent)) {
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
          "tw-border-2",
          "tw-rounded-lg",
          "hover:tw-border-primary-700",
          "focus:tw-border-3",
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
}
