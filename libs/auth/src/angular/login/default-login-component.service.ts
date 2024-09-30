import { UrlTree } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { LoginComponentService, PasswordPolicies } from "@bitwarden/auth/angular";
import { SsoLoginServiceAbstraction } from "@bitwarden/common/auth/abstractions/sso-login.service.abstraction";
import { CryptoFunctionService } from "@bitwarden/common/platform/abstractions/crypto-function.service";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { PasswordGenerationServiceAbstraction } from "@bitwarden/generator-legacy";

export class DefaultLoginComponentService implements LoginComponentService {
  constructor(
    protected cryptoFunctionService: CryptoFunctionService,
    protected environmentService: EnvironmentService,
    // TODO-rr-bw: refactor to not use deprecated service
    protected passwordGenerationService: PasswordGenerationServiceAbstraction,
    protected platformUtilsService: PlatformUtilsService,
    protected ssoLoginService: SsoLoginServiceAbstraction,
  ) {}

  async getOrgPolicies(): Promise<PasswordPolicies | null> {
    return null;
  }

  setPreviousUrl(route: UrlTree): void | null {
    return null;
  }

  isLoginViaAuthRequestSupported(): boolean {
    return false;
  }

  async launchSsoBrowserWindow(
    email: string,
    clientId: "browser" | "desktop",
  ): Promise<void | null> {
    // Save email for SSO
    await this.ssoLoginService.setSsoEmail(email);

    // Generate SSO params
    const passwordOptions: any = {
      type: "password",
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: false,
    };

    let state = await this.passwordGenerationService.generatePassword(passwordOptions);
    // TODO-rr-bw: verify this is correct. Pulling this from original browser login component launchSsoBrowser method
    if (clientId === "browser") {
      state += ":clientId=browser";
    }

    const codeVerifier = await this.passwordGenerationService.generatePassword(passwordOptions);
    const codeVerifierHash = await this.cryptoFunctionService.hash(codeVerifier, "sha256");
    const codeChallenge = Utils.fromBufferToUrlB64(codeVerifierHash);

    // Save SSO params
    await this.ssoLoginService.setSsoState(state);
    await this.ssoLoginService.setCodeVerifier(codeVerifier);

    // Build URL
    const env = await firstValueFrom(this.environmentService.environment$);
    let url = env.getWebVaultUrl();
    // TODO-rr-bw: verify this is correct. Pulling this from original browser login component launchSsoBrowser method
    if (url == null) {
      url = "https://vault.bitwarden.com";
    }

    const redirectUri =
      clientId === "browser"
        ? url + "/sso-connector.html" // Browser
        : "bitwarden://sso-callback"; // Desktop

    // Launch browser window with URL
    this.platformUtilsService.launchUri(
      url +
        "/#/sso?clientId=" +
        clientId +
        "&redirectUri=" +
        encodeURIComponent(redirectUri) +
        "&state=" +
        state +
        "&codeChallenge=" +
        codeChallenge +
        "&email=" +
        encodeURIComponent(email),
    );
  }
}
