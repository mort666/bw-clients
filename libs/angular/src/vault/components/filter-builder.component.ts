import { AsyncPipe, CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, FormsModule, ReactiveFormsModule } from "@angular/forms";
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

type FilterData = {
  vaults: ChipSelectOption<string>[] | null;
  folders: ChipSelectOption<string>[] | null;
  collections: ChipSelectOption<string>[] | null;
  types: ChipSelectOption<string>[];
  fields: ChipSelectOption<string>[] | null;
  anyHaveAttachment: boolean;
};

type FilterModel = Partial<FilterData & { text: string }>;

// TODO: Include more details on basic so consumers can easily interact with it.
export type Filter = { filter: string } & ({ type: "advanced" } | { type: "basic" });

const customMap = <T, TResult>(
  map: Map<T, unknown>,
  selector: (element: T, index: number) => TResult,
): TResult[] => {
  let index = 0;
  const results: TResult[] = [];
  for (const element of map.keys()) {
    results.push(selector(element, index++));
  }

  return results;
};

@Component({
  selector: "app-filter-builder",
  template: `
    <form [formGroup]="form" *ngIf="filterData$ | async as filter">
      <bit-chip-multi-select
        placeholderText="Vault"
        placeholderIcon="bwi-vault"
        formControlName="vaults"
        [options]="filter.vaults"
      ></bit-chip-multi-select>
      <bit-chip-multi-select
        placeholderText="Folders"
        placeholderIcon="bwi-folder"
        formControlName="folders"
        [options]="filter.folders"
        class="tw-pl-2"
      ></bit-chip-multi-select>
      <bit-chip-multi-select
        placeholderText="Collections"
        placeholderIcon="bwi-collection"
        formControlName="collections"
        [options]="filter.collections"
        class="tw-pl-2"
      ></bit-chip-multi-select>
      @for (selectedOtherOption of selectedOptions(); track selectedOtherOption) {
        @switch (selectedOtherOption) {
          @case ("types") {
            <bit-chip-multi-select
              placeholderText="Types"
              placeholderIcon="bwi-sliders"
              formControlName="types"
              [options]="filter.types"
              class="tw-pl-2"
            ></bit-chip-multi-select>
          }
          @case ("fields") {
            <bit-chip-multi-select
              placeholderText="Fields"
              placeholderIcon="bwi-filter"
              formControlName="fields"
              [options]="filter.fields"
              class="tw-pl-2"
            ></bit-chip-multi-select>
          }
        }
      }
      <ng-container *ngIf="otherOptions$ | async as otherOptions">
        <bit-chip-select
          *ngIf="otherOptions.length !== 0"
          placeholderText="Other filters"
          placeholderIcon="bwi-sliders"
          formControlName="otherOptions"
          [options]="otherOptions"
          class="tw-pl-2"
        >
        </bit-chip-select>
      </ng-container>
      <span class="tw-border-l tw-border-0 tw-border-solid tw-border-secondary-300 tw-mx-2"></span>
      <button type="button" bitLink linkType="secondary" class="tw-text-sm" (click)="resetFilter()">
        Reset
      </button>
      <button type="button" bitLink class="tw-ml-2 tw-text-sm" (click)="saveFilter()">
        Save filter
      </button>
    </form>
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

  protected form = this.formBuilder.group({
    vaults: this.formBuilder.control<string[]>([]),
    folders: this.formBuilder.control<string[]>([]),
    collections: this.formBuilder.control<string[]>([]),
    types: this.formBuilder.control<string[]>([]),
    fields: this.formBuilder.control<string[]>([]),
    otherOptions: this.formBuilder.control<string>(null),
    selectedOtherOptions: this.formBuilder.control<string[]>([]),
  });

  private loadingFilter: FilterData;

  protected filterData$: Observable<FilterData>;

  private defaultOtherOptions: ChipSelectOption<string>[];

  // TODO: Set these dynamically based on metadata
  private _otherOptions: BehaviorSubject<ChipSelectOption<string>[]>;

  protected otherOptions$: Observable<ChipSelectOption<string>[]>;

  constructor(
    private readonly i18nService: I18nService,
    private readonly formBuilder: FormBuilder,
    private readonly vaultFilterMetadataService: VaultFilterMetadataService,
  ) {
    // TODO: i18n
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
      anyHaveAttachment: true,
    };

    // TODO: i18n
    this.defaultOtherOptions = [
      { value: "types", label: "Types", icon: "bwi-sliders" },
      { value: "fields", label: "Fields", icon: "bwi-filter" },
    ];

    this._otherOptions = new BehaviorSubject(this.defaultOtherOptions);

    this.otherOptions$ = this._otherOptions.asObservable();

    this.defaultOtherOptions = [
      { value: "types", label: "Types", icon: "bwi-sliders" },
      { value: "fields", label: "Fields", icon: "bwi-filter" },
    ];

    this.form.controls.otherOptions.valueChanges.pipe(takeUntilDestroyed()).subscribe((option) => {
      if (option == null) {
        return;
      }

      // TODO: Do I need to ensure unique?
      this.form.controls.selectedOtherOptions.setValue([
        ...this.form.controls.selectedOtherOptions.value,
        option,
      ]);
      const existingOptions = [...this._otherOptions.value];

      const index = existingOptions.findIndex((o) => o.value === option);

      if (index === -1) {
        throw new Error("Should never happen.");
      }

      existingOptions.splice(index, 1);
      this._otherOptions.next(existingOptions);

      this.form.controls.otherOptions.setValue(null);
    });

    this.form.valueChanges.pipe(map((v) => v));
  }

  private convertFilter(filter: FilterModel): Filter {
    // TODO: Support advanced mode
    return {
      type: "basic",
      filter: "", // TODO: Convert to string
    };
  }

  ngOnInit(): void {
    this.filterData$ = this.ciphers.pipe(
      this.vaultFilterMetadataService.collectMetadata(),
      map((metadata) => {
        // TODO: Combine with other info
        return {
          vaults: customMap(metadata.vaults, (v, i) => {
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
          folders: customMap(
            metadata.folders,
            (f, i) =>
              ({
                value: f,
                label: `Folder ${i}`,
              }) satisfies ChipSelectOption<string>,
          ),
          collections: customMap(
            metadata.collections,
            (c, i) =>
              ({
                value: c,
                label: `Collection ${i}`,
              }) satisfies ChipSelectOption<string>,
          ),
          types: customMap(metadata.itemTypes, (t) => {
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
          fields: customMap(
            metadata.fieldNames,
            (f, i) => ({ value: f, label: f }) satisfies ChipSelectOption<string>,
          ),
          anyHaveAttachment: metadata.attachmentCount !== 0,
        } satisfies FilterModel;
      }),
      startWith(this.loadingFilter),
    );
  }

  protected selectedOptions() {
    return this.form.controls.selectedOtherOptions.value;
  }

  protected resetFilter() {
    this._otherOptions.next(this.defaultOtherOptions);
    this.form.reset({
      vaults: [],
      folders: [],
      types: [],
      fields: [],
      otherOptions: null,
      collections: [],
      selectedOtherOptions: [],
    });
  }

  protected saveFilter() {
    //
  }
}
