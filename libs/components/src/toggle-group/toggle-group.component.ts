import { CommonModule } from "@angular/common";
import {
  booleanAttribute,
  Component,
  EventEmitter,
  Output,
  input,
  model,
  signal,
  OnDestroy,
} from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { MenuModule, MenuTriggerForDirective } from "../menu";
import { media } from "../utils/media-query";

let nextId = 0;

@Component({
  selector: "bit-toggle-group",
  templateUrl: "./toggle-group.component.html",
  imports: [CommonModule, MenuModule, MenuTriggerForDirective],
})
export class ToggleGroupComponent<TValue = unknown> implements OnDestroy {
  private id = nextId++;
  name = `bit-toggle-group-${this.id}`;
  selectedLabel = signal<string | null>(null);

  readonly fullWidth = input<boolean, unknown>(undefined, { transform: booleanAttribute });
  readonly smallScreenQuery = input<string>("(max-width: 480px)");
  readonly selected = model<TValue>();
  @Output() selectedChange = new EventEmitter<TValue>();

  private isSmallScreen$ = media(this.smallScreenQuery());
  isSmallScreen = signal(false);
  private destroy$ = new Subject<void>();

  constructor() {
    this.isSmallScreen$.pipe(takeUntil(this.destroy$)).subscribe((isSmall) => {
      this.isSmallScreen.set(isSmall);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInputInteraction({ label, value }: { label: string; value: TValue }) {
    this.selectedLabel.set(label);
    this.selected.set(value);
    this.selectedChange.emit(value);
  }
}
