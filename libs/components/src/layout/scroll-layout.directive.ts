import { Directionality } from "@angular/cdk/bidi";
import { CdkVirtualScrollable, ScrollDispatcher, VIRTUAL_SCROLLABLE } from "@angular/cdk/scrolling";
import { Directive, ElementRef, NgZone, Optional } from "@angular/core";

import { LayoutComponent } from "./layout.component";

@Directive({
  selector: "cdk-virtual-scroll-viewport[bitScrollLayout]",
  standalone: true,
  providers: [{ provide: VIRTUAL_SCROLLABLE, useExisting: ScrollLayoutDirective }],
})
export class ScrollLayoutDirective extends CdkVirtualScrollable {
  private mainEl: ElementRef<HTMLElement>;

  constructor(
    layout: LayoutComponent,
    scrollDispatcher: ScrollDispatcher,
    ngZone: NgZone,
    @Optional() dir: Directionality,
  ) {
    const mainEl = new ElementRef(layout.getMainContent());
    super(mainEl, scrollDispatcher, ngZone, dir);
    this.mainEl = mainEl;
  }

  override getElementRef(): ElementRef<HTMLElement> {
    return this.mainEl;
  }

  override measureBoundingClientRectWithScrollOffset(
    from: "left" | "top" | "right" | "bottom",
  ): number {
    return this.mainEl.nativeElement.getBoundingClientRect()[from] - this.measureScrollOffset(from);
  }
}
