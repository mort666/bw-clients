import { Component, DestroyRef, inject, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subject } from "rxjs";

@Component({
  selector: "app-already-migrated",
  template: "<div>Already Migrated Component</div>",
})
export class AlreadyMigratedComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.data$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private service = { data$: new Subject() };
}
