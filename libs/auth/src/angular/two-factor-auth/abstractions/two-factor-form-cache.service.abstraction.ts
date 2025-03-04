import { Observable } from "rxjs";

import { TwoFactorProviderType } from "@bitwarden/common/auth/enums/two-factor-provider-type";

/**
 * Interface for two-factor form data
 */
export interface TwoFactorFormData {
  token?: string;
  remember?: boolean;
  selectedProviderType?: TwoFactorProviderType;
  emailSent?: boolean;
}

/**
 * Abstract service for two-factor form caching
 */
export abstract class TwoFactorFormCacheService {
  /**
   * Check if the form persistence feature is enabled
   */
  abstract isEnabled(): Promise<boolean>;

  /**
   * Observable that emits the current enabled state
   */
  abstract isEnabled$(): Observable<boolean>;

  /**
   * Save form data to persistent storage
   */
  abstract saveFormData(data: TwoFactorFormData): Promise<void>;

  /**
   * Retrieve form data from persistent storage
   */
  abstract getFormData(): Promise<TwoFactorFormData | null>;

  /**
   * Observable that emits the current form data
   */
  abstract formData$(): Observable<TwoFactorFormData | null>;

  /**
   * Clear form data from persistent storage
   */
  abstract clearFormData(): Promise<void>;
}
