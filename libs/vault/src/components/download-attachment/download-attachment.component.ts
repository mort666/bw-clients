// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NEVER, firstValueFrom, switchMap } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { ErrorResponse } from "@bitwarden/common/models/response/error.response";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { FileDownloadService } from "@bitwarden/common/platform/abstractions/file-download/file-download.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { EncArrayBuffer } from "@bitwarden/common/platform/models/domain/enc-array-buffer";
import { StateProvider } from "@bitwarden/common/platform/state";
import { CipherId, EmergencyAccessId, OrganizationId } from "@bitwarden/common/types/guid";
import { OrgKey } from "@bitwarden/common/types/key";
import { CipherEncryptionService } from "@bitwarden/common/vault/abstractions/cipher-encryption.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { AttachmentView } from "@bitwarden/common/vault/models/view/attachment.view";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { AsyncActionsModule, IconButtonModule, ToastService } from "@bitwarden/components";
import { KeyService } from "@bitwarden/key-management";

@Component({
  standalone: true,
  selector: "app-download-attachment",
  templateUrl: "./download-attachment.component.html",
  imports: [AsyncActionsModule, CommonModule, JslibModule, IconButtonModule],
})
export class DownloadAttachmentComponent {
  /** Attachment to download */
  @Input({ required: true }) attachment: AttachmentView;

  /** The cipher associated with the attachment */
  @Input({ required: true }) cipher: CipherView;

  // When in view mode, we will want to check for the master password reprompt
  @Input() checkPwReprompt?: boolean = false;

  // Required for fetching attachment data when viewed from cipher via emergency access
  @Input() emergencyAccessId?: EmergencyAccessId;

  /** The organization key if the cipher is associated with one */
  private orgKey: OrgKey | null = null;

  constructor(
    private i18nService: I18nService,
    private apiService: ApiService,
    private fileDownloadService: FileDownloadService,
    private toastService: ToastService,
    private encryptService: EncryptService,
    private stateProvider: StateProvider,
    private keyService: KeyService,
    private configService: ConfigService,
    private cipherService: CipherService,
    private cipherEncryptionService: CipherEncryptionService,
  ) {
    this.stateProvider.activeUserId$
      .pipe(
        switchMap((userId) => (userId !== null ? this.keyService.orgKeys$(userId) : NEVER)),
        takeUntilDestroyed(),
      )
      .subscribe((data: Record<OrganizationId, OrgKey> | null) => {
        if (data) {
          this.orgKey = data[this.cipher.organizationId as OrganizationId];
        }
      });
  }

  /** Download the attachment */
  download = async () => {
    let url: string;

    try {
      const attachmentDownloadResponse = await this.apiService.getAttachmentData(
        this.cipher.id,
        this.attachment.id,
        this.emergencyAccessId,
      );
      url = attachmentDownloadResponse.url;
    } catch (e) {
      if (e instanceof ErrorResponse && (e as ErrorResponse).statusCode === 404) {
        url = this.attachment.url;
      } else if (e instanceof ErrorResponse) {
        throw new Error((e as ErrorResponse).getSingleMessage());
      } else {
        throw e;
      }
    }

    const response = await fetch(new Request(url, { cache: "no-store" }));
    if (response.status !== 200) {
      this.toastService.showToast({
        variant: "error",
        title: null,
        message: this.i18nService.t("errorOccurred"),
      });
      return;
    }

    try {
      const decBuf = await this.getDecryptedBuffer(response);

      this.fileDownloadService.download({
        fileName: this.attachment.fileName,
        blobData: decBuf,
      });
      // FIXME: Remove when updating file. Eslint update
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      this.toastService.showToast({
        variant: "error",
        title: null,
        message: this.i18nService.t("errorOccurred"),
      });
    }
  };

  private async getDecryptedBuffer(response: Response): Promise<Uint8Array> {
    const useSdkDecryption = await this.configService.getFeatureFlag(
      FeatureFlag.PM19941MigrateCipherDomainToSdk,
    );

    if (useSdkDecryption) {
      const userId = await firstValueFrom(this.stateProvider.activeUserId$);
      const ciphersData = await firstValueFrom(this.cipherService.ciphers$(userId));
      const cipherDomain = new Cipher(ciphersData[this.cipher.id as CipherId]);
      const attachmentDomain = cipherDomain.attachments?.find((a) => a.id === this.attachment.id);

      const encArrayBuf = new Uint8Array(await response.arrayBuffer());
      return await this.cipherEncryptionService.decryptAttachmentContent(
        cipherDomain,
        attachmentDomain,
        encArrayBuf,
        userId,
      );
    }

    const encBuf = await EncArrayBuffer.fromResponse(response);
    const key = this.attachment.key != null ? this.attachment.key : this.orgKey;
    return await this.encryptService.decryptToBytes(encBuf, key);
  }
}
