import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { debounceTime } from "rxjs/operators";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import { TaxServiceAbstraction } from "@bitwarden/common/billing/abstractions/tax.service.abstraction";
import { CountryListItem } from "@bitwarden/common/billing/models/domain";
import { ExpandedTaxInfoUpdateRequest } from "@bitwarden/common/billing/models/request/expanded-tax-info-update.request";
import { TaxInfoUpdateRequest } from "@bitwarden/common/billing/models/request/tax-info-update.request";
import { TaxRateResponse } from "@bitwarden/common/billing/models/response/tax-rate.response";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";

import { SharedModule } from "../../shared";

@Component({
  selector: "app-tax-info",
  templateUrl: "tax-info.component.html",
  standalone: true,
  imports: [SharedModule],
})
// eslint-disable-next-line rxjs-angular/prefer-takeuntil
export class TaxInfoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() trialFlow = false;
  @Output() onCountryChanged = new EventEmitter();
  @Output() onTaxInformationChanged: EventEmitter<void> = new EventEmitter<void>();

  taxFormGroup = new FormGroup({
    country: new FormControl(null, [Validators.required]),
    postalCode: new FormControl(null),
    includeTaxId: new FormControl(null),
    taxId: new FormControl(null),
    line1: new FormControl(null),
    line2: new FormControl(null),
    city: new FormControl(null),
    state: new FormControl(null),
  });

  loading = true;
  organizationId: string;
  providerId: string;
  countryList: CountryListItem[] = this.taxService.getCountries();
  taxRates: TaxRateResponse[];
  private taxSupportedCountryCodes: string[] = this.taxService.getSupportedCountries();

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private logService: LogService,
    private organizationApiService: OrganizationApiServiceAbstraction,
    private taxService: TaxServiceAbstraction,
  ) {}

  get country(): string {
    return this.taxFormGroup.controls.country.value;
  }

  get postalCode(): string {
    return this.taxFormGroup.controls.postalCode.value;
  }

  get taxId(): string {
    return this.taxFormGroup.controls.taxId.value;
  }

  get line1(): string {
    return this.taxFormGroup.controls.line1.value;
  }

  get line2(): string {
    return this.taxFormGroup.controls.line2.value;
  }

  get city(): string {
    return this.taxFormGroup.controls.city.value;
  }

  get state(): string {
    return this.taxFormGroup.controls.state.value;
  }

  protected get includeTaxId(): boolean {
    return this.taxFormGroup.controls.includeTaxId.value;
  }

  async ngOnInit() {
    // Provider setup
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    this.route.queryParams.subscribe((params) => {
      this.providerId = params.providerId;
    });

    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    this.route.parent?.parent?.params.subscribe(async (params) => {
      this.organizationId = params.organizationId;
      if (this.organizationId) {
        try {
          const taxInfo = await this.organizationApiService.getTaxInfo(this.organizationId);
          if (taxInfo) {
            this.taxFormGroup.controls.taxId.setValue(taxInfo.taxId);
            this.taxFormGroup.controls.state.setValue(taxInfo.state);
            this.taxFormGroup.controls.line1.setValue(taxInfo.line1);
            this.taxFormGroup.controls.line2.setValue(taxInfo.line2);
            this.taxFormGroup.controls.city.setValue(taxInfo.city);
            this.taxFormGroup.controls.postalCode.setValue(taxInfo.postalCode);
            this.taxFormGroup.controls.country.setValue(taxInfo.country || "US");
            this.taxFormGroup.controls.includeTaxId.setValue(
              this.countrySupportsTax(this.country) &&
                (!!taxInfo.taxId ||
                  !!taxInfo.line1 ||
                  !!taxInfo.line2 ||
                  !!taxInfo.city ||
                  !!taxInfo.state),
            );
          }
        } catch (e) {
          this.logService.error(e);
        }
      } else {
        try {
          const taxInfo = await this.apiService.getTaxInfo();
          if (taxInfo) {
            this.taxFormGroup.controls.postalCode.setValue(taxInfo.postalCode);
            this.taxFormGroup.controls.country.setValue(taxInfo.country || "US");
          }
        } catch (e) {
          this.logService.error(e);
        }
      }

      if (this.country === "US") {
        this.taxFormGroup.controls.postalCode.setValidators([Validators.required]);
        this.taxFormGroup.controls.postalCode.updateValueAndValidity();
      }

      if (this.country !== "US") {
        this.onCountryChanged.emit();
      }
    });

    this.taxFormGroup.controls.country.valueChanges
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value === "US") {
          this.taxFormGroup.get("postalCode").setValidators([Validators.required]);
        } else {
          this.taxFormGroup.get("postalCode").clearValidators();
        }
        this.taxFormGroup.get("postalCode").updateValueAndValidity();
        this.changeCountry();
        this.onTaxInformationChanged.emit();
      });

    this.taxFormGroup.controls.postalCode.valueChanges
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => {
        this.onTaxInformationChanged.emit();
      });

    this.taxFormGroup.controls.taxId.valueChanges
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => {
        this.onTaxInformationChanged.emit();
      });

    this.taxFormGroup.controls.includeTaxId.valueChanges
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => {
        this.clearTaxInformationFields();
      });

    try {
      const taxRates = await this.apiService.getTaxRates();
      if (taxRates) {
        this.taxRates = taxRates.data;
      }
    } catch (e) {
      this.logService.error(e);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get taxRate() {
    if (this.taxRates != null) {
      const localTaxRate = this.taxRates.find(
        (x) => x.country === this.country && x.postalCode === this.postalCode,
      );
      return localTaxRate?.rate ?? null;
    }
  }

  get showTaxIdFields(): boolean {
    return this.includeTaxId && this.countrySupportsTax(this.country);
  }

  getTaxInfoRequest(): TaxInfoUpdateRequest {
    const request = new ExpandedTaxInfoUpdateRequest();
    request.country = this.country;
    request.postalCode = this.postalCode;
    request.taxId = this.taxId;
    request.line1 = this.line1;
    request.line2 = this.line2;
    request.city = this.city;
    request.state = this.state;
    return request;
  }

  submitTaxInfo(): Promise<any> {
    this.taxFormGroup.updateValueAndValidity();
    this.taxFormGroup.markAllAsTouched();
    const request = this.getTaxInfoRequest();
    return this.organizationId
      ? this.organizationApiService.updateTaxInfo(
          this.organizationId,
          request as ExpandedTaxInfoUpdateRequest,
        )
      : this.apiService.putTaxInfo(request);
  }

  changeCountry() {
    if (!this.countrySupportsTax(this.country)) {
      this.taxFormGroup.controls.includeTaxId.setValue(false);
      this.clearTaxInformationFields();
    }

    this.onCountryChanged.emit();
  }

  private clearTaxInformationFields(): void {
    this.taxFormGroup.controls.taxId.setValue(null);
    this.taxFormGroup.controls.line1.setValue(null);
    this.taxFormGroup.controls.line2.setValue(null);
    this.taxFormGroup.controls.city.setValue(null);
    this.taxFormGroup.controls.state.setValue(null);
  }

  countrySupportsTax(countryCode: string) {
    return this.taxSupportedCountryCodes.includes(countryCode);
  }
}
