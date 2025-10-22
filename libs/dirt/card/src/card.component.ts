// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { TypographyModule, CardComponent as BitCardComponent } from "@bitwarden/components";

@Component({
  selector: "dirt-card",
  templateUrl: "./card.component.html",
  imports: [CommonModule, TypographyModule, JslibModule, BitCardComponent],
})
export class CardComponent {
  /**
   * The title of the card
   */
  @Input() title: string;
  /**
   * The current value of the card as emphasized text
   */
  @Input() value: number;
  /**
   * The maximum value of the card
   */
  @Input() maxValue: number;
}
