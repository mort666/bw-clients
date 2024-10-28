import { systemPreferences } from "electron";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { biometrics, passwords } from "@bitwarden/desktop-napi";

import { WindowMain } from "../../main/window.main";

import { OsBiometricService } from "./desktop.biometrics.service";

export default class BiometricDarwinMain implements OsBiometricService {
  constructor(private i18nservice: I18nService,
    private windowMain: WindowMain,
  ) {}

  async osSupportsBiometric(): Promise<boolean> {
    return systemPreferences.canPromptTouchID();
  }

  async authenticateBiometric(): Promise<boolean> {
    try {
      console.log("prompting rs")
      const hwnd = this.windowMain.win.getNativeWindowHandle();

      await biometrics.prompt(hwnd, "");
      console.log("prompted rs")
      await systemPreferences.promptTouchID(this.i18nservice.t("touchIdConsentMessage"));
      return true;
    } catch (e) {
      console.log("failed to prompt rs", e);
      return false;
    }
  }

  async getBiometricKey(service: string, key: string): Promise<string | null> {
    const success = await this.authenticateBiometric();

    if (!success) {
      throw new Error("Biometric authentication failed");
    }

    return await passwords.getPassword(service, key);
  }

  async setBiometricKey(service: string, key: string, value: string): Promise<void> {
    if (await this.valueUpToDate(service, key, value)) {
      return;
    }

    return await passwords.setPassword(service, key, value);
  }

  async deleteBiometricKey(service: string, key: string): Promise<void> {
    return await passwords.deletePassword(service, key);
  }

  private async valueUpToDate(service: string, key: string, value: string): Promise<boolean> {
    try {
      const existing = await passwords.getPassword(service, key);
      return existing === value;
    } catch {
      return false;
    }
  }

  async osBiometricsNeedsSetup() {
    return false;
  }

  async osBiometricsCanAutoSetup(): Promise<boolean> {
    return false;
  }

  async osBiometricsSetup(): Promise<void> {}
}
