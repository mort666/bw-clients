import { Directive, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Directive({
  selector: "[appExample]",
})
export class ExampleDirective implements OnInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  ngOnInit() {
    // This should be migrated
    this.service.data$.pipe(takeUntil(this._destroy$)).subscribe();
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private service = { data$: new Subject() };
}
