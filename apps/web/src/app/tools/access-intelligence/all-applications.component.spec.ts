import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { mock, MockProxy } from "jest-mock-extended";
import { of } from "rxjs";

// eslint-disable-next-line no-restricted-imports
import {
  CriticalAppsApiService,
  PasswordHealthReportApplicationsResponse,
} from "@bitwarden/bit-common/tools/reports/risk-insights";
import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { OrganizationData } from "@bitwarden/common/admin-console/models/data/organization.data";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PasswordStrengthServiceAbstraction } from "@bitwarden/common/tools/password-strength";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { TableModule, ToastService } from "@bitwarden/components";
import { TableBodyDirective } from "@bitwarden/components/src/table/table.component";

import { LooseComponentsModule } from "../../shared";
import { PipesModule } from "../../vault/individual-vault/pipes/pipes.module";

import { AllApplicationsComponent } from "./all-applications.component";

describe("AllApplicationsComponent", () => {
  const organizationServiceMock: OrganizationService = mock<OrganizationService>();
  const configServiceMock: ConfigService = mock<ConfigService>();
  const criticalAppsApiServiceMock: CriticalAppsApiService = mock<CriticalAppsApiService>();
  const i18nService: MockProxy<I18nService> = mock<I18nService>();
  let fixture: ComponentFixture<AllApplicationsComponent>;
  let component: AllApplicationsComponent;
  const activeRouteParams = convertToParamMap({ organizationId: "orgId" });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllApplicationsComponent, PipesModule, TableModule, LooseComponentsModule],
      declarations: [TableBodyDirective],
      providers: [
        { provide: CipherService, useValue: mock<CipherService>() },
        {
          provide: PasswordStrengthServiceAbstraction,
          useValue: mock<PasswordStrengthServiceAbstraction>(),
        },
        { provide: AuditService, useValue: mock<AuditService>() },
        { provide: I18nService, useValue: i18nService },
        { provide: ActivatedRoute, useValue: { paramMap: of(activeRouteParams), url: of([]) } },
        { provide: ToastService, useValue: mock<ToastService>() },
        { provide: OrganizationService, useValue: organizationServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: CriticalAppsApiService, useValue: criticalAppsApiServiceMock },
      ],
    }).compileComponents();
  });

  beforeEach(async () => {
    const data = new OrganizationData({} as any, {} as any);
    const organization = new Organization(data);
    organization.name = "orgName";
    jest.spyOn(organizationServiceMock, "get$").mockReturnValue(of(organization));

    const pwdHealthReportAppsResponse = [
      { id: "1", organizationId: "app1", uri: "" },
    ] as PasswordHealthReportApplicationsResponse[];
    jest
      .spyOn(criticalAppsApiServiceMock, "getCriticalApps")
      .mockResolvedValue(Promise.resolve(pwdHealthReportAppsResponse));

    jest.spyOn(configServiceMock, "getFeatureFlag").mockResolvedValue(true);

    fixture = TestBed.createComponent(AllApplicationsComponent);
    component = fixture.componentInstance;

    await component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it("should initialize component", () => {
    expect(component).toBeTruthy();
  });

  it("should add to selectedUrls on checkbox change", async () => {
    const event = { target: { checked: true } as HTMLInputElement } as unknown as Event;
    component.onCheckboxChange("app1", event);
    expect(component.getSelectedUrls().length).toBe(1);
  });

  it("should invoke CriticalAppsApiService", async () => {
    jest.spyOn(criticalAppsApiServiceMock, "setCriticalApps").mockResolvedValue(Promise.resolve());
    const event = { target: { checked: true } as HTMLInputElement } as unknown as Event;
    component.onCheckboxChange("app1", event);

    await component.markAppsAsCritical();
    expect(criticalAppsApiServiceMock.setCriticalApps).toHaveBeenCalled();
    expect(component.getSelectedUrls().length).toBe(0);
  });
});
