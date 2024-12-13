import { DIALOG_DATA } from "@angular/cdk/dialog";
import { Component, OnInit, inject } from "@angular/core";

import {
  AsyncActionsModule,
  ButtonModule,
  DialogModule,
  DialogService,
} from "@bitwarden/components";

import { SharedModule } from "../../shared";

import { FileService } from "./file.service";
import { FileView } from "./files.component";

export type FilePreviewDialogData = {
  file: FileView;
};

@Component({
  standalone: true,
  templateUrl: "file-preview-dialog.component.html",
  imports: [SharedModule, DialogModule, ButtonModule, AsyncActionsModule],
})
export class FilePreviewDialogComponent implements OnInit {
  protected data = inject(DIALOG_DATA) as FilePreviewDialogData;

  private fileService = inject(FileService);

  protected srcUrl?: string;
  protected blob?: Blob;

  protected get fileType(): string {
    return this.fileService.getFileType(this.data.file);
  }

  protected get icon(): `bwi-${string}` {
    switch (this.fileType) {
      case "image":
        return "bwi-camera";
      case "pdf":
        return "bwi-pdf";
      case "text":
        return "bwi-file-text";
      default:
        return "bwi-file";
    }
  }

  async ngOnInit() {
    this.blob = await this.fileService.toBlob(this.data.file);
    this.srcUrl = URL.createObjectURL(this.blob);
  }

  static open(dialogService: DialogService, file: FileView) {
    dialogService.open(FilePreviewDialogComponent, {
      data: {
        file,
      },
    });
  }
}
