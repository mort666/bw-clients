import { input, Component, booleanAttribute } from "@angular/core";

import { SharedModule } from "../shared";

@Component({
  selector: "bit-chip",
  templateUrl: "chip.component.html",
  imports: [SharedModule],
})
export class ChipComponent {
  protected readonly isInteractive = input<boolean>(booleanAttribute(false));
  protected readonly isDisabled = input<boolean>(booleanAttribute(false));
  protected readonly isDismissible = input<boolean>(booleanAttribute(false));
  protected readonly isSelected = input<boolean>(booleanAttribute(false));
}
