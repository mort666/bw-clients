import { Injectable, OnDestroy } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

@Injectable()
export class DataService implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor() {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.externalService.stream$.pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private externalService = { stream$: new Subject() };
}
