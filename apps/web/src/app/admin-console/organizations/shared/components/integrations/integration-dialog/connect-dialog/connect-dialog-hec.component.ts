import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";

import { DIALOG_DATA, DialogConfig, DialogRef, DialogService } from "@bitwarden/components";
import { SharedModule } from "@bitwarden/web-vault/app/shared";

import { Integration } from "../../models";

export type HecConnectDialogParams = {
  settings: Integration;
};

export interface HecConnectDialogResult {
  integrationSettings: Integration;
  url: string;
  bearerToken: string;
  index: string;
  service: string;
  success: HecConnectDialogResultStatusType | null;
}

export const HecConnectDialogResultStatus = {
  Edited: "edit",
  Delete: "delete",
} as const;

export type HecConnectDialogResultStatusType =
  (typeof HecConnectDialogResultStatus)[keyof typeof HecConnectDialogResultStatus];

@Component({
  templateUrl: "./connect-dialog-hec.component.html",
  imports: [SharedModule],
})
export class ConnectHecDialogComponent implements OnInit {
  loading = false;
  formGroup = this.formBuilder.group({
    url: ["", [Validators.required, Validators.pattern("https?://.+")]],
    bearerToken: ["", Validators.required],
    index: ["", Validators.required],
    service: ["", Validators.required],
  });

  constructor(
    @Inject(DIALOG_DATA) protected connectInfo: HecConnectDialogParams,
    protected formBuilder: FormBuilder,
    private dialogRef: DialogRef<HecConnectDialogResult>,
    private dialogService: DialogService,
  ) {}

  ngOnInit(): void {
    this.formGroup.patchValue({
      url: this.connectInfo.settings.HecConfiguration?.uri || "",
      bearerToken: this.connectInfo.settings.HecConfiguration?.token || "",
      index: this.connectInfo.settings.HecConfigurationTemplate?.index || "",
      service: this.connectInfo.settings.name,
    });
  }

  isUpdateAvailable(): boolean {
    return !!this.connectInfo.settings.HecConfiguration;
  }

  canDelete(): boolean {
    return !!this.connectInfo.settings.HecConfiguration;
  }

  getSettingsAsJson(configuration: string) {
    try {
      return JSON.parse(configuration);
    } catch {
      return {};
    }
  }

  submit = async (): Promise<void> => {
    const result = this.getHecConnectDialogResult(HecConnectDialogResultStatus.Edited);

    this.dialogRef.close(result);

    return;
  };

  delete = async (): Promise<void> => {
    const confirmed = await this.dialogService.openSimpleDialog({
      title: { key: "deleteItem" },
      content: {
        key: "deleteItemConfirmation",
      },
      type: "warning",
    });

    if (confirmed) {
      // Perform the deletion logic here
      const result = this.getHecConnectDialogResult(HecConnectDialogResultStatus.Delete);
      this.dialogRef.close(result);
    }
  };

  private getHecConnectDialogResult(
    status: HecConnectDialogResultStatusType,
  ): HecConnectDialogResult {
    const formJson = this.formGroup.getRawValue();

    return {
      integrationSettings: this.connectInfo.settings,
      url: formJson.url || "",
      bearerToken: formJson.bearerToken || "",
      index: formJson.index || "",
      service: formJson.service || "",
      success: status,
    };
  }
}

export function openHecConnectDialog(
  dialogService: DialogService,
  config: DialogConfig<HecConnectDialogParams, DialogRef<HecConnectDialogResult>>,
) {
  return dialogService.open<HecConnectDialogResult>(ConnectHecDialogComponent, config);
}
