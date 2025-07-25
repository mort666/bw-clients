/* eslint-disable rxjs/no-exposed-subjects */
import { Component, OnDestroy, OnInit, inject } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-multiple",
  template: "<div>Multiple TakeUntil Component</div>",
})
export class MultipleTakeUntilComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private _destroy = new Subject<void>();

  constructor() {
    // Constructor usage - should become takeUntilDestroyed()
    this.stream1$.pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnInit() {
    // Method usage - should become takeUntilDestroyed(this.destroyRef)
    this.stream2$.pipe(takeUntil(this._destroy)).subscribe();
    this.stream3$.pipe(takeUntil(this.destroy$)).subscribe();
  }

  private setupStreams() {
    this.stream4$.pipe(takeUntil(this._destroy)).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this._destroy.next();
    this._destroy.complete();
  }

  // Mock streams
  private stream1$ = inject(MockService).stream1$;
  private stream2$ = inject(MockService).stream2$;
  private stream3$ = inject(MockService).stream3$;
  private stream4$ = inject(MockService).stream4$;
}

class MockService {
  stream1$ = new Subject();
  stream2$ = new Subject();
  stream3$ = new Subject();
  stream4$ = new Subject();
}
