import { OrganizationUserResetPasswordWithIdRequest } from "@bitwarden/admin-console/common";
import { WebauthnRotateCredentialRequest } from "@bitwarden/common/auth/models/request/webauthn-rotate-credential.request";
import { EncryptedString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SendWithIdRequest } from "@bitwarden/common/src/tools/send/models/request/send-with-id.request";
import { CipherWithIdRequest } from "@bitwarden/common/src/vault/models/request/cipher-with-id.request";
import { FolderWithIdRequest } from "@bitwarden/common/src/vault/models/request/folder-with-id.request";

import { EmergencyAccessWithIdRequest } from "../../../auth/emergency-access/request/emergency-access-update.request";

export class UpdateKeyRequest {
  constructor(
    readonly masterPasswordHash: string,
    readonly key: EncryptedString,
    readonly privateKey: EncryptedString,
  ) {}

  ciphers: CipherWithIdRequest[] = [];
  folders: FolderWithIdRequest[] = [];
  sends: SendWithIdRequest[] = [];
  emergencyAccessKeys: EmergencyAccessWithIdRequest[] = [];
  resetPasswordKeys: OrganizationUserResetPasswordWithIdRequest[] = [];
  webauthnKeys: WebauthnRotateCredentialRequest[] = [];
}
