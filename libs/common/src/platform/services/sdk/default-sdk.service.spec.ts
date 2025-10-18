import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject, firstValueFrom, of } from "rxjs";

import { SecurityStateService } from "@bitwarden/common/key-management/security-state/abstractions/security-state.service";
// This import has been flagged as unallowed for this class. It may be involved in a circular dependency loop.
// eslint-disable-next-line no-restricted-imports
import { KdfConfigService, KeyService, PBKDF2KdfConfig } from "@bitwarden/key-management";
import { BitwardenClient } from "@bitwarden/sdk-internal";

import {
  ObservableTracker,
  FakeAccountService,
  FakeStateProvider,
  mockAccountServiceWith,
} from "../../../../spec";
import { ApiService } from "../../../abstractions/api.service";
import { AccountInfo } from "../../../auth/abstractions/account.service";
import { EncryptedString } from "../../../key-management/crypto/models/enc-string";
import { UserId } from "../../../types/guid";
import { UserKey } from "../../../types/key";
import { ConfigService } from "../../abstractions/config/config.service";
import { Environment, EnvironmentService } from "../../abstractions/environment.service";
import { PlatformUtilsService } from "../../abstractions/platform-utils.service";
import { SdkClientFactory } from "../../abstractions/sdk/sdk-client-factory";
import { SdkLoadService } from "../../abstractions/sdk/sdk-load.service";
import { UserNotLoggedInError } from "../../abstractions/sdk/sdk.service";
import { Rc } from "../../misc/reference-counting/rc";
import { Utils } from "../../misc/utils";
import { SymmetricCryptoKey } from "../../models/domain/symmetric-crypto-key";

import { DefaultSdkService } from "./default-sdk.service";

class TestSdkLoadService extends SdkLoadService {
  protected override load(): Promise<void> {
    // Simulate successfull WASM load
    return Promise.resolve();
  }
}

describe("DefaultSdkService", () => {
  describe("userClient$", () => {
    let sdkClientFactory!: MockProxy<SdkClientFactory>;
    let environmentService!: MockProxy<EnvironmentService>;
    let platformUtilsService!: MockProxy<PlatformUtilsService>;
    let kdfConfigService!: MockProxy<KdfConfigService>;
    let keyService!: MockProxy<KeyService>;
    let securityStateService!: MockProxy<SecurityStateService>;
    let configService!: MockProxy<ConfigService>;
    let service!: DefaultSdkService;
    let accountService!: FakeAccountService;
    let fakeStateProvider!: FakeStateProvider;
    let apiService!: MockProxy<ApiService>;

    beforeEach(async () => {
      await new TestSdkLoadService().loadAndInit();

      sdkClientFactory = mock<SdkClientFactory>();
      environmentService = mock<EnvironmentService>();
      platformUtilsService = mock<PlatformUtilsService>();
      kdfConfigService = mock<KdfConfigService>();
      keyService = mock<KeyService>();
      securityStateService = mock<SecurityStateService>();
      apiService = mock<ApiService>();
      const mockUserId = Utils.newGuid() as UserId;
      accountService = mockAccountServiceWith(mockUserId);
      fakeStateProvider = new FakeStateProvider(accountService);
      configService = mock<ConfigService>();

      configService.serverConfig$ = new BehaviorSubject(null);

      // Can't use `of(mock<Environment>())` for some reason
      environmentService.environment$ = new BehaviorSubject(mock<Environment>());

      service = new DefaultSdkService(
        sdkClientFactory,
        environmentService,
        platformUtilsService,
        accountService,
        kdfConfigService,
        keyService,
        securityStateService,
        apiService,
        fakeStateProvider,
        configService,
      );
    });

    describe("given the user is logged in", () => {
      const userId = "0da62ebd-98bb-4f42-a846-64e8555087d7" as UserId;
      beforeEach(() => {
        environmentService.getEnvironment$
          .calledWith(userId)
          .mockReturnValue(new BehaviorSubject(mock<Environment>()));
        accountService.accounts$ = of({
          [userId]: { email: "email", emailVerified: true, name: "name" } as AccountInfo,
        });
        kdfConfigService.getKdfConfig$
          .calledWith(userId)
          .mockReturnValue(of(new PBKDF2KdfConfig()));
        keyService.userKey$
          .calledWith(userId)
          .mockReturnValue(of(new SymmetricCryptoKey(new Uint8Array(64)) as UserKey));
        keyService.userEncryptedPrivateKey$
          .calledWith(userId)
          .mockReturnValue(of("private-key" as EncryptedString));
        keyService.encryptedOrgKeys$.calledWith(userId).mockReturnValue(of({}));
        keyService.userSigningKey$.calledWith(userId).mockReturnValue(of(null));
        securityStateService.accountSecurityState$.calledWith(userId).mockReturnValue(of(null));
      });

      describe("given no client override has been set for the user", () => {
        let mockClient!: MockProxy<BitwardenClient>;

        beforeEach(() => {
          mockClient = createMockClient();
          sdkClientFactory.createSdkClient.mockResolvedValue(mockClient);
        });

        it("creates an internal SDK client when called the first time", async () => {
          await firstValueFrom(service.userClient$(userId));

          expect(sdkClientFactory.createSdkClient).toHaveBeenCalled();
        });

        it("does not create an SDK client when called the second time with same userId", async () => {
          const subject_1 = new BehaviorSubject<Rc<BitwardenClient> | undefined>(undefined);
          const subject_2 = new BehaviorSubject<Rc<BitwardenClient> | undefined>(undefined);

          // Use subjects to ensure the subscription is kept alive
          service.userClient$(userId).subscribe(subject_1);
          service.userClient$(userId).subscribe(subject_2);

          // Wait for the next tick to ensure all async operations are done
          await new Promise(process.nextTick);

          expect(subject_1.value.take().value).toBe(mockClient);
          expect(subject_2.value.take().value).toBe(mockClient);
          expect(sdkClientFactory.createSdkClient).toHaveBeenCalledTimes(1);
        });

        it("destroys the internal SDK client when all subscriptions are closed", async () => {
          const subject_1 = new BehaviorSubject<Rc<BitwardenClient> | undefined>(undefined);
          const subject_2 = new BehaviorSubject<Rc<BitwardenClient> | undefined>(undefined);
          const subscription_1 = service.userClient$(userId).subscribe(subject_1);
          const subscription_2 = service.userClient$(userId).subscribe(subject_2);
          await new Promise(process.nextTick);

          subscription_1.unsubscribe();
          subscription_2.unsubscribe();

          await new Promise(process.nextTick);
          expect(mockClient.free).toHaveBeenCalledTimes(1);
        });

        it("destroys the internal SDK client when the userKey is unset (i.e. lock or logout)", async () => {
          const userKey$ = new BehaviorSubject(
            new SymmetricCryptoKey(new Uint8Array(64)) as UserKey,
          );
          keyService.userKey$.calledWith(userId).mockReturnValue(userKey$);

          const userClientTracker = new ObservableTracker(service.userClient$(userId), false);
          await userClientTracker.pauseUntilReceived(1);

          userKey$.next(undefined);
          await userClientTracker.expectCompletion();

          expect(mockClient.free).toHaveBeenCalledTimes(1);
        });
      });

      describe("given overrides are used", () => {
        it("does not create a new client and emits the override client when a client override has already been set ", async () => {
          const mockClient = mock<BitwardenClient>();
          service.setClient(userId, mockClient);
          const userClientTracker = new ObservableTracker(service.userClient$(userId), false);
          await userClientTracker.pauseUntilReceived(1);

          expect(sdkClientFactory.createSdkClient).not.toHaveBeenCalled();
          expect(userClientTracker.emissions[0].take().value).toBe(mockClient);
        });

        it("emits the internal client then switches to override when an override is set", async () => {
          const mockInternalClient = createMockClient();
          const mockOverrideClient = createMockClient();
          sdkClientFactory.createSdkClient.mockResolvedValue(mockInternalClient);
          const userClientTracker = new ObservableTracker(service.userClient$(userId), false);

          await userClientTracker.pauseUntilReceived(1);
          expect(userClientTracker.emissions[0].take().value).toBe(mockInternalClient);

          service.setClient(userId, mockOverrideClient);

          await userClientTracker.pauseUntilReceived(2);
          expect(userClientTracker.emissions[1].take().value).toBe(mockOverrideClient);
        });

        it("throws error when the client has explicitly been set as undefined", async () => {
          service.setClient(userId, undefined);

          const result = () => firstValueFrom(service.userClient$(userId));

          await expect(result).rejects.toThrow(UserNotLoggedInError);
        });

        it("completes the subscription when the override is set to undefined after having been defined", async () => {
          const mockOverrideClient = createMockClient();
          service.setClient(userId, mockOverrideClient);
          const userClientTracker = new ObservableTracker(service.userClient$(userId), false);
          await userClientTracker.pauseUntilReceived(1);

          service.setClient(userId, undefined);

          await userClientTracker.expectCompletion();
        });

        it("destroys the internal client when an override is set", async () => {
          const mockInternalClient = createMockClient();
          const mockOverrideClient = createMockClient();
          sdkClientFactory.createSdkClient.mockResolvedValue(mockInternalClient);
          const userClientTracker = new ObservableTracker(service.userClient$(userId), false);

          await userClientTracker.pauseUntilReceived(1);
          service.setClient(userId, mockOverrideClient);
          await userClientTracker.pauseUntilReceived(2);

          expect(mockInternalClient.free).toHaveBeenCalled();
        });

        it("destroys the override client when explicitly setting the client to undefined", async () => {
          const mockOverrideClient = createMockClient();
          service.setClient(userId, mockOverrideClient);
          const userClientTracker = new ObservableTracker(service.userClient$(userId), false);
          await userClientTracker.pauseUntilReceived(1);

          service.setClient(userId, undefined);
          await userClientTracker.expectCompletion();

          expect(mockOverrideClient.free).toHaveBeenCalled();
        });
      });
    });
  });
});

function createMockClient(): MockProxy<BitwardenClient> {
  const client = mock<BitwardenClient>();
  client.crypto.mockReturnValue(mock());
  client.platform.mockReturnValue({
    state: jest.fn().mockReturnValue(mock()),
    free: mock(),
    load_flags: jest.fn(),
  });
  return client;
}
