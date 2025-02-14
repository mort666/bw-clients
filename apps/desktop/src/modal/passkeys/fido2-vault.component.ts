import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule, Router } from "@angular/router";
import { BehaviorSubject, Observable } from "rxjs";

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
  templateUrl: "fido2-vault.component.html",
})
export class Fido2VaultComponent implements OnInit {
  session?: DesktopFido2UserInterfaceSession = null;
  private ciphersSubject = new BehaviorSubject<CipherView[]>([]);
  ciphers$: Observable<CipherView[]> = this.ciphersSubject.asObservable();
  readonly Icons = { BitwardenShield };

  constructor(
    private readonly desktopSettingsService: DesktopSettingsService,
    private readonly fido2UserInterfaceService: DesktopFido2UserInterfaceService,
    private readonly cipherService: CipherService,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    this.session = this.fido2UserInterfaceService.getCurrentSession();

    const cipherIds = await this.session?.getAvailableCipherIds();

    this.cipherService
      .getAllDecryptedForIds(cipherIds || [])
      .then((ciphers) => {
        this.ciphersSubject.next(ciphers);
      })
      .catch(() => {
        // console.error(err);
      });
  }

  async chooseCipher(cipherId: string) {
    this.session?.confirmChosenCipher(cipherId);

    await this.router.navigate(["/"]);
    await this.desktopSettingsService.setInModalMode(false);
  }

  async closeModal() {
    await this.router.navigate(["/"]);
    await this.desktopSettingsService.setInModalMode(false);
    this.session.notifyConfirmCredential(false);
  }
}
