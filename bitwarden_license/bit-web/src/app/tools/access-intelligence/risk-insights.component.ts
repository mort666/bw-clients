import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { map, switchMap } from "rxjs/operators";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import {
  MemberCipherDetailsApiService,
  RiskInsightsDataService,
  RiskInsightsReportService,
} from "@bitwarden/bit-common/tools/reports/risk-insights";
import { ApplicationHealthReportDetail } from "@bitwarden/bit-common/tools/reports/risk-insights/models/password-health";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { AsyncActionsModule, ButtonModule, TabsModule } from "@bitwarden/components";
import { HeaderModule } from "@bitwarden/web-vault/app/layouts/header/header.module";

import { AllApplicationsComponent } from "./all-applications.component";
import { CriticalApplicationsComponent } from "./critical-applications.component";
import { NotifiedMembersTableComponent } from "./notified-members-table.component";
import { PasswordHealthMembersURIComponent } from "./password-health-members-uri.component";
import { PasswordHealthMembersComponent } from "./password-health-members.component";
import { PasswordHealthComponent } from "./password-health.component";

export enum RiskInsightsTabType {
  AllApps = 0,
  CriticalApps = 1,
  NotifiedMembers = 2,
}

@Component({
  standalone: true,
  templateUrl: "./risk-insights.component.html",
  imports: [
    AllApplicationsComponent,
    AsyncActionsModule,
    ButtonModule,
    CommonModule,
    CriticalApplicationsComponent,
    JslibModule,
    HeaderModule,
    PasswordHealthComponent,
    PasswordHealthMembersComponent,
    PasswordHealthMembersURIComponent,
    NotifiedMembersTableComponent,
    TabsModule,
  ],
  providers: [RiskInsightsReportService, RiskInsightsDataService, MemberCipherDetailsApiService],
})
export class RiskInsightsComponent implements OnInit {
  tabIndex: RiskInsightsTabType = RiskInsightsTabType.AllApps;

  dataLastUpdated = new Date();

  isCriticalAppsFeatureEnabled = false;

  appsCount = 0;
  criticalAppsCount = 0;
  notifiedMembersCount = 0;

  private organizationId: string;
  private destroyRef = inject(DestroyRef);
  loading = true;
  refetching = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private configService: ConfigService,
    private dataService: RiskInsightsDataService,
  ) {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(({ tabIndex }) => {
      this.tabIndex = !isNaN(Number(tabIndex)) ? Number(tabIndex) : RiskInsightsTabType.AllApps;
    });
  }

  async ngOnInit() {
    this.isCriticalAppsFeatureEnabled = await this.configService.getFeatureFlag(
      FeatureFlag.CriticalApps,
    );

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((params) => params.get("organizationId")),
        switchMap((orgId) => {
          this.organizationId = orgId;
          return this.dataService.getApplicationsReport$(orgId);
        }),
      )
      .subscribe({
        next: (applications: ApplicationHealthReportDetail[]) => {
          if (applications) {
            this.appsCount = applications.length;
            this.loading = false;
            this.refetching = false;
            this.dataLastUpdated = new Date();
          }
        },
      });
  }

  async refreshData() {
    if (this.organizationId) {
      this.refetching = true;
      // Clear the cache to ensure fresh data is fetched
      this.dataService.clearApplicationsReportCache(this.organizationId);
      // Re-initialize to fetch data again
      await this.ngOnInit();
    }
  }

  async onTabChange(newIndex: number): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tabIndex: newIndex },
      queryParamsHandling: "merge",
    });
  }
}
