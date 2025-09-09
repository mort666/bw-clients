import { Component, inject } from "@angular/core";

import {
  ButtonModule,
  DialogModule,
  DialogRef,
  DialogService,
  TypographyModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

@Component({
  templateUrl: "./first-report-prompt-dialog.component.html",
  imports: [ButtonModule, DialogModule, TypographyModule, I18nPipe],
})
export class FirstReportPromptDialogComponent {
  private dialogRef = inject(DialogRef);

  static open(dialogService: DialogService) {
    return dialogService.open<boolean>(FirstReportPromptDialogComponent);
  }

  runReport(): void {
    // Simply close the dialog with 'true' to indicate user wants to run report
    this.dialogRef.close(true);
  }
}
