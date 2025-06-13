import { inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { signalStoreFeature, withComputed } from "@ngrx/signals";

/**
 * Exposes values from the Angular ActivatedRoute
 *
 * @returns A feature that provides access to route parameters as a computed signal.
 */
export function withActivatedRouteFeature() {
  return signalStoreFeature(
    withComputed((_store) => {
      const activatedRoute = inject(ActivatedRoute);

      return {
        activatedRouteParams: toSignal(activatedRoute.paramMap),
      };
    }),
  );
}
