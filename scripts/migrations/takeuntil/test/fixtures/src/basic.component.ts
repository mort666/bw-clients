import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-basic",
  template: "<div>Basic Component</div>",
})
export class BasicComponent implements OnInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  ngOnInit() {
    // @ts-expect-error text fixture
    this.someService.data$.pipe(takeUntil(this._destroy$)).subscribe((data) => {
      // eslint-disable-next-line no-console
      console.log(data);
    });
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
