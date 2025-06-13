import { Component, DestroyRef, effect, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { debounceTime } from "rxjs";

import { ApplicationHealthReportDetailWithCriticalFlag } from "@bitwarden/bit-common/dirt/reports/risk-insights/models/password-health";
import {
  IconButtonModule,
  Icons,
  NoItemsModule,
  SearchModule,
  TableDataSource,
} from "@bitwarden/components";
import { CardComponent } from "@bitwarden/dirt-card";
import { HeaderModule } from "@bitwarden/web-vault/app/layouts/header/header.module";
import { SharedModule } from "@bitwarden/web-vault/app/shared";
import { PipesModule } from "@bitwarden/web-vault/app/vault/individual-vault/pipes/pipes.module";

import { AppTableRowScrollableComponent } from "../app-table-row-scrollable/app-table-row-scrollable.component";
import { ApplicationsLoadingComponent } from "../risk-insights-loading/risk-insights-loading.component";
import { RiskInsightsStore } from "../risk-insights.store";

@Component({
  standalone: true,
  selector: "tools-all-applications-with-signals",
  templateUrl: "./all-applications.component.html",
  imports: [
    ApplicationsLoadingComponent,
    HeaderModule,
    SearchModule,
    PipesModule,
    NoItemsModule,
    SharedModule,
    CardComponent,
    AppTableRowScrollableComponent,
    IconButtonModule,
  ],
  // provide the store at the component level (can be done at the root level as well)
})
export class AllApplicationsComponentWithSignals {
  readonly store = inject(RiskInsightsStore);

  protected dataSource = new TableDataSource<ApplicationHealthReportDetailWithCriticalFlag>();
  protected searchControl = new FormControl("", { nonNullable: true });

  noItemsIcon = Icons.Security;
  destroyRef = inject(DestroyRef);

  constructor() {
    const applicationsWithCriticalFlag = this.store.applicationsWithCriticalFlag;

    effect(() => {
      // Update table data when data changes
      this.dataSource.data = applicationsWithCriticalFlag();
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed())
      .subscribe((v) => (this.dataSource.filter = v));
  }

  onCheckboxChange = (applicationName: string, event: Event) => {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.store.selectApplication(applicationName);
    } else {
      this.store.deselectApplication(applicationName);
    }
  };
}
