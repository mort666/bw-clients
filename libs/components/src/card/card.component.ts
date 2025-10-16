import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import { BaseCardDirective } from "./base-card.directive";

export const CardSize = {
  Small: "small",
  Default: "default",
  Large: "large",
} as const;

export type CardSize = (typeof CardSize)[keyof typeof CardSize];

const cardStyles: Record<CardSize, string> = {
  [CardSize.Small]: "tw-p-3",
  [CardSize.Default]: "tw-p-6",
  [CardSize.Large]: "tw-p-8 !tw-rounded-2xl",
};

@Component({
  selector: "bit-card",
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "cardPaddingStyle()",
  },
  hostDirectives: [BaseCardDirective],
})
export class CardComponent {
  readonly size = input<CardSize>(CardSize.Default);

  private cardPaddingStyle = computed(
    () => cardStyles[this.size()] || cardStyles[CardSize.Default],
  );
}
