import { CommonModule } from "@angular/common";
import { Component, effect, input, untracked } from "@angular/core";

import {
  ButtonModule,
  Icon,
  IconModule,
  ItemModule,
  TypographyModule,
} from "@bitwarden/components";

import { AchievementIcon } from "./icons/achievement.icon";

@Component({
  selector: "achievement-item",
  templateUrl: "achievement-item.component.html",
  standalone: true,
  imports: [CommonModule, ItemModule, ButtonModule, IconModule, TypographyModule],
})
export class AchievementItem {
  icon = input<Icon>(AchievementIcon);
  protected iconStyle: string = "tw-grayscale";

  title = input.required<string>();
  description = input.required<string>();

  earned = input<boolean>(false);
  progress = input<number>(0);
  date = input<Date>();

  protected cardClass: string;
  constructor() {
    effect(() => {
      const earned = this.earned();
      const progress = this.progress();

      untracked(() => {
        if (earned) {
          this.cardClass = "tw-bg-success-100";
          this.iconStyle = "";
        } else if (progress > 0) {
          this.cardClass = "tw-bg-info-100";
          this.iconStyle = "tw-grayscale";
        } else {
          this.cardClass = "";
          this.iconStyle = "tw-grayscale";
        }
      });
    });
  }
}
