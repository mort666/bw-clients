import { Injectable } from "@angular/core";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { PlanType, ProductTierType } from "@bitwarden/common/billing/enums";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { PlanResponse } from "@bitwarden/common/billing/models/response/plan.response";

@Injectable({ providedIn: "root" })
export class PlanCardService {
  constructor(private apiService: ApiService) {}

  async getCadenceCards(
    currentPlan: PlanResponse,
    subscription: OrganizationSubscriptionResponse,
    isSecretsManagerTrial: boolean,
  ) {
    const plans = await this.apiService.getPlans();

    const filteredPlans = plans.data.filter((plan) => !!plan.PasswordManager);

    const result =
      filteredPlans?.filter(
        (plan) =>
          plan.productTier === currentPlan.productTier && !plan.disabled && !plan.legacyYear,
      ) || [];

    const planCards = result.map((plan) => {
      let costPerMember = 0;

      if (plan.PasswordManager.basePrice) {
        costPerMember = plan.isAnnual
          ? plan.PasswordManager.basePrice / 12
          : plan.PasswordManager.basePrice;
      } else if (!plan.PasswordManager.basePrice && plan.PasswordManager.hasAdditionalSeatsOption) {
        const secretsManagerCost = subscription.useSecretsManager
          ? plan.SecretsManager.seatPrice
          : 0;
        const passwordManagerCost = isSecretsManagerTrial ? 0 : plan.PasswordManager.seatPrice;
        costPerMember = (secretsManagerCost + passwordManagerCost) / (plan.isAnnual ? 12 : 1);
      }

      const percentOff = subscription.customerDiscount?.percentOff ?? 0;

      const discount =
        (percentOff === 0 && plan.isAnnual) || isSecretsManagerTrial ? 20 : percentOff;

      return {
        title: plan.isAnnual ? "Annually" : "Monthly",
        costPerMember,
        discount,
        isDisabled: false,
        isSelected: plan.isAnnual,
        isAnnual: plan.isAnnual,
        productTier: plan.productTier,
      };
    });

    return planCards.reverse();
  }

  /**
   * Get upgrade plan cards for the change plan dialog
   * This method handles the plan selection logic similar to what's in ChangePlanDialogComponent
   * but returns structured data for rendering with plan-card component
   */
  async getUpgradePlanCards(
    currentPlan: PlanResponse,
    subscription: OrganizationSubscriptionResponse,
    organization: Organization,
    selectedInterval: number,
    showFree: boolean = false,
    acceptingSponsorship: boolean = false,
    businessOwned: boolean = false,
  ) {
    const plans = await this.apiService.getPlans();
    const passwordManagerPlans = plans.data.filter((plan) => !!plan.PasswordManager);

    // Helper function to check if plan is enabled
    const planIsEnabled = (plan: PlanResponse): boolean => {
      return !plan.disabled && !plan.legacyYear;
    };

    let selectableProducts: PlanResponse[] = [];

    if (acceptingSponsorship) {
      const familyPlan = passwordManagerPlans.find(
        (plan) => plan.type === PlanType.FamiliesAnnually,
      );
      if (familyPlan) {
        selectableProducts = [familyPlan];
      }
    } else {
      selectableProducts = passwordManagerPlans.filter(
        (plan) =>
          plan.type !== PlanType.Custom &&
          (!businessOwned || plan.canBeUsedByBusiness) &&
          (showFree || plan.productTier !== ProductTierType.Free) &&
          (plan.productTier === ProductTierType.Free ||
            plan.productTier === ProductTierType.TeamsStarter ||
            (selectedInterval === 1 && plan.isAnnual) ||
            (selectedInterval === 0 && !plan.isAnnual)) &&
          (!currentPlan || currentPlan.upgradeSortOrder < plan.upgradeSortOrder) &&
          planIsEnabled(plan),
      );

      // Add family plan for monthly interval when appropriate
      if (
        currentPlan.productTier === ProductTierType.Free &&
        selectedInterval === 0 &&
        !organization.useSecretsManager
      ) {
        const familyPlan = passwordManagerPlans.find(
          (plan) => plan.productTier === ProductTierType.Families,
        );
        if (familyPlan) {
          selectableProducts.push(familyPlan);
        }
      }

      // Remove family plan for secrets manager users
      if (organization.useSecretsManager && currentPlan.productTier === ProductTierType.Free) {
        selectableProducts = selectableProducts.filter(
          (plan) => plan.productTier !== ProductTierType.Families,
        );
      }

      // Add current plan if not free tier
      if (currentPlan.productTier !== ProductTierType.Free) {
        selectableProducts.push(currentPlan);
      }

      selectableProducts.sort((planA, planB) => planA.displaySortOrder - planB.displaySortOrder);
    }

    // Convert to plan cards format
    const planCards = selectableProducts.map((plan) => {
      let costPerMember = 0;

      if (plan.PasswordManager.basePrice) {
        costPerMember = plan.isAnnual
          ? plan.PasswordManager.basePrice / 12
          : plan.PasswordManager.basePrice;
      } else if (!plan.PasswordManager.basePrice && plan.PasswordManager.hasAdditionalSeatsOption) {
        const secretsManagerCost = subscription.useSecretsManager
          ? plan.SecretsManager?.seatPrice || 0
          : 0;
        const passwordManagerCost = plan.PasswordManager.seatPrice;
        costPerMember = (secretsManagerCost + passwordManagerCost) / (plan.isAnnual ? 12 : 1);
      }

      const percentOff = subscription.customerDiscount?.percentOff ?? 0;
      const discount = percentOff === 0 && plan.isAnnual ? 20 : percentOff;

      return {
        title: this.getPlanTitle(plan),
        costPerMember,
        discount,
        isDisabled: false,
        isSelected: false, // Will be set by the component
        isAnnual: plan.isAnnual,
        productTier: plan.productTier,
        planResponse: plan, // Include the original plan for reference
        // Note: Features are handled conditionally in the template based on plan type and organization settings
      };
    });

    return planCards;
  }

  private getPlanTitle(plan: PlanResponse): string {
    switch (plan.productTier) {
      case ProductTierType.Free:
        return "Free";
      case ProductTierType.Families:
        return "Families";
      case ProductTierType.Teams:
        return "Teams";
      case ProductTierType.Enterprise:
        return "Enterprise";
      case ProductTierType.TeamsStarter:
        return "Teams Starter";
      default:
        return plan.name || "Unknown";
    }
  }

  private getPlanFeatures(plan: PlanResponse, organization: Organization): string[] {
    const features: string[] = [];

    // Add basic features based on plan properties
    if (plan.PasswordManager) {
      if (plan.PasswordManager.maxSeats) {
        features.push(`addShareLimitedUsers:${plan.PasswordManager.maxSeats}`);
      } else {
        features.push("addShareUnlimitedUsers");
      }

      if (plan.PasswordManager.maxCollections) {
        features.push(`limitedCollections:${plan.PasswordManager.maxCollections}`);
      } else {
        features.push("createUnlimitedCollections");
      }

      if (plan.PasswordManager.baseStorageGb) {
        features.push(`gbEncryptedFileStorage:${plan.PasswordManager.baseStorageGb}GB`);
      }
    }

    // Add tier-specific features
    switch (plan.productTier) {
      case ProductTierType.Free:
        features.push("twoStepLogin");
        break;

      case ProductTierType.Families:
        features.push("premiumAccounts");
        features.push("unlimitedSharing");
        features.push("priorityCustomerSupport");
        break;

      case ProductTierType.Teams:
        features.push("secureDataSharing");
        features.push("eventLogMonitoring");
        features.push("directoryIntegration");
        features.push("priorityCustomerSupport");
        if (organization?.useSecretsManager) {
          features.push("unlimitedSecretsStorage");
          features.push("unlimitedProjects");
          features.push("UpTo20MachineAccounts");
        }
        break;

      case ProductTierType.Enterprise:
        features.push("includeEnterprisePolicies");
        features.push("passwordLessSso");
        features.push("accountRecovery");
        features.push("customRoles");
        features.push("priorityCustomerSupport");
        if (organization?.useSecretsManager) {
          features.push("unlimitedSecretsStorage");
          features.push("unlimitedUsers");
          features.push("unlimitedProjects");
          features.push("UpTo50MachineAccounts");
        }
        break;
    }

    if (plan.usersGetPremium) {
      features.push("usersGetPremium");
    }

    return features;
  }
}
