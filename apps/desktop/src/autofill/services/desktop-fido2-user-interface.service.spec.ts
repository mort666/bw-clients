import { Router } from "@angular/router";
import { mock } from "jest-mock-extended";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";

import { DesktopSettingsService } from "src/platform/services/desktop-settings.service";

import {
  DesktopFido2UserInterfaceService,
  DesktopFido2UserInterfaceSession,
} from "./desktop-fido2-user-interface.service";
import type { NativeWindowObject } from "./desktop-fido2-user-interface.service";

describe("Desktop Fido2 User Interface Service", () => {
  const accountService = mock<AccountService>();
  const authService = mock<AuthService>();
  const cipherService = mock<CipherService>();
  const desktopSettingsService = mock<DesktopSettingsService>();
  const logService = mock<LogService>();
  const messagingService = mock<MessagingService>();
  const router = mock<Router>();
  let desktopFido2UserInterfaceService: DesktopFido2UserInterfaceService;

  beforeEach(() => {
    desktopFido2UserInterfaceService = new DesktopFido2UserInterfaceService(
      authService,
      cipherService,
      accountService,
      logService,
      messagingService,
      router,
      desktopSettingsService,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("newSession", () => {
    it("logs a warning", async () => {
      const fallbackSupported = false;
      const nativeWindowObject = {};
      await desktopFido2UserInterfaceService.newSession(fallbackSupported, nativeWindowObject);

      expect(logService.warning).toHaveBeenCalled();
    });
  });
});

describe("Desktop Fido2 User Interface Session", () => {
  const accountService = mock<AccountService>();
  const authService = mock<AuthService>();
  const cipherService = mock<CipherService>();
  const desktopSettingsService = mock<DesktopSettingsService>();
  const logService = mock<LogService>();
  const router = mock<Router>();
  const windowObject = mock<NativeWindowObject>();
  let desktopFido2UserInterfaceSession: DesktopFido2UserInterfaceSession;

  beforeEach(() => {
    desktopFido2UserInterfaceSession = new DesktopFido2UserInterfaceSession(
      authService,
      cipherService,
      accountService,
      logService,
      router,
      desktopSettingsService,
      windowObject,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("availableCipherId$", () => {
    it("returns available cipher ids", () => {
      desktopFido2UserInterfaceSession.availableCipherIds$.subscribe({
        next: (ids) => {
          expect(ids).toEqual(["id1", "id2"]);
        },
      });

      desktopFido2UserInterfaceSession["availableCipherIdsSubject"].next(["id1", "id2"]);
    });
  });

  describe("pickCredential", () => {
    it("returns a cipherId when one exists", async () => {
      const result = await desktopFido2UserInterfaceSession.pickCredential({
        cipherIds: ["id"],
        userVerification: false,
        assumeUserPresence: false,
        masterPasswordRepromptRequired: false,
      });

      expect(result).toStrictEqual({ cipherId: "id", userVerified: false });
    });

    it("returns a user chosen cipherId", async () => {
      jest
        .spyOn(desktopFido2UserInterfaceSession as any, "waitForUiChosenCipher")
        .mockResolvedValue("id2");

      const result = await desktopFido2UserInterfaceSession.pickCredential({
        cipherIds: ["id", "id2"],
        userVerification: false,
        assumeUserPresence: false,
        masterPasswordRepromptRequired: false,
      });

      expect(result).toStrictEqual({ cipherId: "id2", userVerified: true });
    });
  });
});
