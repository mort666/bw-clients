import { CommonModule } from "@angular/common";
import { Component, ContentChild, HostBinding, Input, Optional, Self } from "@angular/core";
import { ControlValueAccessor, NgControl, Validators } from "@angular/forms";

import { BitFormFieldControl } from "../form-field";
import { SharedModule } from "../shared";

import { BitRangeDirective } from "./range.directive";

let nextId = 0;

@Component({
  selector: "bit-slider",
  templateUrl: "slider.component.html",
  standalone: true,
  imports: [CommonModule, SharedModule],
  providers: [{ provide: BitFormFieldControl, useExisting: SliderComponent }],
})
export class SliderComponent implements ControlValueAccessor {
  @ContentChild(BitRangeDirective) input: BitRangeDirective;

  private notifyOnChange?: (value: any) => void;
  private notifyOnTouched?: () => void;

  protected sliderInputId = `bit-slider-input-${nextId++}`;

  @Input()
  get disabled() {
    return this._disabled ?? this.ngControl?.disabled ?? false;
  }
  set disabled(value: any) {
    this._disabled = value != null && value !== false;
  }
  private _disabled: boolean;

  constructor(@Optional() @Self() private ngControl?: NgControl) {
    if (ngControl != null) {
      ngControl.valueAccessor = this;
    }
  }

  /**Implemented as part of NG_VALUE_ACCESSOR */
  writeValue(value: any): void {
    // eslint-disable-next-line
    console.log(value);
  }

  /**Implemented as part of NG_VALUE_ACCESSOR */
  registerOnChange(fn: (value: any) => void): void {
    this.notifyOnChange = fn;
  }

  /**Implemented as part of NG_VALUE_ACCESSOR */
  registerOnTouched(fn: any): void {
    this.notifyOnTouched = fn;
  }

  /**Implemented as part of NG_VALUE_ACCESSOR */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**Implemented as part of NG_VALUE_ACCESSOR */
  protected onChange(dunno: any) {
    if (!this.notifyOnChange) {
      return;
    }

    this.notifyOnChange(dunno);
  }

  /**Implemented as part of NG_VALUE_ACCESSOR */
  protected onBlur() {
    if (!this.notifyOnTouched) {
      return;
    }

    this.notifyOnTouched();
  }

  // not sure how much of this we need

  /**Implemented as part of BitFormFieldControl */
  @HostBinding("attr.required")
  @Input()
  get required() {
    return this._required ?? this.ngControl?.control?.hasValidator(Validators.required) ?? false;
  }
  set required(value: any) {
    this._required = value != null && value !== false;
  }
  private _required: boolean;

  /**Implemented as part of BitFormFieldControl */
  get hasError() {
    return this.ngControl?.status === "INVALID" && this.ngControl?.touched;
  }

  /**Implemented as part of BitFormFieldControl */
  get error(): [string, any] {
    const key = Object.keys(this.ngControl?.errors)[0];
    return [key, this.ngControl?.errors[key]];
  }
}
