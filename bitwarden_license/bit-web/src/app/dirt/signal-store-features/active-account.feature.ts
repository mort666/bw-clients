import { inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { signalStoreFeature, withComputed } from "@ngrx/signals";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";

/**
 * Exposes values from the `AccountService` as a feature for use in signal stores.
 *
 * @returns A feature that provides access to the active account and its user ID.
 */
export function withActiveAccountFeature() {
  return signalStoreFeature(
    withComputed((_store) => {
      const accountService = inject(AccountService);

      return {
        activeAccount: toSignal(accountService.activeAccount$),
        activeAccountUserId: toSignal(getUserId(accountService.activeAccount$)),
      };
    }),
  );
}
