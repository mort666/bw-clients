import { PrfKey } from "@bitwarden/common/types/key";

/**
 * Service for unlocking vault using WebAuthn PRF (pseudo-random function) extension.
 * Provides offline vault unlock capabilities by deriving unlock keys from PRF outputs.
 */
export abstract class WebAuthnPrfUnlockServiceAbstraction {
  /**
   * Check if PRF unlock is available for the current user
   * @param userId The user ID to check PRF unlock availability for
   * @returns Promise<boolean> true if PRF unlock is available
   */
  abstract isPrfUnlockAvailable(userId: string): Promise<boolean>;

  /**
   * Get PRF credentials for unlock (stored credential IDs that support PRF)
   * @param userId The user ID to get credentials for
   * @returns Promise<{credentialId: string; transports: string[]}[]> Array of credentials with transports that support PRF unlock
   */
  abstract getPrfUnlockCredentials(
    userId: string,
  ): Promise<{ credentialId: string; transports: string[] }[]>;

  /**
   * Attempt to unlock the vault using WebAuthn PRF
   * @param userId The user ID to unlock vault for
   * @returns Promise<boolean> true if unlock was successful
   */
  abstract unlockVaultWithPrf(userId: string): Promise<boolean>;

  /**
   * Get the salt used for PRF unlock operations
   * Uses the same salt as login to ensure PRF keys match
   * @returns Promise<ArrayBuffer> The salt for PRF unlock operations
   */
  abstract getUnlockWithPrfSalt(): Promise<ArrayBuffer>;

  /**
   * Create symmetric unlock key from PRF output
   * @param prf The PRF output from authenticator
   * @returns Promise<PrfKey> The derived unlock key
   */
  abstract createUnlockKeyFromPrf(prf: ArrayBuffer): Promise<PrfKey>;
}
