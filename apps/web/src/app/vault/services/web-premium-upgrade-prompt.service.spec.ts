import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { lastValueFrom, of } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { OrganizationId } from "@bitwarden/common/types/guid";
import { DialogRef, DialogService } from "@bitwarden/components";

import { VaultItemDialogResult } from "../components/vault-item-dialog/vault-item-dialog.component";

import { WebVaultPremiumUpgradePromptService } from "./web-premium-upgrade-prompt.service";

describe("WebVaultPremiumUpgradePromptService", () => {
  let service: WebVaultPremiumUpgradePromptService;
  let dialogServiceMock: jest.Mocked<DialogService>;
  let routerMock: jest.Mocked<Router>;
  let dialogRefMock: jest.Mocked<DialogRef<VaultItemDialogResult>>;
  let configServiceMock: jest.Mocked<ConfigService>;
  let accountServiceMock: jest.Mocked<AccountService>;

  beforeEach(() => {
    dialogServiceMock = {
      openSimpleDialog: jest.fn(),
    } as unknown as jest.Mocked<DialogService>;

    configServiceMock = {
      getFeatureFlag: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<ConfigService>;

    accountServiceMock = {
      activeAccount$: of({ id: "user-123" }),
    } as unknown as jest.Mocked<AccountService>;

    routerMock = {
      navigate: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    dialogRefMock = {
      close: jest.fn(),
    } as unknown as jest.Mocked<DialogRef<VaultItemDialogResult>>;

    TestBed.configureTestingModule({
      providers: [
        WebVaultPremiumUpgradePromptService,
        { provide: DialogService, useValue: dialogServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: DialogRef, useValue: dialogRefMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
      ],
    });

    service = TestBed.inject(WebVaultPremiumUpgradePromptService);
  });

  it("prompts for premium upgrade and navigates to organization billing if organizationId is provided", async () => {
    dialogServiceMock.openSimpleDialog.mockReturnValue(lastValueFrom(of(true)));
    const organizationId = "test-org-id" as OrganizationId;

    await service.promptForPremium(organizationId);

    expect(dialogServiceMock.openSimpleDialog).toHaveBeenCalledWith({
      title: { key: "upgradeOrganization" },
      content: { key: "upgradeOrganizationDesc" },
      acceptButtonText: { key: "upgradeOrganization" },
      type: "info",
    });
    expect(routerMock.navigate).toHaveBeenCalledWith([
      "organizations",
      organizationId,
      "billing",
      "subscription",
    ]);
    expect(dialogRefMock.close).toHaveBeenCalledWith(VaultItemDialogResult.PremiumUpgrade);
  });

  it("prompts for premium upgrade and navigates to premium subscription if organizationId is not provided", async () => {
    dialogServiceMock.openSimpleDialog.mockReturnValue(lastValueFrom(of(true)));

    await service.promptForPremium();

    expect(dialogServiceMock.openSimpleDialog).toHaveBeenCalledWith({
      title: { key: "premiumRequired" },
      content: { key: "premiumRequiredDesc" },
      acceptButtonText: { key: "upgrade" },
      type: "success",
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(["settings/subscription/premium"]);
    expect(dialogRefMock.close).toHaveBeenCalledWith(VaultItemDialogResult.PremiumUpgrade);
  });

  it("does not navigate or close dialog if upgrade is no action is taken", async () => {
    dialogServiceMock.openSimpleDialog.mockReturnValue(lastValueFrom(of(false)));

    await service.promptForPremium("test-org-id" as OrganizationId);

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});
