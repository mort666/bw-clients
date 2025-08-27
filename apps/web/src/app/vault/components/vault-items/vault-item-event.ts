import { CollectionView } from "@bitwarden/admin-console/common";
import { CipherViewLike } from "@bitwarden/common/vault/utils/cipher-view-like-utils";

import { VaultItem } from "./vault-item";

export type CopiableFieldTypes =
  | "username"
  | "password"
  | "totp"
  | "address"
  | "cardNumber"
  | "email"
  | "phone"
  | "securityCode";

export type VaultItemEvent<C extends CipherViewLike> =
  | { type: "viewAttachments"; item: C }
  | { type: "bulkEditCollectionAccess"; items: CollectionView[] }
  | { type: "viewCollectionAccess"; item: CollectionView; readonly: boolean }
  | { type: "viewEvents"; item: C }
  | { type: "editCollection"; item: CollectionView; readonly: boolean }
  | { type: "clone"; item: C }
  | { type: "restore"; items: C[] }
  | { type: "delete"; items: VaultItem<C>[] }
  | { type: "copyField"; item: C; field: CopiableFieldTypes }
  | { type: "moveToFolder"; items: C[] }
  | { type: "assignToCollections"; items: C[] };
