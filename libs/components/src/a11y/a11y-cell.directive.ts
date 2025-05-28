import { Directive, ElementRef, HostBinding, contentChild } from "@angular/core";

import { FocusableElement } from "../shared/focusable-element";

@Directive({
  selector: "[bitA11yCell]",
  standalone: true,
  providers: [{ provide: FocusableElement, useExisting: A11yCellDirective }],
})
export class A11yCellDirective implements FocusableElement {
  @HostBinding("attr.role")
  role?: "gridcell" | null;

  private focusableChild = contentChild(FocusableElement);

  getFocusTarget() {
    return this.focusableChild()?.getFocusTarget() ?? this.elementRef.nativeElement;
  }

  constructor(private elementRef: ElementRef<HTMLElement>) {}
}
