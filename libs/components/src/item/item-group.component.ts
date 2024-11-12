import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "bit-item-group",
  standalone: true,
  imports: [],
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "tw-block tw-flex tw-flex-col tw-gap-1.5 bit-compact:tw-gap-0",
  },
})
export class ItemGroupComponent {}
