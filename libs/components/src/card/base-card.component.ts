import { Component } from "@angular/core";

import { BaseCardDirective } from "./base-card.directive";

@Component({
  selector: "bit-base-card",
  template: `<ng-content></ng-content>`,
  hostDirectives: [BaseCardDirective],
})
export class BaseCardComponent {}
