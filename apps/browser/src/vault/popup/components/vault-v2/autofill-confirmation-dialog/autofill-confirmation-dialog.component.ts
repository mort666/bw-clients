import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";

import { UnionOfValues } from "@bitwarden/common/vault/types/union-of-values";
import {
  DIALOG_DATA,
  DialogConfig,
  DialogRef,
  ButtonModule,
  DialogService,
  DialogModule,
  TypographyModule,
  CalloutComponent,
  LinkModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

export interface AutofillConfirmationDialogParams {
  savedUrls?: string[];
  currentUrl: string | null;
}

export const AutofillConfirmationDialogResult = Object.freeze({
  AutofillAndUrlAdded: "added",
  AutofilledOnly: "autofilled",
  Canceled: "canceled",
} as const);

export type AutofillConfirmationDialogResultType = UnionOfValues<
  typeof AutofillConfirmationDialogResult
>;

@Component({
  templateUrl: "./autofill-confirmation-dialog.component.html",
  imports: [
    ButtonModule,
    CalloutComponent,
    CommonModule,
    DialogModule,
    I18nPipe,
    LinkModule,
    TypographyModule,
  ],
})
export class AutofillConfirmationDialogComponent {
  AutofillConfirmationDialogResult = AutofillConfirmationDialogResult;
  currentUrl: string | null = null;
  savedUrls: string[] = [];
  savedUrlsExpanded = false;

  constructor(
    @Inject(DIALOG_DATA) protected params: AutofillConfirmationDialogParams,
    private dialogRef: DialogRef,
  ) {
    this.currentUrl = params.currentUrl;
    this.savedUrls = params.savedUrls ?? [];
  }

  protected get savedUrlsListClass(): string {
    return this.savedUrlsExpanded
      ? ""
      : `tw-relative
         tw-max-h-24
         tw-overflow-hidden
         after:tw-pointer-events-none after:tw-content-['']
         after:tw-absolute after:tw-inset-x-0 after:tw-bottom-0
         after:tw-h-8 after:tw-bg-gradient-to-t
         after:tw-from-[var(--surface-bg,white)] after:tw-to-transparent
    `;
  }

  protected viewAllSavedUrls = () => {
    this.savedUrlsExpanded = true;
  };

  protected close = () => {
    this.dialogRef.close(AutofillConfirmationDialogResult.Canceled);
  };

  protected autofillAndAddUrl = () => {
    this.dialogRef.close(AutofillConfirmationDialogResult.AutofillAndUrlAdded);
  };

  protected autofillOnly = () => {
    this.dialogRef.close(AutofillConfirmationDialogResult.AutofilledOnly);
  };

  static open(
    dialogService: DialogService,
    config: DialogConfig<AutofillConfirmationDialogParams>,
  ) {
    return dialogService.open<AutofillConfirmationDialogResultType>(
      AutofillConfirmationDialogComponent,
      { ...config },
    );
  }
}
