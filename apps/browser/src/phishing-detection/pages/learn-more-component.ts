// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AnonLayoutComponent } from "@bitwarden/auth/angular";
import { ButtonModule } from "@bitwarden/components";

import { PopOutComponent } from "../../platform/popup/components/pop-out.component";
import { PopupPageComponent } from "../../platform/popup/layout/popup-page.component";

@Component({
  standalone: true,
  templateUrl: "learn-more-component.html",
  imports: [
    AnonLayoutComponent,
    CommonModule,
    PopOutComponent,
    PopupPageComponent,
    PopupPageComponent,
    CommonModule,
    JslibModule,
    ButtonModule,
  ],
})
export class LearnMoreComponent {
  constructor(private activatedRoute: ActivatedRoute) {}

  closeTab(): void {
    globalThis.close();
  }
}
