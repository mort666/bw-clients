import { CdkScrollable } from "@angular/cdk/scrolling";
import { Injector, Signal, inject, runInInjectionContext } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

export type ScrollState = {
  /** `true` when the scrollbar is not at the top-most position */
  top: Signal<boolean>;

  /** `true` when the scrollbar is not at the bottom-most position */
  bottom: Signal<boolean>;
};

/**
 * Check if a `CdkScrollable` instance has been scrolled
 * @param scrollable The element to check
 * @param injector An optional injector; needed if called from outside an injection context
 * @returns {ScrollState}
 */
export const hasScrolledFrom = (scrollable: CdkScrollable, injector?: Injector): ScrollState => {
  const _injector = injector ?? inject(Injector);
  const scrollState$ = scrollable.elementScrolled().pipe(
    map(() => ({
      top: scrollable.measureScrollOffset("top") > 0,
      bottom: scrollable.measureScrollOffset("bottom") > 0,
    })),
  );

  return runInInjectionContext(_injector, () => ({
    top: toSignal(scrollState$.pipe(map(($) => $.top)), { initialValue: false }),
    bottom: toSignal(scrollState$.pipe(map(($) => $.bottom)), { initialValue: false }),
  }));
};
