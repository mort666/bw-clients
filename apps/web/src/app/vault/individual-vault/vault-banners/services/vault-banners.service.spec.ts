import { TestBed } from "@angular/core/testing";
import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject, of } from "rxjs";

import {
  AuthRequestServiceAbstraction,
  UserDecryptionOptions,
  UserDecryptionOptionsServiceAbstraction,
} from "@bitwarden/auth/common";
import { AccountInfo, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { DevicesServiceAbstraction } from "@bitwarden/common/auth/abstractions/devices/devices.service.abstraction";
import { DeviceView } from "@bitwarden/common/auth/abstractions/devices/views/device.view";
import { AuthRequestResponse } from "@bitwarden/common/auth/models/response/auth-request.response";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions/account/billing-account-profile-state.service";
import { DeviceType } from "@bitwarden/common/enums";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { StateProvider } from "@bitwarden/common/platform/state";
import { FakeStateProvider, mockAccountServiceWith } from "@bitwarden/common/spec";
import { UserId } from "@bitwarden/common/types/guid";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { KdfConfigService, KdfType } from "@bitwarden/key-management";

import { VaultBannersService, VisibleVaultBanner } from "./vault-banners.service";

describe("VaultBannersService", () => {
  let service: VaultBannersService;
  const isSelfHost = jest.fn().mockReturnValue(false);
  const hasPremiumFromAnySource$ = new BehaviorSubject<boolean>(false);
  const userId = Utils.newGuid() as UserId;
  const fakeStateProvider = new FakeStateProvider(mockAccountServiceWith(userId));
  const getEmailVerified = jest.fn().mockResolvedValue(true);
  const lastSync$ = new BehaviorSubject<Date | null>(null);
  const userDecryptionOptions$ = new BehaviorSubject<UserDecryptionOptions>({
    hasMasterPassword: true,
  });
  const kdfConfig$ = new BehaviorSubject({ kdfType: KdfType.PBKDF2_SHA256, iterations: 600000 });
  const accounts$ = new BehaviorSubject<Record<UserId, AccountInfo>>({
    [userId]: { email: "test@bitwarden.com", emailVerified: true, name: "name" } as AccountInfo,
  });
  const devices$ = new BehaviorSubject<DeviceView[]>([]);
  const pendingAuthRequests$ = new BehaviorSubject<Array<AuthRequestResponse>>([]);
  let configService: MockProxy<ConfigService>;

  beforeEach(() => {
    lastSync$.next(new Date("2024-05-14"));
    isSelfHost.mockClear();
    getEmailVerified.mockClear().mockResolvedValue(true);
    configService = mock<ConfigService>();
    configService.getFeatureFlag$.mockImplementation(() => of(true));

    TestBed.configureTestingModule({
      providers: [
        VaultBannersService,
        {
          provide: PlatformUtilsService,
          useValue: { isSelfHost },
        },
        {
          provide: BillingAccountProfileStateService,
          useValue: { hasPremiumFromAnySource$: () => hasPremiumFromAnySource$ },
        },
        {
          provide: StateProvider,
          useValue: fakeStateProvider,
        },
        {
          provide: PlatformUtilsService,
          useValue: { isSelfHost },
        },
        {
          provide: AccountService,
          useValue: { accounts$ },
        },
        {
          provide: KdfConfigService,
          useValue: { getKdfConfig$: () => kdfConfig$ },
        },
        {
          provide: SyncService,
          useValue: { lastSync$: () => lastSync$ },
        },
        {
          provide: UserDecryptionOptionsServiceAbstraction,
          useValue: {
            userDecryptionOptionsById$: () => userDecryptionOptions$,
          },
        },
        {
          provide: DevicesServiceAbstraction,
          useValue: { getDevices$: () => devices$ },
        },
        {
          provide: AuthRequestServiceAbstraction,
          useValue: { getPendingAuthRequests$: () => pendingAuthRequests$ },
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("KDFSettings", () => {
    beforeEach(async () => {
      userDecryptionOptions$.next({ hasMasterPassword: true });
      kdfConfig$.next({ kdfType: KdfType.PBKDF2_SHA256, iterations: 599999 });
    });

    it("shows low KDF iteration banner", async () => {
      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowLowKDFBanner(userId)).toBe(true);
    });

    it("does not show low KDF iteration banner if KDF type is not PBKDF2_SHA256", async () => {
      kdfConfig$.next({ kdfType: KdfType.Argon2id, iterations: 600001 });

      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowLowKDFBanner(userId)).toBe(false);
    });

    it("does not show low KDF for iterations about 600,000", async () => {
      kdfConfig$.next({ kdfType: KdfType.PBKDF2_SHA256, iterations: 600001 });

      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowLowKDFBanner(userId)).toBe(false);
    });

    it("dismisses low KDF iteration banner", async () => {
      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowLowKDFBanner(userId)).toBe(true);

      await service.dismissBanner(userId, VisibleVaultBanner.KDFSettings);

      expect(await service.shouldShowLowKDFBanner(userId)).toBe(false);
    });
  });

  describe("OutdatedBrowser", () => {
    beforeEach(async () => {
      // Hardcode `MSIE` in userAgent string
      const userAgent = "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 MSIE";
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => userAgent,
      });
    });

    it("shows outdated browser banner", async () => {
      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowUpdateBrowserBanner(userId)).toBe(true);
    });

    it("dismisses outdated browser banner", async () => {
      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowUpdateBrowserBanner(userId)).toBe(true);

      await service.dismissBanner(userId, VisibleVaultBanner.OutdatedBrowser);

      expect(await service.shouldShowUpdateBrowserBanner(userId)).toBe(false);
    });
  });

  describe("VerifyEmail", () => {
    beforeEach(async () => {
      accounts$.next({
        [userId]: {
          ...accounts$.value[userId],
          emailVerified: false,
        },
      });
    });

    it("shows verify email banner", async () => {
      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowVerifyEmailBanner(userId)).toBe(true);
    });

    it("dismisses verify email banner", async () => {
      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowVerifyEmailBanner(userId)).toBe(true);

      await service.dismissBanner(userId, VisibleVaultBanner.VerifyEmail);

      expect(await service.shouldShowVerifyEmailBanner(userId)).toBe(false);
    });
  });

  describe("PendingAuthRequest", () => {
    const now = new Date();
    let authRequestResponse: AuthRequestResponse;

    beforeEach(() => {
      authRequestResponse = new AuthRequestResponse({
        id: "authRequest1",
        deviceId: "device1",
        deviceName: "Test Device",
        deviceType: DeviceType.Android,
        creationDate: now.toISOString(),
        requestApproved: null,
      });
      // Reset devices list, single user state, and active user state before each test
      pendingAuthRequests$.next([]);
      fakeStateProvider.singleUser.states.clear();
      fakeStateProvider.activeUser.states.clear();
    });

    it("shows pending auth request banner when there is a pending request", async () => {
      pendingAuthRequests$.next([new AuthRequestResponse(authRequestResponse)]);

      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowPendingAuthRequestBanner(userId)).toBe(true);
    });

    it("does not show pending auth request banner when there are no pending requests", async () => {
      pendingAuthRequests$.next([]);

      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowPendingAuthRequestBanner(userId)).toBe(false);
    });

    it("dismisses pending auth request banner", async () => {
      pendingAuthRequests$.next([new AuthRequestResponse(authRequestResponse)]);

      service = TestBed.inject(VaultBannersService);

      expect(await service.shouldShowPendingAuthRequestBanner(userId)).toBe(true);

      await service.dismissBanner(userId, VisibleVaultBanner.PendingAuthRequest);

      expect(await service.shouldShowPendingAuthRequestBanner(userId)).toBe(false);
    });
  });
});
