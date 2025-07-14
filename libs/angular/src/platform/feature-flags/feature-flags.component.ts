import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { map } from "rxjs";

import { AllowedFeatureFlagTypes } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import {
  ButtonModule,
  FormFieldModule,
  InputModule,
  SearchModule,
  TableDataSource,
  TableModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

@Component({
  selector: "app-feature-flags",
  templateUrl: "./feature-flags.component.html",
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    I18nPipe,
    FormsModule,
    FormFieldModule,
    InputModule,
    SearchModule,
  ],
})
export class FeatureFlagsComponent implements OnInit {
  loading = true;
  tableDataSource = new TableDataSource<{ key: string; value: AllowedFeatureFlagTypes }>();

  searchText = "";

  constructor(
    private destroyRef: DestroyRef,
    private configService: ConfigService,
  ) {}

  ngOnInit() {
    this.configService.featureStates$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((states) => {
          if (!states) {
            return [];
          }

          // Convert the feature states object into an array of key-value pairs
          return Object.entries(states).map(([key, value]) => ({
            key,
            value,
          }));
        }),
      )
      .subscribe((featureStates) => {
        this.tableDataSource.data = featureStates;
        this.loading = false;
      });
  }

  onSearchTextChanged(searchText: string) {
    this.searchText = searchText;
    this.tableDataSource.filter = searchText;
  }

  refresh() {
    this.configService.refreshServerConfig();
  }
}
