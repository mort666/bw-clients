import { Opaque } from "type-fest";
import { KdfConfig } from "@bitwarden/key-management";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";

/**
 * The Base64-encoded master password authentication hash, that is sent to the server for authentication.
 */
export type MasterPasswordAuthenticationHash = Opaque<string, "MasterPasswordAuthenticationHash">;
export type MasterPasswordSalt = Opaque<string, "MasterPasswordSalt">;
export type MasterKeyWrappedUserKey = Opaque<EncString, "MasterPasswordSalt">;

/**
 * The data required to unlock the master password. 
 */
export type MasterPasswordUnlockData = {
    salt: string;
    kdf: KdfConfig;
    masterKeyWrappedUserKey: MasterKeyWrappedUserKey;
}

/**
 * The data required to unlock the master password. 
 */
export type MasterPasswordAuthenticationData = {
    salt: string;
    kdf: KdfConfig;
    masterPasswordAuthenticationHash: MasterPasswordAuthenticationHash;
} 