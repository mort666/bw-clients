import { filter, firstValueFrom, Observable, ReplaySubject, share, switchMap, timer } from "rxjs";

import {
  CommandDefinition,
  MessageListener,
  MessageSender,
} from "@bitwarden/common/platform/messaging";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { ActiveUserState, StateProvider } from "@bitwarden/common/platform/state";

import { DecryptedVaultState } from "./abstractions/decrypted-vault-state";
import { DecryptedVaultStateDefinition } from "./decrypted-vault-state-definition";
import { DecryptionStatus, HasId, VaultRecord } from "./decrypted-vault-state-types";

export type UpdateVaultStateFinishedMessage = {
  requestId: string;
  success: boolean;
  errorMessage: string;
};

export const UPDATE_VAULT_STATE_FINISHED = new CommandDefinition<UpdateVaultStateFinishedMessage>(
  "updateVaultStateFinished",
);

export type UpdateVaultStateMessage = {
  key: string;
  action: "decrypt" | "clear";
  clearCacheBeforeDecrypt?: boolean;
  requestId: string;
};

export const UPDATE_VAULT_STATE = new CommandDefinition<UpdateVaultStateMessage>(
  "updateVaultState",
);

export class ForegroundDecryptedVaultState<TInput extends HasId, TOutput extends HasId>
  implements DecryptedVaultState<TOutput>
{
  private state: ActiveUserState<VaultRecord<string, TOutput>>;
  private statusState: ActiveUserState<DecryptionStatus>;

  state$: Observable<VaultRecord<string, TOutput>>;
  status$: Observable<DecryptionStatus>;

  constructor(
    stateProvider: StateProvider,
    private readonly input$: Observable<VaultRecord<string, TInput>>,
    readonly definition: DecryptedVaultStateDefinition<TInput, TOutput>,
    private messageSender: MessageSender,
    private messageListener: MessageListener,
  ) {
    this.state = stateProvider.getActive(definition.toKeyDefinition());
    this.statusState = stateProvider.getActive(definition.toStatusKeyDefinition());

    this.state$ = this.input$.pipe(
      switchMap(async (_) => {
        await this.decrypt(false);
      }),
      switchMap(() => this.state.state$),
      share({
        connector: () => new ReplaySubject<VaultRecord<string, TOutput> | null>(1),
        resetOnRefCountZero: () => timer(definition.options.cleanupDelayMs),
      }),
    );

    this.status$ = this.statusState.state$;
  }

  async clear(): Promise<void> {
    const requestId = Utils.newGuid();
    const clearPromise = firstValueFrom(
      this.messageListener.messages$(UPDATE_VAULT_STATE_FINISHED).pipe(
        filter((m) => m.requestId === requestId),
        switchMap((m) => {
          if (m.success) {
            return this.state.state$;
          }
          throw new Error(m.errorMessage);
        }),
      ),
    );

    this.messageSender.send(UPDATE_VAULT_STATE, {
      action: "clear",
      key: this.definition.key,
      requestId,
    });

    await clearPromise;
  }

  async decrypt(clearCache: boolean): Promise<VaultRecord<string, TOutput>> {
    console.log("Sending decrypt request to background");
    const requestId = Utils.newGuid();
    const decryptPromise = firstValueFrom(
      this.messageListener.messages$(UPDATE_VAULT_STATE_FINISHED).pipe(
        filter((m) => m.requestId === requestId),
        switchMap((m) => {
          if (m.success) {
            return this.state.state$;
          }
          throw new Error(m.errorMessage);
        }),
      ),
    );

    this.messageSender.send(UPDATE_VAULT_STATE, {
      clearCacheBeforeDecrypt: clearCache,
      action: "decrypt",
      key: this.definition.key,
      requestId,
    });

    return await decryptPromise;
  }
}
