import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-mixed",
  template: "<div>Mixed Usage Component</div>",
})
export class MixedUsageComponent implements OnInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  ngOnInit() {
    // This should be migrated
    this.service.data1$.pipe(takeUntil(this._destroy$)).subscribe();
  }

  private setupOtherSubscriptions() {
    // This destroy subject is also used elsewhere, so shouldn't be removed
    this.service.data2$.pipe(takeUntil(this._destroy$)).subscribe();
    this.handleCustomLogic(this._destroy$);
  }

  private handleCustomLogic(destroySubject: Subject<void>) {
    // Custom logic using the destroy subject
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil
    destroySubject.subscribe(() => {
      // eslint-disable-next-line no-console
      console.log("Custom cleanup logic");
    });
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private service = {
    data1$: new Subject(),
    data2$: new Subject(),
  };
}
