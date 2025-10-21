import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Router } from "@angular/router";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ButtonModule, DialogModule, DialogService, TypographyModule } from "@bitwarden/components";

import BrowserPopupUtils from "../../../../platform/browser/browser-popup-utils";

@Component({
  selector: "send-file-popout-dialog",
  templateUrl: "./send-file-popout-dialog.component.html",
  imports: [JslibModule, CommonModule, DialogModule, ButtonModule, TypographyModule],
})
export class SendFilePopoutDialogComponent {
  constructor(
    private dialogService: DialogService,
    private router: Router,
  ) {}

  async popOutWindow() {
    await BrowserPopupUtils.openCurrentPagePopout(window);
  }

  async close() {
    this.dialogService.closeAll();
    // the current view exposes a file selector, ensure the view is popped to avoid using it outside of a popout
    await this.router.navigate(["/tabs/send"]);
  }
}
