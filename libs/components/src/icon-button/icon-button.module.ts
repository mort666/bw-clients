import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { BadgeModule } from "../badge";

import { BitIconButtonComponent } from "./icon-button.component";

@NgModule({
  imports: [CommonModule, BadgeModule],
  declarations: [BitIconButtonComponent],
  exports: [BitIconButtonComponent],
})
export class IconButtonModule {}
