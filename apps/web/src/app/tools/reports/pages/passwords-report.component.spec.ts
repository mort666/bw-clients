// eslint-disable-next-line no-restricted-imports
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { MockProxy, mock } from "jest-mock-extended";
import { of } from "rxjs";

import { I18nPipe } from "@bitwarden/angular/platform/pipes/i18n.pipe";
import { ModalService } from "@bitwarden/angular/services/modal.service";
import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PasswordStrengthServiceAbstraction } from "@bitwarden/common/tools/password-strength";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import {
  TableBodyDirective,
  TableComponent,
} from "@bitwarden/components/src/table/table.component";
import { PasswordRepromptService } from "@bitwarden/vault";
// eslint-disable-next-line no-restricted-imports
import { PipesModule } from "@bitwarden/web-vault/app/vault/individual-vault/pipes/pipes.module";

import { PasswordsReportComponent } from "./passwords-report.component";
import { userData } from "./passwords-report.mock";
import { cipherData } from "./reports-ciphers.mock";

describe("PasswordsReportComponent", () => {
  let component: PasswordsReportComponent;
  let fixture: ComponentFixture<PasswordsReportComponent>;
  let passwordStrengthService: MockProxy<PasswordStrengthServiceAbstraction>;
  let organizationService: MockProxy<OrganizationService>;
  let syncServiceMock: MockProxy<SyncService>;
  let cipherServiceMock: MockProxy<CipherService>;
  let auditServiceMock: MockProxy<AuditService>;

  beforeEach(async () => {
    passwordStrengthService = mock<PasswordStrengthServiceAbstraction>();
    auditServiceMock = mock<AuditService>();
    organizationService = mock<OrganizationService>();
    syncServiceMock = mock<SyncService>();
    cipherServiceMock = mock<CipherService>();

    organizationService.organizations$ = of([]);

    await TestBed.configureTestingModule({
      imports: [PipesModule],
      declarations: [PasswordsReportComponent, I18nPipe, TableComponent, TableBodyDirective],
      providers: [
        { provide: CipherService, useValue: cipherServiceMock },
        { provide: PasswordStrengthServiceAbstraction, useValue: passwordStrengthService },
        { provide: AuditService, useValue: auditServiceMock },
        { provide: OrganizationService, useValue: organizationService },
        { provide: ModalService, useValue: mock<ModalService>() },
        { provide: PasswordRepromptService, useValue: mock<PasswordRepromptService>() },
        { provide: SyncService, useValue: syncServiceMock },
        { provide: I18nService, useValue: mock<I18nService>() },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordsReportComponent);
    component = fixture.componentInstance;

    (component as any).cipherData = cipherData;
    (component as any).userData = userData;

    fixture.detectChanges();
  });

  it("should initialize component", () => {
    expect(component).toBeTruthy();
  });

  it("should populate reportCiphers with ciphers that have password issues", async () => {
    passwordStrengthService.getPasswordStrength.mockReturnValue({ score: 1 } as any);

    auditServiceMock.passwordLeaked.mockResolvedValue(5);

    await component.setCiphers();

    const cipherIds = component.reportCiphers.map((c) => c.id);

    expect(cipherIds).toEqual([
      "cbea34a8-bde4-46ad-9d19-b05001228ab2",
      "cbea34a8-bde4-46ad-9d19-b05001228cd3",
      "cbea34a8-bde4-46ad-9d19-b05001227nm6",
      "cbea34a8-bde4-46ad-9d19-b05001227nm7",
    ]);
    expect(component.reportCiphers.length).toEqual(4);
  });

  it("should call fullSync method of syncService", () => {
    expect(syncServiceMock.fullSync).toHaveBeenCalledWith(false);
  });

  it("should correctly populate passwordStrengthMap", async () => {
    passwordStrengthService.getPasswordStrength.mockImplementation((password) => {
      let score = 0;
      if (password === "123") {
        score = 1;
      } else {
        score = 4;
      }
      return { score } as any;
    });

    auditServiceMock.passwordLeaked.mockResolvedValue(0);

    await component.setCiphers();

    expect(component.passwordStrengthMap.size).toBeGreaterThan(0);
    expect(component.passwordStrengthMap.get("cbea34a8-bde4-46ad-9d19-b05001228ab2")).toEqual([
      "veryWeak",
      "danger",
    ]);
    expect(component.passwordStrengthMap.get("cbea34a8-bde4-46ad-9d19-b05001228cd3")).toEqual([
      "veryWeak",
      "danger",
    ]);
  });

  it("should display totalMembers in the template", async () => {
    passwordStrengthService.getPasswordStrength.mockReturnValue({ score: 1 } as any);

    auditServiceMock.passwordLeaked.mockResolvedValue(0);

    await component.ngOnInit();

    component.hasLoaded = true;

    await fixture.whenStable();
    fixture.detectChanges();

    const totalMembersCells = fixture.debugElement
      .queryAll(By.css('[data-testid="total-membership"]'))
      .map((cell) => cell.nativeElement);

    const totalMembersValues = totalMembersCells.map((cell) => cell.textContent.trim());

    expect(totalMembersValues[0]).toBe("4");
    expect(totalMembersValues[1]).toBe("5");
    expect(totalMembersValues[2]).toBe("0");
    expect(totalMembersValues[3]).toBe("1");
  });
});
