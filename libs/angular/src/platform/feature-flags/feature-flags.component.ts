import { CommonModule } from "@angular/common";
import { Component, DestroyRef, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

import { AllowedFeatureFlagTypes } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { TableDataSource, TableModule } from "@bitwarden/components";

@Component({
  selector: "app-feature-flags",
  templateUrl: "./feature-flags.component.html",
  imports: [CommonModule, TableModule],
})
export class FeatureFlagsComponent implements OnInit {
  loading = true;
  tableDataSource = new TableDataSource<{ key: string; value: AllowedFeatureFlagTypes }>();

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
}
