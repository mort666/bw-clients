import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import {
  AsyncActionsModule,
  ButtonModule,
  DrawerBodyComponent,
  DrawerComponent,
  DrawerHeaderComponent,
  LayoutComponent,
  TabsModule,
} from "@bitwarden/components";
import { HeaderModule } from "@bitwarden/web-vault/app/layouts/header/header.module";

import { AllApplicationsComponentWithSignals } from "./all-applications-v2/all-applications.component";
import { CriticalApplicationsComponent } from "./critical-applications/critical-applications.component";
import { RiskInsightsStore } from "./risk-insights.store";

// FIXME: update to use a const object instead of a typescript enum
// eslint-disable-next-line @bitwarden/platform/no-enums
export enum RiskInsightsTabType {
  AllApps = 0,
  CriticalApps = 1,
  NotifiedMembers = 2,
}

@Component({
  standalone: true,
  templateUrl: "./risk-insights.component.html",
  imports: [
    AllApplicationsComponentWithSignals,
    AsyncActionsModule,
    ButtonModule,
    CommonModule,
    CriticalApplicationsComponent,
    JslibModule,
    HeaderModule,
    TabsModule,
    DrawerComponent,
    DrawerBodyComponent,
    DrawerHeaderComponent,
    LayoutComponent,
  ],
  providers: [RiskInsightsStore],
})
export class RiskInsightsComponent {
  tabIndex: RiskInsightsTabType = RiskInsightsTabType.AllApps;

  readonly store = inject(RiskInsightsStore);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe(({ tabIndex }) => {
      this.tabIndex = !isNaN(Number(tabIndex)) ? Number(tabIndex) : RiskInsightsTabType.AllApps;
    });

    const currentOrganizationId = this.store.currentOrganizationId;

    // Initialize the data source with the store's application reports
    this.store.load(currentOrganizationId);
  }

  // /**
  //  * Refreshes the data by re-fetching the applications report.
  //  * This will automatically notify child components subscribed to the RiskInsightsDataService observables.
  //  */
  // refreshData(): void {
  //   if (this.organizationId) {
  //     this.store.load(this.organizationId);
  //   }
  // }

  async onTabChange(newIndex: number): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tabIndex: newIndex },
      queryParamsHandling: "merge",
    });

    // close drawer when tabs are changed
    this.store.closeDrawer();
  }
}
