import { concatMap, filter, Observable } from "rxjs";

import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import {
  isExternalMessage,
  MessageListener,
  MessageSender,
} from "@bitwarden/common/platform/messaging";
import { DecryptedVaultStateProvider } from "@bitwarden/common/vault/state/abstractions/decrypted-vault-state-provider";
import {
  UPDATE_VAULT_STATE,
  UPDATE_VAULT_STATE_FINISHED,
  UpdateVaultStateMessage,
} from "@bitwarden/common/vault/state/foreground-decrypted-vault-state";

export class VaultStateListener {
  constructor(
    private readonly vaultStateProvider: DecryptedVaultStateProvider,
    private readonly messageSender: MessageSender,
    private readonly messageListener: MessageListener,
    private readonly logService: LogService,
  ) {}

  listener$(): Observable<void> {
    return this.messageListener.messages$(UPDATE_VAULT_STATE).pipe(
      filter((message) => isExternalMessage(message)),
      concatMap(async (msg) => {
        await this.updateVault(msg);
      }),
    );
  }

  private async updateVault(msg: UpdateVaultStateMessage) {
    const state = this.vaultStateProvider.getFromCache(msg.key);

    if (state == null) {
      this.messageSender.send(UPDATE_VAULT_STATE_FINISHED, {
        requestId: msg.requestId,
        success: false,
        errorMessage: `State not found for key ${msg.key}`,
      });
      return;
    }

    try {
      switch (msg.action) {
        case "decrypt":
          await state.decrypt(msg.clearCacheBeforeDecrypt);
          break;
        case "clear":
          await state.clear();
          break;
      }

      this.messageSender.send(UPDATE_VAULT_STATE_FINISHED, {
        requestId: msg.requestId,
        success: true,
        errorMessage: null,
      });
    } catch (err) {
      this.logService.warning("Error while updating vault state in VaultStateListener", err);
      this.messageSender.send(UPDATE_VAULT_STATE_FINISHED, {
        requestId: msg.requestId,
        success: false,
        errorMessage: err?.message ?? "Unknown error",
      });
      return;
    }
  }
}
