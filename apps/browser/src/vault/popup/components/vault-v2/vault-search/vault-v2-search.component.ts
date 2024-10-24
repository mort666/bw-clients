import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { debounceTime, filter, map, Subject, Subscription, switchMap, take } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { BitIconToggleComponent, IconButtonModule, SearchModule } from "@bitwarden/components";

import { VaultPopupItemsService } from "../../../services/vault-popup-items.service";
import { VaultPopupListFiltersService } from "../../../services/vault-popup-list-filters.service";

const SearchTextDebounceInterval = 200;

@Component({
  imports: [
    CommonModule,
    SearchModule,
    JslibModule,
    FormsModule,
    IconButtonModule,
    BitIconToggleComponent,
  ],
  standalone: true,
  selector: "app-vault-v2-search",
  templateUrl: "vault-v2-search.component.html",
})
export class VaultV2SearchComponent {
  searchText: string;

  private searchText$ = new Subject<string>();
  protected filtersVisible$ = this.vaultPopupListFiltersService.filtersVisible$;
  protected startingVisible$ = this.filtersVisible$.pipe(take(1));
  protected filterCount$ = this.vaultPopupListFiltersService.filtersVisible$.pipe(
    switchMap((visible) =>
      this.vaultPopupListFiltersService.filterCount$.pipe(map((c) => (visible ? 0 : c))),
    ),
  );

  constructor(
    private vaultPopupItemsService: VaultPopupItemsService,
    private vaultPopupListFiltersService: VaultPopupListFiltersService,
  ) {
    this.subscribeToLatestSearchText();
    this.subscribeToApplyFilter();
  }

  onFilterToggle(toggled: boolean) {
    this.vaultPopupListFiltersService.setFiltersVisible(toggled);
  }

  onSearchTextChanged() {
    this.searchText$.next(this.searchText);
  }

  subscribeToLatestSearchText(): Subscription {
    return this.vaultPopupItemsService.latestSearchText$
      .pipe(
        takeUntilDestroyed(),
        filter((data) => !!data),
      )
      .subscribe((text) => {
        this.searchText = text;
      });
  }

  subscribeToApplyFilter(): Subscription {
    return this.searchText$
      .pipe(debounceTime(SearchTextDebounceInterval), takeUntilDestroyed())
      .subscribe((data) => {
        this.vaultPopupItemsService.applyFilter(data);
      });
  }
}
