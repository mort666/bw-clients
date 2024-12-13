import { Component, OnInit, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import { AttachmentView } from "@bitwarden/common/vault/models/view/attachment.view";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  DialogService,
  NoItemsModule,
  SearchModule,
  TableDataSource,
  TableModule,
} from "@bitwarden/components";

import { HeaderModule } from "../../layouts/header/header.module";
import { SharedModule } from "../../shared";

import { FilePreviewDialogComponent } from "./file-preview-dialog.component";
import { FileService } from "./file.service";

export type FileView = {
  cipher: CipherView;
  attachment: AttachmentView;
};

@Component({
  standalone: true,
  templateUrl: "files.component.html",
  imports: [SharedModule, HeaderModule, TableModule, SearchModule, NoItemsModule],
})
export class FilesComponent implements OnInit {
  protected fileService = inject(FileService);
  private dialogService = inject(DialogService);

  protected tableDataSource = new TableDataSource();

  constructor() {
    this.fileService.files$.pipe(takeUntilDestroyed()).subscribe((files) => {
      this.tableDataSource.data = files;
    });
  }

  async ngOnInit() {}

  protected openFilePreview(file: FileView) {
    FilePreviewDialogComponent.open(this.dialogService, file);
  }
}
