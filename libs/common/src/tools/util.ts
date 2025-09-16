import { filter, firstValueFrom, map } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import type { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { isGuid } from "@bitwarden/guid";

import { UserId } from "../types/guid";

import { I18nKeyOrLiteral } from "./types";

/** Recursively freeze an object's own keys
 *  @param value the value to freeze
 *  @returns `value`
 *  @remarks this function is derived from MDN's `deepFreeze`, which
 *   has been committed to the public domain.
 */
export function deepFreeze<T extends object>(value: T): Readonly<T> {
  const keys = Reflect.ownKeys(value) as (keyof T)[];

  for (const key of keys) {
    const own = value[key];

    if (own && typeof own === "object") {
      deepFreeze(own);
    }
  }

  return Object.freeze(value);
}

/** Type guard that returns `true` when the value is an i18n key.  */
export function isI18nKey(value: I18nKeyOrLiteral): value is string {
  return typeof value === "string";
}

/** Type guard that returns `true` when the value requires no translation.
 *  @remarks the literal value can be accessed using the `.literal` property.
 */
export function isLiteral(value: I18nKeyOrLiteral): value is { literal: string } {
  return typeof value === "object" && "literal" in value;
}

/**
 * Retrieves the active user's ID using the provided AccountService instance.
 *
 * Filters the active account stream to ensure the ID is a valid GUID,
 * then returns the UserId.
 *
 * @param accountService - The AccountService instance to query.
 * @returns Promise<UserId> - The active user's unique identifier.
 * @throws If no valid active user ID is found in the stream.
 *
 * @remarks
 * - Uses a type guard to narrow to Account objects with a valid GUID.
 * - The returned UserId is an opaque type for compile-time safety.
 */
export async function getActiveUserId(accountService: AccountService): Promise<UserId> {
  const userId = await firstValueFrom<UserId>(
    accountService.activeAccount$.pipe(
      filter((a): a is Account => {
        const id = (a as Account)?.id;
        return typeof id === "string" && isGuid(id);
      }),
      map((a) => a.id),
    ),
  );
  return userId;
}
