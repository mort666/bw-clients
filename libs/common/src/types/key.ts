import { Opaque } from "type-fest";

import { SymmetricCryptoKey } from "../platform/models/domain/symmetric-crypto-key";

// symmetric keys
export type DeviceKey = Opaque<SymmetricCryptoKey, "DeviceKey">;
export type PrfKey = Opaque<SymmetricCryptoKey, "PrfKey">;
export type UserKey = Opaque<SymmetricCryptoKey, "UserKey">;
/** @deprecated The master key is not meant to be interacted with directly. Consider using an API from masterpasswordservice instead */
export type MasterKey = Opaque<SymmetricCryptoKey, "MasterKey">;
export type PinKey = Opaque<SymmetricCryptoKey, "PinKey">;
export type OrgKey = Opaque<SymmetricCryptoKey, "OrgKey">;
export type ProviderKey = Opaque<SymmetricCryptoKey, "ProviderKey">;
export type CipherKey = Opaque<SymmetricCryptoKey, "CipherKey">;

// asymmetric keys
export type UserPrivateKey = Opaque<Uint8Array, "UserPrivateKey">;
export type UserPublicKey = Opaque<Uint8Array, "UserPublicKey">;
