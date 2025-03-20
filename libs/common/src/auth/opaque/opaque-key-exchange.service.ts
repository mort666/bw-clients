import { OpaqueSessionId, UserId } from "@bitwarden/common/types/guid";

import { EncString } from "../../platform/models/domain/enc-string";
import { OpaqueExportKey, UserKey } from "../../types/key";

import { OpaqueCipherConfiguration } from "./models/opaque-cipher-configuration";

export abstract class OpaqueKeyExchangeService {
  /**
   * Register a user to use the Opaque login method.
   */
  abstract register(
    masterPassword: string,
    userKey: UserKey,
    cipherConfiguration: OpaqueCipherConfiguration,
  ): Promise<OpaqueSessionId>;

  /**
   * Set the registration as the active authentication method for the user.
   */
  abstract setRegistrationActive(sessionId: OpaqueSessionId): Promise<void>;

  /**
   * Authenticate using the Opaque login method. Returns the export key, which must be used
   * in combination with the rotateable keyset returned from the token endpoint.
   * @returns The ExportKey obtained during the Opaque login flow.
   */
  abstract login(
    email: string,
    masterPassword: string,
    cipherConfiguration: OpaqueCipherConfiguration,
  ): Promise<{
    sessionId: string;
    opaqueExportKey: OpaqueExportKey;
  }>;

  abstract decryptUserKeyWithExportKey(
    userId: UserId,
    exportKeyEncryptedOpaquePrivateKey: EncString,
    opaquePublicKeyEncryptedUserKey: EncString,
    exportKey: OpaqueExportKey,
  ): Promise<UserKey | null>;
}
