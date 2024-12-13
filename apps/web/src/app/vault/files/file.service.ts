import { Injectable, inject } from "@angular/core";
import { Observable, from, map, shareReplay } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { SubscriptionResponse } from "@bitwarden/common/billing/models/response/subscription.response";
import { ErrorResponse } from "@bitwarden/common/models/response/error.response";
import { EncryptService } from "@bitwarden/common/platform/abstractions/encrypt.service";
import { EncArrayBuffer } from "@bitwarden/common/platform/models/domain/enc-array-buffer";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { AttachmentView } from "@bitwarden/common/vault/models/view/attachment.view";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { KeyService } from "@bitwarden/key-management";

export type FileView = {
  cipher: CipherView;
  attachment: AttachmentView;
};

@Injectable({ providedIn: "root" })
export class FileService {
  private apiService = inject(ApiService);
  private cipherService = inject(CipherService);
  private encryptService = inject(EncryptService);
  private keyService = inject(KeyService);

  files$: Observable<FileView[]> = this.cipherService.cipherViews$.pipe(
    map((ciphers) =>
      Object.values(ciphers)
        .filter((cipher) => Array.isArray(cipher.attachments) && cipher.attachments.length > 0)
        .map((cipher) => cipher.attachments.map((attachment) => ({ cipher, attachment })))
        .flat(),
    ),
  );

  sub$: Observable<SubscriptionResponse> = from(this.apiService.getUserSubscription()).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  storagePercentage$: Observable<number> = this.sub$.pipe(
    map((sub) =>
      sub != null && sub.maxStorageGb ? +(100 * (sub.storageGb / sub.maxStorageGb)).toFixed(2) : 0,
    ),
  );

  getFileType(file: FileView): "image" | "pdf" | "text" | "unknown" {
    switch (file.attachment.fileName.split(".").at(-1)) {
      case "gif":
      case "jpeg":
      case "jpg":
        return "image";
      case "pdf":
        return "pdf";
      case "txt":
        return "text";
      default:
        return "unknown";
    }
  }

  async toBlob(file: FileView): Promise<Blob> {
    const { cipher, attachment } = file;

    let url: string;
    try {
      const attachmentDownloadResponse = await this.apiService.getAttachmentData(
        cipher.id,
        attachment.id,
        // this.emergencyAccessId,
      );
      url = attachmentDownloadResponse.url;
    } catch (e) {
      if (e instanceof ErrorResponse && (e as ErrorResponse).statusCode === 404) {
        url = attachment.url;
      } else if (e instanceof ErrorResponse) {
        throw new Error((e as ErrorResponse).getSingleMessage());
      } else {
        throw e;
      }
    }

    const response = await fetch(new Request(url, { cache: "no-store" }));
    if (response.status !== 200) {
      throw new Error("blob download error");
    }

    const encBuf = await EncArrayBuffer.fromResponse(response);
    const key =
      attachment.key != null
        ? attachment.key
        : await this.keyService.getOrgKey(cipher.organizationId);
    const decBuf = await this.encryptService.decryptToBytes(encBuf, key);
    return new Blob([decBuf]);
  }
}
