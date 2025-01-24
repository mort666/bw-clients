// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { DialogRef } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BehaviorSubject, firstValueFrom, map, switchMap } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { UserId } from "@bitwarden/common/types/guid";
import { ButtonModule, DialogModule, DialogService } from "@bitwarden/components";
import { GeneratorHistoryService } from "@bitwarden/generator-history";

import { CredentialGeneratorHistoryComponent as CredentialGeneratorHistoryToolsComponent } from "./credential-generator-history.component";
import { EmptyCredentialHistoryComponent } from "./empty-credential-history.component";

@Component({
  templateUrl: "credential-generator-history-dialog.component.html",
  standalone: true,
  imports: [
    ButtonModule,
    CommonModule,
    JslibModule,
    DialogModule,
    CredentialGeneratorHistoryToolsComponent,
    EmptyCredentialHistoryComponent,
  ],
})
export class CredentialGeneratorHistoryDialogComponent {
  @Input() account: Account | null = null;
  protected readonly hasHistory$ = new BehaviorSubject<boolean>(false);
  protected readonly userId$ = new BehaviorSubject<UserId>(null);

  constructor(
    private history: GeneratorHistoryService,
    private dialogService: DialogService,
    private dialogRef: DialogRef,
  ) {
    if (this.account) {
      this.userId$.next(this.account.id);
    }

    this.userId$
      .pipe(
        takeUntilDestroyed(),
        switchMap((id) => id && this.history.credentials$(id)),
        map((credentials) => credentials.length > 0),
      )
      .subscribe(this.hasHistory$);
  }

  /** closes the dialog */
  protected close() {
    this.dialogRef.close();
  }

  /** Launches clear history flow */
  protected async clear() {
    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "clearGeneratorHistoryTitle" },
      content: { key: "cleargGeneratorHistoryDescription" },
      type: "warning",
      acceptButtonText: { key: "clearHistory" },
      cancelButtonText: { key: "cancel" },
    });

    if (confirmed) {
      await this.history.clear(await firstValueFrom(this.userId$));
    }
  }
}
