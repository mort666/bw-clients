import { Component } from "@angular/core";
import { Router } from "@angular/router";

import { DesktopFido2UserInterfaceSession } from "../../autofill/services/desktop-fido2-user-interface.service";
import { DesktopSettingsService } from "../../platform/services/desktop-settings.service";

@Component({
  standalone: true,
  template: `
    <div
      style="background:white; display:flex; justify-content: center; align-items: center; flex-direction: column"
    >
      <h1 style="color: black">Select your passkey</h1>
      <br />
      <button
        style="color:black; padding: 10px 20px; border: 1px solid black; margin: 10px"
        bitButton
        type="button"
        buttonType="secondary"
        (click)="confirmPasskey()"
      >
        Close
      </button>
      <button
        style="color:black; padding: 10px 20px; border: 1px solid black; margin: 10px"
        bitButton
        type="button"
        buttonType="secondary"
        (click)="closeModal()"
      >
        Close
      </button>
    </div>
  `,
})
export class Fido2PlaceholderComponent {
  constructor(
    private readonly desktopSettingsService: DesktopSettingsService,
    private readonly fido2UserInterfaceService: DesktopFido2UserInterfaceSession,
    private readonly router: Router,
  ) {}

  async confirmPasskey() {
    // placeholder, actual api arguments needed here should be discussed
    // just show casing we can call into the session to create the credential or change it.
    await this.fido2UserInterfaceService.createCredential({
      userHandle: "userHandle",
      userName: "",
      credentialName: "",
      rpId: "",
      userVerification: true,
    });
    this.fido2UserInterfaceService.notifyOperationCompleted();

    await this.router.navigate(["/"]);
    await this.desktopSettingsService.setInModalMode(false);
  }

  async closeModal() {
    await this.router.navigate(["/"]);
    await this.desktopSettingsService.setInModalMode(false);
  }
}
