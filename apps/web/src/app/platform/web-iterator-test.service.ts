import { inject, Injectable } from "@angular/core";
import { concatMap, filter, firstValueFrom, map, switchMap } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { SdkService } from "@bitwarden/common/platform/abstractions/sdk/sdk.service";
import { BwForeignIterable } from "@bitwarden/common/platform/services/sdk/iter";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { credentials_for_autofill_stream } from "@bitwarden/sdk-internal";

@Injectable({ providedIn: "root" })
export class WebIteratorTestService {
  private cipherService = inject(CipherService);
  private sdkService = inject(SdkService);
  private accountService = inject(AccountService);

  init() {
    (window as any).iteratorTestService = this; // Expose the service to the global window object for debugging purposes
  }

  async getAutofillCredentials() {
    return firstValueFrom(
      this.accountService.activeAccount$.pipe(
        filter((account) => !!account),
        switchMap((account) =>
          this.sdkService
            .userClient$(account!.id)
            .pipe(map((clientPointer) => ({ userId: account.id, clientPointer }))),
        ),
        concatMap(async ({ userId, clientPointer }) => {
          using clientRef = clientPointer.take();
          const client = clientRef.value;

          const listViews = client
            .vault()
            .ciphers()
            .decrypt_list_stream(await this.cipherService.cipherStream(userId));

          const credentials = await credentials_for_autofill_stream(listViews);

          return new BwForeignIterable(credentials);
        }),
      ),
    );
  }

  async iterateOverAutofillCredentials() {
    const credentials = await this.getAutofillCredentials();

    for (const credential of credentials) {
      // eslint-disable-next-line no-console
      console.log("Credential:", credential);
    }
  }
}
