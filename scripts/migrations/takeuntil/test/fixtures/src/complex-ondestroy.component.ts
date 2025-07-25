import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-complex",
  template: "<div>Complex Component</div>",
})
export class ComplexOnDestroyComponent implements OnInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.data$.pipe(takeUntil(this._destroy$)).subscribe();
  }

  ngOnDestroy() {
    // Complex cleanup - should NOT be removed
    this._destroy$.next();
    this._destroy$.complete();

    // Other cleanup logic
    this.cleanupResources();
    this.saveState();
  }

  private cleanupResources() {
    // eslint-disable-next-line no-console
    console.log("Cleaning up resources");
  }

  private saveState() {
    // eslint-disable-next-line no-console
    console.log("Saving state");
  }

  private service = { data$: new Subject() };
}
