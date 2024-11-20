import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";

import { TaxServiceAbstraction } from "@bitwarden/common/billing/abstractions/tax.service.abstraction";
import { CountryListItem, TaxInformation } from "@bitwarden/common/billing/models/domain";

@Component({
  selector: "app-manage-tax-information",
  templateUrl: "./manage-tax-information.component.html",
})
export class ManageTaxInformationComponent implements OnInit, OnDestroy {
  @Input() startWith: TaxInformation;
  @Input() onSubmit?: (taxInformation: TaxInformation) => Promise<void>;
  @Output() taxInformationUpdated = new EventEmitter();

  protected formGroup = this.formBuilder.group({
    country: ["", Validators.required],
    postalCode: ["", Validators.required],
    includeTaxId: false,
    taxId: "",
    taxIdType: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
  });

  private destroy$ = new Subject<void>();

  protected readonly countries: CountryListItem[] = this.taxService.getCountries();

  private taxInformation: TaxInformation;

  constructor(
    private formBuilder: FormBuilder,
    private taxService: TaxServiceAbstraction,
  ) {}

  getTaxInformation = (): TaxInformation & { includeTaxId: boolean } => ({
    ...this.taxInformation,
    includeTaxId: this.formGroup.value.includeTaxId,
  });

  submit = async () => {
    this.formGroup.markAllAsTouched();
    if (this.formGroup.invalid) {
      return;
    }
    await this.onSubmit?.(this.taxInformation);
    this.taxInformationUpdated.emit();
  };

  touch = (): boolean => {
    this.formGroup.markAllAsTouched();
    return this.formGroup.valid;
  };

  async ngOnInit() {
    if (this.startWith) {
      this.formGroup.patchValue({
        ...this.startWith,
        includeTaxId:
          this.countrySupportsTax(this.startWith.country) &&
          (!!this.startWith.taxId ||
            !!this.startWith.line1 ||
            !!this.startWith.line2 ||
            !!this.startWith.city ||
            !!this.startWith.state),
      });
    }

    this.formGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((values) => {
      this.taxInformation = {
        country: values.country,
        postalCode: values.postalCode,
        taxId: values.taxId,
        taxIdType: values.taxIdType,
        line1: values.line1,
        line2: values.line2,
        city: values.city,
        state: values.state,
      };
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected countrySupportsTax(countryCode: string) {
    return this.taxService.getSupportedCountries().includes(countryCode);
  }

  protected get includeTaxIdIsSelected() {
    return this.formGroup.value.includeTaxId;
  }

  protected get selectionSupportsAdditionalOptions() {
    return (
      this.formGroup.value.country !== "US" && this.countrySupportsTax(this.formGroup.value.country)
    );
  }
}
