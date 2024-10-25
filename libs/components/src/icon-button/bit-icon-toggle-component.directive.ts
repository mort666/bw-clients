import { NgIf } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { BadgeModule } from "../badge";

import { focusRing, IconButtonSize } from "./icon-button.component";
import { IconButtonModule } from "./icon-button.module";

@Component({
  selector: "bit-icon-toggle",
  template: `
    <button
      [class]="buttonClassList"
      (click)="onClick()"
      [bitIconButton]="icon"
      [berry]="berry"
      berryVariant="danger"
      [size]="size"
      buttonType="unstyled"
    ></button>
  `,
  host: {
    class: "tw-relative",
  },
  standalone: true,
  imports: [IconButtonModule, BadgeModule, NgIf],
})
export class BitIconToggleComponent {
  @Input({ required: true }) icon: string;

  @Input()
  toggled = false;

  @Input()
  size: IconButtonSize = "default";

  @Input()
  berry: number | null;

  @Output()
  toggledChange = new EventEmitter<boolean>();

  get buttonClassList(): string[] {
    return this.toggled
      ? [
          "tw-bg-text-muted",
          "tw-text-contrast",
          "focus-visible:before:tw-ring-primary-700",
          ...focusRing,
        ]
      : [
          "tw-bg-transparent",
          "tw-text-muted",
          "tw-border-transparent",
          "focus-visible:before:tw-ring-primary-700",
          ...focusRing,
        ];
  }

  onClick() {
    this.toggled = !this.toggled;
    this.toggledChange.emit(this.toggled);
  }
}
