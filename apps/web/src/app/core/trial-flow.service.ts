import { Injectable } from "@angular/core";

import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { BillingResponse } from "@bitwarden/common/billing/models/response/billing.response";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

type FreeTrial = {
  trialing: boolean;
  remainingDays: number;
  message: string;
  isOwner: boolean;
  defaultPaymentSource: BillingResponse;
};

@Injectable({ providedIn: "root" })
export class TrialFlowService {
  constructor(private i18nService: I18nService) {}
  checkForOrgsWithUpcomingPaymentIssues(
    organization: Organization,
    organizationSubscription: OrganizationSubscriptionResponse,
    billing: BillingResponse,
  ): FreeTrial {
    const trialEndDate = organizationSubscription?.subscription?.trialEndDate;
    const isOwner = organization?.isOwner;
    const isTrialing = organizationSubscription?.subscription?.status === "trialing";
    const defaultPaymentSource = billing;

    const trialRemainingDays = trialEndDate ? this.calculateTrialRemainingDays(trialEndDate) : 0;

    const freeTrialMessage = this.getFreeTrialMessage(trialRemainingDays);

    return {
      trialing: isTrialing,
      remainingDays: trialRemainingDays,
      message: freeTrialMessage,
      isOwner,
      defaultPaymentSource,
    };
  }

  calculateTrialRemainingDays(trialEndDate: string): number | undefined {
    const today = new Date();
    const trialEnd = new Date(trialEndDate);
    const timeDifference = trialEnd.getTime() - today.getTime();

    return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  }

  getFreeTrialMessage(trialRemainingDays: number): string {
    if (trialRemainingDays >= 2) {
      return this.i18nService.t("freeTrialEndPrompt", trialRemainingDays);
    } else if (trialRemainingDays === 1) {
      return this.i18nService.t("freeTrialEndPromptForOneDayNoOrgName");
    } else {
      return this.i18nService.t("freeTrialEndingSoonWithoutOrgName");
    }
  }
}
