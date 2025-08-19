import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, Inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import {
  ButtonModule,
  CalloutModule,
  FormFieldModule,
  Option,
  SelectModule,
  DialogService,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { HeaderModule } from "../../layouts/header/header.module";
import { SharedModule } from "../../shared";
import {
  DeDuplicateService,
  UriMatchStrategy,
  type DuplicateOperationWarnings,
} from "../../vault/services/de-duplicate.service";

@Component({
  selector: "app-de-duplicate",
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    HeaderModule,
    ButtonModule,
    CalloutModule,
    FormFieldModule,
    SelectModule,
    FormsModule,
    I18nPipe,
  ],
  templateUrl: "./de-duplicate.component.html",
})
export class DeDuplicateComponent {
  loading = false;
  callout: { type: "success" | "warning"; title?: string; message: string } | null = null;
  warningsCallout: {
    type: "warning";
    title?: string;
    message: string;
    detailsButtonText?: string;
    details?: string[];
  } | null = null;
  private warnings: DuplicateOperationWarnings | null = null;

  selectedStrategy: UriMatchStrategy = "Base";
  strategyOptions: Option<UriMatchStrategy>[] = [
    { label: this.i18nService.t("baseDomain"), value: "Base" },
    { label: this.i18nService.t("hostName"), value: "Hostname" },
    { label: this.i18nService.t("host"), value: "Host" },
    { label: this.i18nService.t("exact"), value: "Exact" },
  ];

  constructor(
    @Inject(DeDuplicateService) private deDuplicateService: DeDuplicateService,
    private i18nService: I18nService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService,
  ) {}

  findDuplicates = async () => {
    this.callout = null;
    this.warningsCallout = null;

    // Allow progress spinner to appear on button
    await new Promise<void>((r) => setTimeout(r, 100));

    try {
      const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
      const result = await this.deDuplicateService.findAndHandleDuplicates(userId, {
        uriStrategy: this.selectedStrategy,
      });

      if (result.setsFound === 0) {
        this.callout = {
          type: "success",
          title: this.i18nService.t("deDuplicationComplete"),
          message: this.i18nService.t("noDuplicatesFound"),
        };
      } else {
        const trashed = result.trashed ?? 0;
        const permanentlyDeleted = result.permanentlyDeleted ?? 0;
        const parts: string[] = [];
        parts.push(`${trashed} ${this.i18nService.t("itemsTrashed")}`);
        parts.push(`${permanentlyDeleted} ${this.i18nService.t("itemsPermanentlyDeleted")}`);
        this.callout = {
          type: "success",
          title: this.i18nService.t("deDuplicationComplete"),
          message: parts.join(", ") + ".",
        };
      }

      // Summarize warnings if any
      const w = result.warnings;
      if (w && (w.exactFallbackCount || w.unparseableUriCount || w.permissionDeniedCount)) {
        const warningParts: string[] = [];
        if (w.exactFallbackCount) {
          const key =
            w.exactFallbackCount === 1 ? "duplicateExactFallback" : "duplicateExactFallbackPlural";
          warningParts.push(this.i18nService.t(key, w.exactFallbackCount));
        }
        if (w.unparseableUriCount) {
          const key =
            w.unparseableUriCount === 1
              ? "duplicateUnparseableUris"
              : "duplicateUnparseableUrisPlural";
          warningParts.push(this.i18nService.t(key, w.unparseableUriCount));
        }
        if (w.permissionDeniedCount) {
          const key =
            w.permissionDeniedCount === 1
              ? "duplicatePermissionDenied"
              : "duplicatePermissionDeniedPlural";
          warningParts.push(this.i18nService.t(key, w.permissionDeniedCount));
        }
        const title = this.i18nService.t("duplicateWarningsTitle");
        this.warnings = w;
        this.warningsCallout = {
          type: "warning",
          title,
          message: warningParts.join(" \u2022 "),
          detailsButtonText:
            (w.unparseableUris?.length || 0) > 0 ||
            (w.exactFallbackSamples?.length || 0) > 0 ||
            (w.permissionDeniedNames?.length || 0) > 0
              ? this.i18nService.t("duplicateWarningsDetailsButton")
              : undefined,
          details: w.unparseableUris,
        };
      }
    } catch (e) {
      const message = this.i18nService.t("duplicateError");
      this.callout = {
        type: "warning",
        title: message,
        message: `${message}: ${e}`,
      };
    } finally {
      this.cdr.markForCheck?.();
    }
  };

  async openWarningsDetails() {
    const w = this.warnings;
    const bodyLines: string[] = [];
    if (w?.unparseableUris?.length) {
      bodyLines.push(this.i18nService.t("duplicateWarningsDialogUnparseableTitle"));
      bodyLines.push(...w.unparseableUris.slice(0, 10).map((d) => `• ${d}`));
      bodyLines.push("");
    }
    if (w?.exactFallbackSamples?.length) {
      bodyLines.push(this.i18nService.t("duplicateWarningsDialogExactSamplesTitle"));
      bodyLines.push(...w.exactFallbackSamples.slice(0, 10).map((d) => `• ${d}`));
      bodyLines.push("");
    }
    if (w?.permissionDeniedNames?.length) {
      bodyLines.push(this.i18nService.t("duplicateWarningsDialogPermissionDeniedTitle"));
      bodyLines.push(...w.permissionDeniedNames.slice(0, 10).map((n) => `• ${n}`));
      bodyLines.push("");
    }
    bodyLines.push(this.i18nService.t("duplicateWarningsDialogExactHelp"));
    bodyLines.push(this.i18nService.t("duplicateWarningsDialogPermHelp"));
    await this.dialogService.openSimpleDialog({
      title: this.i18nService.t("duplicateWarningsDialogTitle"),
      content: bodyLines.join("\n"),
      type: "info",
      acceptButtonText: { key: "ok" },
    });
  }
}
