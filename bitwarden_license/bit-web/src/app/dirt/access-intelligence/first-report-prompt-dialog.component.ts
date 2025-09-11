import { Component } from "@angular/core";

import { ButtonModule, DialogModule, DialogService, TypographyModule } from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

@Component({
  templateUrl: "./first-report-prompt-dialog.component.html",
  imports: [ButtonModule, DialogModule, TypographyModule, I18nPipe],
})
export class FirstReportPromptDialogComponent {
  static open(dialogService: DialogService) {
    return dialogService.open<boolean>(FirstReportPromptDialogComponent);
  }
}
