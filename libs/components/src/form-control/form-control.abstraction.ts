// FIXME: Update this file to be type safe and remove this and next line

import { ElementRef } from "@angular/core";
// import { NgControl } from "@angular/forms";

// @ts-strict-ignore
export abstract class BitFormControlAbstraction {
  _disabled: boolean;
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = value;
  }
  _required: boolean;
  get required(): boolean {
    return this._required;
  }
  set required(value: boolean) {
    this._required = value;
  }
  _hasError: boolean;
  get hasError(): boolean {
    return this._hasError;
  }
  set hasError(value: boolean) {
    this._hasError = value;
  }
  _error: [string, any];
  get error(): [string, any] {
    return this._error;
  }
  set error(value: [string, any]) {
    this._error = value;
  }
  _elementRef: ElementRef<HTMLElement>;

  constructor(elementRef: ElementRef<HTMLElement>) {
    this._elementRef = elementRef;
  }
}
