import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule , Router } from "@angular/router";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  BadgeModule,
  ButtonModule,
  DialogModule,
  IconModule,
  ItemModule,
  SectionComponent,
  TableModule,
} from "@bitwarden/components";

import { BitwardenShield } from "../../../../../libs/auth/src/angular/icons";
import { BitIconButtonComponent } from "../../../../../libs/components/src/icon-button/icon-button.component";
import { SectionHeaderComponent } from "../../../../../libs/components/src/section/section-header.component";
import {
  DesktopFido2UserInterfaceService,
  DesktopFido2UserInterfaceSession,
} from "../../autofill/services/desktop-fido2-user-interface.service";
import { DesktopSettingsService } from "../../platform/services/desktop-settings.service";
// import { AnchorLinkDirective } from "../../../../../libs/components/src/link/link.directive";



@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SectionHeaderComponent,
    BitIconButtonComponent,
    TableModule,
    JslibModule,
    IconModule,
    ButtonModule,
    DialogModule,
    SectionComponent,
    ItemModule,
    BadgeModule,
  ],
  template: `
    <div class="tw-flex tw-flex-col">
      <bit-section-header class="tw-p-4 tw-items-center">
        <bit-icon [icon]="Icons.BitwardenShield" class=" tw-w-10"></bit-icon>

        <h2 bitTypography="h6">Log in with passkey?</h2>
        <button
          type="button"
          bitIconButton="bwi-close"
          slot="end"
          class="tw-align-center"
          (click)="closeModal()"
        >
          Close
        </button>
      </bit-section-header>
      <!-- insert wrapper and foreach for ciphers  -->
      <!-- <bit-table> -->
      <bit-section class="tw-bg-background-alt tw-p-4">
        <ng-container *ngFor="let c of ciphers" class="tw-p-4">
          <bit-item class=" tw-mb-2 tw-py-2 tw-px-4">
            <div class="tw-flex tw-items-center tw-justify-between tw-w-full">
              <div class="tw-flex">
                <app-vault-icon [cipher]="c"></app-vault-icon>

                <div class="">
                  <button
                    bitLink
                    class="tw-overflow-hidden tw-text-start tw-leading-snug"
                    queryParamsHandling="merge"
                    [title]="c.name"
                    type="button"
                    appStopProp
                    aria-haspopup="true"
                  >
                    {{ c.name }}
                  </button>
                  <br />
                  <span class="tw-text-sm tw-text-muted" appStopProp>{{ c.subTitle }}</span>
                </div>
              </div>
              <span bitBadge (click)="confirmPasskey()">Select</span>
            </div>
          </bit-item>
        </ng-container>
      </bit-section>
      <!-- </bit-table> -->
      <br />
      <button style="" bitButton type="button" buttonType="secondary" [loading]="false">
        Confirm passkey
      </button>
    </div>
  `,
})
export class Fido2PlaceholderComponent implements OnInit {
  ciphers: CipherView[];
  readonly Icons = { BitwardenShield };

  session?: DesktopFido2UserInterfaceSession = null;
  constructor(
    private readonly desktopSettingsService: DesktopSettingsService,
    private readonly fido2UserInterfaceService: DesktopFido2UserInterfaceService,
    private readonly cipherService: CipherService,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    this.session = this.fido2UserInterfaceService.getCurrentSession();
    this.ciphers = await this.cipherService.getAllDecrypted();
  }

  async confirmPasskey() {
    try {
      // Retrieve the current UI session to control the flow
      if (!this.session) {
        // todo: handle error
        throw new Error("No session found");
      }

      // If we want to we could submit information to the session in order to create the credential
      // const cipher = await session.createCredential({
      //   userHandle: "userHandle2",
      //   userName: "username2",
      //   credentialName: "zxsd2",
      //   rpId: "webauthn.io",
      //   userVerification: true,
      // });

      this.session.notifyConfirmCredential();

      // Not sure this clean up should happen here or in session.
      // The session currently toggles modal on and send us here
      // But if this route is somehow opened outside of session we want to make sure we clean up?
      await this.router.navigate(["/"]);
      await this.desktopSettingsService.setInModalMode(false);
    } catch (error) {
      // TODO: Handle error appropriately
    }
  }

  async closeModal() {
    await this.router.navigate(["/"]);
    await this.desktopSettingsService.setInModalMode(false);
  }
}
