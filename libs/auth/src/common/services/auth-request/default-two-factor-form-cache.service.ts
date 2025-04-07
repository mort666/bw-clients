import { inject, Injectable, WritableSignal } from "@angular/core";

import { ViewCacheService } from "@bitwarden/angular/platform/abstractions/view-cache.service";
import { TwoFactorProviderType } from "@bitwarden/common/auth/enums/two-factor-provider-type";
import { TwoFactorFormView } from "@bitwarden/common/auth/models/view/two-factor-form.view";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";

const TWO_FACTOR_FORM_CACHE_KEY = "two-factor-form-cache";

export interface TwoFactorFormData {
  token?: string;
  remember?: boolean;
  selectedProviderType?: TwoFactorProviderType;
  emailSent?: boolean;
}

/**
 * This is a cache service used for the login via auth request component.
 *
 * There is sensitive information stored temporarily here. Cache will be cleared
 * after 2 minutes.
 */
@Injectable()
export class DefaultTwoFactorFormCacheService {
  private viewCacheService: ViewCacheService = inject(ViewCacheService);
  private configService: ConfigService = inject(ConfigService);

  /** True when the `PM9115_TwoFactorExtensionDataPersistence` flag is enabled */
  private featureEnabled: boolean = false;

  /**
   * Signal for the cached TwoFactorFormData.
   */
  private defaultTwoFactorFormCache: WritableSignal<TwoFactorFormView | null> =
    this.viewCacheService.signal<TwoFactorFormView | null>({
      key: TWO_FACTOR_FORM_CACHE_KEY,
      initialValue: null,
      deserializer: TwoFactorFormView.fromJSON,
    });

  constructor() {}

  /**
   * Must be called once before interacting with the cached data, otherwise methods will be noop.
   */
  async init() {
    this.featureEnabled = await this.configService.getFeatureFlag(
      FeatureFlag.PM9115_TwoFactorExtensionDataPersistence,
    );
  }

  /**
   * Update the cache with the new TwoFactorFormData.
   */
  cacheTwoFactorFormData(data: TwoFactorFormData): void {
    if (!this.featureEnabled) {
      return;
    }

    this.defaultTwoFactorFormCache.set({
      token: data.token,
      remember: data.remember,
      selectedProviderType: data.selectedProviderType,
      emailSent: data.emailSent,
    } as TwoFactorFormView);
  }

  /**
   * Clears the cached TwoFactorFormData.
   */
  clearCachedTwoFactorFormData(): void {
    if (!this.featureEnabled) {
      return;
    }

    this.defaultTwoFactorFormCache.set(null);
  }

  /**
   * Returns the cached TwoFactorFormData when available.
   */
  getCachedTwoFactorFormData(): TwoFactorFormView | null {
    if (!this.featureEnabled) {
      return null;
    }

    return this.defaultTwoFactorFormCache();
  }
}
