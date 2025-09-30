import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";

import {
  AuthRequestServiceAbstraction,
  UserDecryptionOptionsServiceAbstraction,
} from "@bitwarden/auth/common";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { DevicesServiceAbstraction } from "@bitwarden/common/auth/abstractions/devices/devices.service.abstraction";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions/account/billing-account-profile-state.service";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import {
  StateProvider,
  BANNERS_DISMISSED_DISK,
  UserKeyDefinition,
  SingleUserState,
} from "@bitwarden/common/platform/state";
import { UserId } from "@bitwarden/common/types/guid";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { UnionOfValues } from "@bitwarden/common/vault/types/union-of-values";
import { PBKDF2KdfConfig, KdfConfigService, KdfType } from "@bitwarden/key-management";

export const VisibleVaultBanner = {
  KDFSettings: "kdf-settings",
  OutdatedBrowser: "outdated-browser",
  VerifyEmail: "verify-email",
  PendingAuthRequest: "pending-auth-request",
} as const;

export type VisibleVaultBanner = UnionOfValues<typeof VisibleVaultBanner>;

/** Banners that will be re-shown on a new session */
type SessionBanners = VisibleVaultBanner;

export const BANNERS_DISMISSED_DISK_KEY = new UserKeyDefinition<SessionBanners[]>(
  BANNERS_DISMISSED_DISK,
  "bannersDismissed",
  {
    deserializer: (bannersDismissed) => bannersDismissed,
    clearOn: [], // Do not clear user tutorials
  },
);

@Injectable()
export class VaultBannersService {
  constructor(
    private accountService: AccountService,
    private stateProvider: StateProvider,
    private billingAccountProfileStateService: BillingAccountProfileStateService,
    private platformUtilsService: PlatformUtilsService,
    private kdfConfigService: KdfConfigService,
    private syncService: SyncService,
    private userDecryptionOptionsService: UserDecryptionOptionsServiceAbstraction,
    private devicesService: DevicesServiceAbstraction,
    private authRequestService: AuthRequestServiceAbstraction,
    private configService: ConfigService,
  ) {}

  /** Returns true when the pending auth request banner should be shown */
  async shouldShowPendingAuthRequestBanner(userId: UserId): Promise<boolean> {
    const alreadyDismissed = (await this.getBannerDismissedState(userId)).includes(
      VisibleVaultBanner.PendingAuthRequest,
    );
    // TODO: PM-20439 remove feature flag
    const browserLoginApprovalFeatureFlag = await firstValueFrom(
      this.configService.getFeatureFlag$(FeatureFlag.PM14938_BrowserExtensionLoginApproval),
    );
    if (browserLoginApprovalFeatureFlag === true) {
      const pendingAuthRequests = await firstValueFrom(
        this.authRequestService.getPendingAuthRequests$(),
      );

      return pendingAuthRequests.length > 0 && !alreadyDismissed;
    } else {
      const devices = await firstValueFrom(this.devicesService.getDevices$());
      const hasPendingRequest = devices.some(
        (device) => device.response?.devicePendingAuthRequest != null,
      );

      return hasPendingRequest && !alreadyDismissed;
    }
  }

  /** Returns true when the update browser banner should be shown */
  async shouldShowUpdateBrowserBanner(userId: UserId): Promise<boolean> {
    const outdatedBrowser = window.navigator.userAgent.indexOf("MSIE") !== -1;
    const alreadyDismissed = (await this.getBannerDismissedState(userId)).includes(
      VisibleVaultBanner.OutdatedBrowser,
    );

    return outdatedBrowser && !alreadyDismissed;
  }

  /** Returns true when the verify email banner should be shown */
  async shouldShowVerifyEmailBanner(userId: UserId): Promise<boolean> {
    const needsVerification = !(
      await firstValueFrom(this.accountService.accounts$.pipe(map((accounts) => accounts[userId])))
    )?.emailVerified;

    const alreadyDismissed = (await this.getBannerDismissedState(userId)).includes(
      VisibleVaultBanner.VerifyEmail,
    );

    return needsVerification && !alreadyDismissed;
  }

  /** Returns true when the low KDF iteration banner should be shown */
  async shouldShowLowKDFBanner(userId: UserId): Promise<boolean> {
    const hasLowKDF = (
      await firstValueFrom(this.userDecryptionOptionsService.userDecryptionOptionsById$(userId))
    )?.hasMasterPassword
      ? await this.isLowKdfIteration(userId)
      : false;

    const alreadyDismissed = (await this.getBannerDismissedState(userId)).includes(
      VisibleVaultBanner.KDFSettings,
    );

    return hasLowKDF && !alreadyDismissed;
  }

  /** Dismiss the given banner and perform any respective side effects */
  async dismissBanner(userId: UserId, banner: SessionBanners): Promise<void> {
    await this.sessionBannerState(userId).update((current) => {
      const bannersDismissed = current ?? [];

      return [...bannersDismissed, banner];
    });
  }

  /**
   *
   * @returns a SingleUserState for the session banners dismissed state
   */
  private sessionBannerState(userId: UserId): SingleUserState<SessionBanners[]> {
    return this.stateProvider.getUser(userId, BANNERS_DISMISSED_DISK_KEY);
  }

  /** Returns banners that have already been dismissed */
  private async getBannerDismissedState(userId: UserId): Promise<SessionBanners[]> {
    // `state$` can emit null when a value has not been set yet,
    // use nullish coalescing to default to an empty array
    return (await firstValueFrom(this.sessionBannerState(userId).state$)) ?? [];
  }

  private async isLowKdfIteration(userId: UserId) {
    const kdfConfig = await firstValueFrom(this.kdfConfigService.getKdfConfig$(userId));
    return (
      kdfConfig != null &&
      kdfConfig.kdfType === KdfType.PBKDF2_SHA256 &&
      kdfConfig.iterations < PBKDF2KdfConfig.ITERATIONS.defaultValue
    );
  }
}
