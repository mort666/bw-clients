import { Component, OnInit, ViewChild } from "@angular/core";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";

import { OrganizationBillingServiceAbstraction as OrganizationBillingService } from "@bitwarden/common/billing/abstractions/organization-billing.service";
import { PlanType } from "@bitwarden/common/billing/enums";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ReferenceEventRequest } from "@bitwarden/common/models/request/reference-event.request";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { VerticalStepperComponent } from "../../trial-initiation/vertical-stepper/vertical-stepper.component";
import { ValidOrgParams } from "../trial-initiation.component";

@Component({
  selector: "app-secrets-manager-trial-free-stepper",
  templateUrl: "secrets-manager-trial-free-stepper.component.html",
})
export class SecretsManagerTrialFreeStepperComponent implements OnInit {
  @ViewChild("stepper", { static: false }) verticalStepper: VerticalStepperComponent;

  formGroup = this.formBuilder.group({
    name: [
      "",
      {
        validators: [Validators.required, Validators.maxLength(50)],
        updateOn: "change",
      },
    ],
    email: [
      "",
      {
        validators: [Validators.email],
      },
    ],
  });

  subLabels = {
    createAccount:
      "Before creating your free organization, you first need to log in or create a personal account.",
    organizationInfo: "Enter your organization information",
  };

  organizationId: string;
  plan: PlanType;
  org = "";
  createOrganizationLoading = false;
  trialFlowOrgs: string[] = [
    ValidOrgParams.teams,
    ValidOrgParams.teamsStarter,
    ValidOrgParams.enterprise,
    ValidOrgParams.families,
  ];

  referenceEventRequest: ReferenceEventRequest;

  private destroy$ = new Subject<void>();
  protected enableTrialPayment$ = this.configService.getFeatureFlag$(
    FeatureFlag.TrialPaymentOptional,
  );

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected i18nService: I18nService,
    protected organizationBillingService: OrganizationBillingService,
    private router: Router,
    private route: ActivatedRoute,
    private configService: ConfigService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.referenceEventRequest = new ReferenceEventRequest();
    this.referenceEventRequest.initiationPath = "Secrets Manager trial from marketing website";
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((qParams) => {
      if (this.trialFlowOrgs.includes(qParams.org)) {
        this.org = qParams.org;

        if (this.org === ValidOrgParams.teamsStarter) {
          this.plan = PlanType.TeamsStarter;
        } else if (this.org === ValidOrgParams.teams) {
          this.plan = PlanType.TeamsAnnually;
        } else if (this.org === ValidOrgParams.enterprise) {
          this.plan = PlanType.EnterpriseAnnually;
        }
      }
    });
  }

  accountCreated(email: string): void {
    this.formGroup.get("email")?.setValue(email);
    this.subLabels.createAccount = email;
    this.verticalStepper.next();
  }

  async createOrganizationOnTrial(): Promise<void> {
    this.createOrganizationLoading = true;
    const response = await this.organizationBillingService.purchaseSubscriptionNoPaymentMethod({
      organization: {
        name: this.formGroup.get("name").value,
        billingEmail: this.formGroup.get("email").value,
        initiationPath: "Secrets Manager trial from marketing website",
      },
      plan: {
        type: this.plan,
        subscribeToSecretsManager: true,
        isFromSecretsManagerTrial: true,
        passwordManagerSeats: 1,
        secretsManagerSeats: 1,
      },
    });

    this.organizationId = response?.id;
    this.subLabels.organizationInfo = response?.name;
    this.createOrganizationLoading = false;
    this.verticalStepper.next();
  }

  async createOrganization(): Promise<void> {
    const response = await this.organizationBillingService.startFree({
      organization: {
        name: this.formGroup.get("name").value,
        billingEmail: this.formGroup.get("email").value,
      },
      plan: {
        type: PlanType.Free,
        subscribeToSecretsManager: true,
        isFromSecretsManagerTrial: true,
      },
    });

    this.organizationId = response.id;
    this.subLabels.organizationInfo = response.name;
    this.verticalStepper.next();
  }

  async navigateToMembers(): Promise<void> {
    await this.router.navigate(["organizations", this.organizationId, "members"]);
  }

  async navigateToSecretsManager(): Promise<void> {
    await this.router.navigate(["sm", this.organizationId]);
  }
}
