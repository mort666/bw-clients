import { AsyncPipe, CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BehaviorSubject, map, Observable, startWith } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { VaultFilterMetadataService } from "@bitwarden/common/vault/filtering/vault-filter-metadata.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  FormFieldModule,
  ButtonModule,
  LinkModule,
  CheckboxModule,
  ChipMultiSelectComponent,
  ChipSelectOption,
  ChipSelectComponent,
} from "@bitwarden/components";

type Filter = {
  vaults: ChipSelectOption<string>[] | null;
  folders: ChipSelectOption<string>[] | null;
  collections: ChipSelectOption<string>[] | null;
  types: ChipSelectOption<string>[];
  fields: ChipSelectOption<string>[] | null;
};

const setMap = <T, TResult>(
  set: Set<T>,
  selector: (element: T, index: number) => TResult,
): TResult[] => {
  let index = 0;
  const results: TResult[] = [];
  for (const element of set) {
    results.push(selector(element, index++));
  }

  return results;
};

@Component({
  selector: "app-filter-builder",
  template: `
    <ng-container *ngIf="filterData$ | async as filter">
      <bit-chip-multi-select
        placeholderText="Vault"
        placeholderIcon="bwi-vault"
        [options]="filter.vaults"
      ></bit-chip-multi-select>
      <bit-chip-multi-select
        placeholderText="Folders"
        placeholderIcon="bwi-folder"
        [options]="filter.folders"
        class="tw-pl-2"
      ></bit-chip-multi-select>
      <bit-chip-multi-select
        placeholderText="Collections"
        placeholderIcon="bwi-collection"
        [options]="filter.collections"
        class="tw-pl-2"
      ></bit-chip-multi-select>
      @for (selectedOtherOption of selectedOtherOptions$ | async; track selectedOtherOption) {
        @switch (selectedOtherOption) {
          @case ("types") {
            <bit-chip-multi-select
              placeholderText="Types"
              placeholderIcon="bwi-sliders"
              [options]="filter.types"
              class="tw-pl-2"
            ></bit-chip-multi-select>
          }
          @case ("fields") {
            <bit-chip-multi-select
              placeholderText="Fields"
              placeholderIcon="bwi-filter"
              [loading]="filter.fields == null"
              [options]="filter.fields"
              class="tw-pl-2"
            ></bit-chip-multi-select>
          }
          @default {
            <p>Invalid option {{ selectedOtherOption | json }}</p>
          }
        }
      }
      <ng-container *ngIf="otherOptions$ | async as otherOptions">
        <bit-chip-select
          *ngIf="otherOptions.length !== 0"
          placeholderText="Other filters"
          placeholderIcon="bwi-sliders"
          [options]="otherOptions"
          class="tw-pl-2"
          [(ngModel)]="otherOption"
        >
        </bit-chip-select>
      </ng-container>
      <span class="tw-border-l tw-border-0 tw-border-solid tw-border-secondary-300 tw-mx-2"></span>
      <button type="button" bitLink linkType="secondary" class="tw-text-sm">Reset</button>
      <button type="button" bitLink class="tw-ml-2 tw-text-sm">Save filter</button>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LinkModule,
    ChipMultiSelectComponent,
    FormFieldModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    CheckboxModule,
    AsyncPipe,
    ChipSelectComponent,
  ],
})
export class FilterBuilderComponent implements OnInit {
  @Input({ required: true }) ciphers: Observable<CipherView[]> | undefined;

  @Output() searchFilter = new EventEmitter<
    Partial<{
      words: string;
      types: ChipSelectOption<string>[];
      collections: ChipSelectOption<string>[];
      vaults: ChipSelectOption<string>[];
      folders: ChipSelectOption<string>[];
      fields: ChipSelectOption<string>[];
    }>
  >();

  private loadingFilter: Filter;

  filterData$: Observable<Filter>;

  // TODO: Set these dynamically based on metadata
  private _otherOptions = new BehaviorSubject<ChipSelectOption<string>[]>([
    { value: "types", label: "Types", icon: "bwi-sliders" },
    { value: "fields", label: "Fields", icon: "bwi-filter" },
  ]);

  otherOptions$ = this._otherOptions.asObservable();

  get otherOption(): string {
    return null;
  }

  set otherOption(value: string) {
    if (value == null) {
      return;
    }
    const current = this._selectedOtherOptions.value;
    this._selectedOtherOptions.next([...current, value]);
    // TODO: Remove as option
    const currentOptions = [...this._otherOptions.value];

    const index = currentOptions.findIndex((o) => o.value === value);

    if (index === -1) {
      throw new Error("Should be impossible.");
    }

    currentOptions.splice(index, 1);
    this._otherOptions.next(currentOptions);
  }

  private _selectedOtherOptions = new BehaviorSubject<string[]>([]);

  selectedOtherOptions$ = this._selectedOtherOptions.asObservable();

  constructor(
    private readonly i18nService: I18nService,
    private readonly vaultFilterMetadataService: VaultFilterMetadataService,
  ) {
    this.loadingFilter = {
      vaults: null,
      folders: null,
      collections: null,
      types: [
        { value: "login", label: "Login", icon: "bwi-globe" },
        { value: "card", label: "Card", icon: "bwi-credit-card" },
        { value: "identity", label: "Identity", icon: "bwi-id-card" },
        { value: "note", label: "Secure Note", icon: "bwi-sticky-note" },
      ],
      fields: null,
    };
  }

  ngOnInit(): void {
    this.filterData$ = this.ciphers.pipe(
      this.vaultFilterMetadataService.collectMetadata(),
      map((metadata) => {
        // TODO: Combine with other info
        return {
          vaults: setMap(metadata.vaults, (v, i) => {
            if (v == null) {
              // Personal vault
              return {
                value: "personal",
                label: "My Vault",
              };
            } else {
              // Get organization info
              return {
                value: v,
                label: `Organization ${i}`,
              };
            }
          }),
          folders: setMap(
            metadata.folders,
            (f, i) =>
              ({
                value: f,
                label: `Folder ${i}`,
              }) satisfies ChipSelectOption<string>,
          ),
          collections: setMap(
            metadata.collections,
            (c, i) =>
              ({
                value: c,
                label: `Collection ${i}`,
              }) satisfies ChipSelectOption<string>,
          ),
          types: setMap(metadata.itemTypes, (t) => {
            switch (t) {
              case CipherType.Login:
                return { value: "login", label: "Login", icon: "bwi-globe" };
              case CipherType.Card:
                return {
                  value: "card",
                  label: "Card",
                  icon: "bwi-credit-card",
                };
              case CipherType.Identity:
                return {
                  value: "identity",
                  label: "Identity",
                  icon: "bwi-id-card",
                };
              case CipherType.SecureNote:
                return {
                  value: "note",
                  label: "Secure Note",
                  icon: "bwi-sticky-note",
                };
              case CipherType.SshKey:
                return {
                  value: "sshkey",
                  label: "SSH Key",
                  icon: "bwi-key",
                };
              default:
                throw new Error("Unreachable");
            }
          }),
          fields: setMap(
            metadata.fieldNames,
            (f, i) => ({ value: f, label: f }) satisfies ChipSelectOption<string>,
          ),
          anyHaveAttachment: metadata.anyHaveAttachment,
        } satisfies Filter & { anyHaveAttachment: boolean };
      }),
      startWith(this.loadingFilter),
    );
  }
}
