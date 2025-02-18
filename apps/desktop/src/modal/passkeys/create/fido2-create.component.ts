import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule, Router } from "@angular/router";
import { BehaviorSubject, firstValueFrom, Observable } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { DomainSettingsService } from "@bitwarden/common/autofill/services/domain-settings.service";
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
// import { SearchComponent } from "@bitwarden/components/src/search/search.component";

import { BitwardenShield } from "../../../../../../libs/auth/src/angular/icons";
import { BitIconButtonComponent } from "../../../../../../libs/components/src/icon-button/icon-button.component";
import { SectionHeaderComponent } from "../../../../../../libs/components/src/section/section-header.component";
import {
  DesktopFido2UserInterfaceService,
  DesktopFido2UserInterfaceSession,
} from "../../../autofill/services/desktop-fido2-user-interface.service";
import { DesktopSettingsService } from "../../../platform/services/desktop-settings.service";
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
    // SearchComponent,
  ],
  templateUrl: "fido2-create.component.html",
})
export class Fido2CreateComponent implements OnInit {
  session?: DesktopFido2UserInterfaceSession = null;
  private ciphersSubject = new BehaviorSubject<CipherView[]>([]);
  ciphers$: Observable<CipherView[]> = this.ciphersSubject.asObservable();
  readonly Icons = { BitwardenShield };

  constructor(
    private readonly desktopSettingsService: DesktopSettingsService,
    private readonly fido2UserInterfaceService: DesktopFido2UserInterfaceService,
    private readonly cipherService: CipherService,
    private readonly domainSettingsService: DomainSettingsService,
    private readonly router: Router,
  ) {}

  async ngOnInit() {
    console.log("fido2 create component");
    this.session = this.fido2UserInterfaceService.getCurrentSession();
    console.log(this.session, "session");
    const rpid = await this.session.getRpId();
    const equivalentDomains = await firstValueFrom(
      this.domainSettingsService.getUrlEquivalentDomains(rpid),
    );

    console.log(rpid, "webdomain stuff");

    this.cipherService
      .getAllDecrypted()
      .then((ciphers) => {
        console.log(ciphers, "ciphers from url");
        const relevantCiphers = ciphers.filter((cipher) => {
          if (!cipher.login) {
            return false;
          }

          return (
            cipher.login.uri === rpid &&
            (!cipher.login.fido2Credentials || cipher.login.fido2Credentials.length === 0)
          );
        });
        this.ciphersSubject.next(relevantCiphers);
      })
      .catch(() => {
        // console.error(err);
      });
  }

  async addPasskeyToCipher(cipher: CipherView) {
    this.session.notifyConfirmCredential(true, cipher);
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

      this.session.notifyConfirmCredential(true);

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
    this.session.notifyConfirmCredential(false);
  }
}
