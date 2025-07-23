import { firstValueFrom } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { KdfRequest } from "@bitwarden/common/models/request/kdf.request";
import { UserId } from "@bitwarden/common/types/guid";
// eslint-disable-next-line no-restricted-imports
import { KdfConfig, KeyService } from "@bitwarden/key-management";

import { MasterPasswordServiceAbstraction } from "../../master-password/abstractions/master-password.service.abstraction";
import { ChangeKdfServiceAbstraction } from "../abstractions/change-kdf-service";

export class ChangeKdfService implements ChangeKdfServiceAbstraction {
  constructor(private apiService: ApiService, private masterPasswordService: MasterPasswordServiceAbstraction, private keyService: KeyService) { }

  async updateUserKdfParams(masterPassword: string, kdf: KdfConfig, userId: UserId): Promise<void> {
    const userKey = await firstValueFrom(this.keyService.userKey$(userId));
    const salt = await firstValueFrom(this.masterPasswordService.saltForAccount$(userId));
    const authenticationData = await this.masterPasswordService.makeMasterPasswordAuthenticationData(masterPassword, kdf, salt);
    const unlockData = await this.masterPasswordService.makeMasterPasswordUnlockData(masterPassword, kdf, salt, userKey);
    const request = new KdfRequest(authenticationData, unlockData);
    return this.apiService.send("POST", "/accounts/kdf", request, true, false);
  }
}
