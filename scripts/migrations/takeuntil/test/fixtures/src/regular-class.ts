// This file should NOT be migrated as it's not an Angular class
import { Subject, takeUntil } from "rxjs";

export class RegularClass {
  private _destroy$ = new Subject<void>();

  setupStreams() {
    this.stream$.pipe(takeUntil(this._destroy$)).subscribe();
  }

  private stream$ = new Subject();
}
