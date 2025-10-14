import { Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

import { UserDecryptionOptions } from "../models";


export abstract class UserDecryptionOptionsServiceAbstraction {
  /**
   * Returns the user decryption options for the given user id.
   * @param userId The user id to check.
   */
  abstract userDecryptionOptionsById$(userId: UserId): Observable<UserDecryptionOptions>;
  /**
   * Uses user decryption options to determine if current user has a master password.
   * @remark This is sent from the server, and does not indicate if the master password
   * was used to login and/or if a master key is saved locally.
   */
  abstract hasMasterPasswordById$(userId: UserId): Observable<boolean>;
}

export abstract class InternalUserDecryptionOptionsServiceAbstraction extends UserDecryptionOptionsServiceAbstraction {
  /**
   * Sets the current decryption options for the user. Contains the current configuration
   * of the users account related to how they can decrypt their vault.
   * @remark Intended to be used when user decryption options are received from server, does
   * not update the server. Consider syncing instead of updating locally.
   * @param userDecryptionOptions Current user decryption options received from server.
   */
  abstract setUserDecryptionOptionsById(
    userId: UserId,
    userDecryptionOptions: UserDecryptionOptions,
  ): Promise<void>;
}
