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
  constructor(
    private layout: LayoutComponent,
    scrollDispatcher: ScrollDispatcher,
    ngZone: NgZone,
    @Optional() dir: Directionality,
  ) {
    super(layout.mainContent(), scrollDispatcher, ngZone, dir);
  }

  override getElementRef(): ElementRef<HTMLElement> {
    return this.layout.mainContent();
  }

  override measureBoundingClientRectWithScrollOffset(
    from: "left" | "top" | "right" | "bottom",
  ): number {
    return (
      this.layout.mainContent().nativeElement.getBoundingClientRect()[from] -
      this.measureScrollOffset(from)
    );
  }
}
