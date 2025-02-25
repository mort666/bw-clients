import { CommonModule } from "@angular/common";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterModule, Router } from "@angular/router";
import { MockProxy, mock } from "jest-mock-extended";
import { of } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { DomainSettingsService } from "@bitwarden/common/autofill/services/domain-settings.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
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

import { BitIconButtonComponent } from "../../../../../../libs/components/src/icon-button/icon-button.component";
import { SectionHeaderComponent } from "../../../../../../libs/components/src/section/section-header.component";
import {
  DesktopFido2UserInterfaceService,
  DesktopFido2UserInterfaceSession,
} from "../../../autofill/services/desktop-fido2-user-interface.service";
import { DesktopSettingsService } from "../../../platform/services/desktop-settings.service";

import { Fido2CreateComponent } from "./fido2-create.component";

describe("Fido2CreateComponent", () => {
  let rpid: string;
  let component: Fido2CreateComponent;
  let fixture: ComponentFixture<Fido2CreateComponent>;
  let cipherService: MockProxy<CipherService>;
  let desktopSettingsService: MockProxy<DesktopSettingsService>;
  let domainSettingService: MockProxy<DomainSettingsService>;
  let interfaceService: MockProxy<DesktopFido2UserInterfaceService>;
  let session: MockProxy<DesktopFido2UserInterfaceSession>;
  let router: MockProxy<Router>;

  beforeEach(async () => {
    rpid = "example.com";
    router = mock<Router>();
    session = mock<DesktopFido2UserInterfaceSession>({
      getRpId: jest.fn().mockResolvedValue(rpid),
    });
    cipherService = mock<CipherService>({
      getAllDecrypted: jest.fn().mockResolvedValue([
        {
          login: {
            hasUris: true,
            fido2Credentials: [],
            matchesUri: jest.fn().mockReturnValue(true),
          },
        },
        {
          login: {
            hasUris: false,
            fido2Credentials: [],
            matchesUri: jest.fn().mockReturnValue(false),
          },
        },
      ]),
    });
    desktopSettingsService = mock<DesktopSettingsService>();
    domainSettingService = mock<DomainSettingsService>({
      getUrlEquivalentDomains: jest
        .fn()
        .mockReturnValue(of(new Set(["example.com", "example.org"]))),
      equivalentDomains$: of([
        ["example.com", "example.org"],
        ["example.net", "example.info"],
      ]),
    });
    interfaceService = mock<DesktopFido2UserInterfaceService>({
      getCurrentSession: jest.fn().mockReturnValue(session),
    });

    await TestBed.configureTestingModule({
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
      providers: [
        { provide: DesktopSettingsService, useValue: desktopSettingsService },
        { provide: DesktopFido2UserInterfaceService, useValue: interfaceService },
        { provide: DesktopFido2UserInterfaceSession, useValue: session },
        { provide: CipherService, useValue: cipherService },
        { provide: DomainSettingsService, useValue: domainSettingService },
        { provide: I18nService, useValue: mock<I18nService>() },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Fido2CreateComponent);
    component = fixture.componentInstance;
  });

  it("creates the component", () => {
    expect(component).toBeTruthy();
  });

  it("ngOnInit", async () => {
    component.session = session;

    await component.ngOnInit();

    expect(session.getRpId).toHaveBeenCalledTimes(1);
    expect(domainSettingService.getUrlEquivalentDomains).toHaveBeenCalledWith(rpid);
    expect(cipherService.getAllDecrypted).toHaveBeenCalledTimes(1);
  });

  it("adds pass key to cipher", async () => {
    component.session = session;
    const cipher = new CipherView();

    await component.addPasskeyToCipher(cipher);

    expect(session.notifyConfirmCredential).toHaveBeenCalledWith(true, cipher);
  });

  describe("confirming the pass key", () => {
    //   it("throws an error when no session exists", async () => {
    //     component.session = undefined;

    //     await expect(component.confirmPasskey()).rejects.toThrow("No session found");
    //   });
    it("confirms the pass key", async () => {
      component.session = session;

      await component.confirmPasskey();

      expect(router.navigate).toHaveBeenCalledWith(["/"]);
      expect(session.notifyConfirmCredential).toHaveBeenCalledWith(true);
      expect(desktopSettingsService.setModalMode).toHaveBeenCalledWith(false);
    });
  });

  it("closes the modal", async () => {
    component.session = session;

    await component.closeModal();

    expect(router.navigate).toHaveBeenCalledWith(["/"]);
    expect(desktopSettingsService.setModalMode).toHaveBeenCalledWith(false);
    expect(session.notifyConfirmCredential).toHaveBeenCalledWith(false);
    expect(session.confirmChosenCipher).toHaveBeenCalledWith(null);
  });
});
