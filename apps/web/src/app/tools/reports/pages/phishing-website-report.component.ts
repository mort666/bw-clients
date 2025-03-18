import { Component, OnInit } from "@angular/core";

import { CollectionService } from "@bitwarden/admin-console/common";
import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { SyncService } from "@bitwarden/common/platform/sync";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { DialogService } from "@bitwarden/components";
import { PasswordRepromptService, CipherFormConfigService } from "@bitwarden/vault";

import { AdminConsoleCipherFormConfigService } from "../../../vault/org-vault/services/admin-console-cipher-form-config.service";

import { CipherReportComponent } from "./cipher-report.component";

type ReportResult = CipherView & { exposedXTimes: number };

@Component({
  selector: "app-phishing-webiste-report",
  templateUrl: "phishing-website-report.component.html",
})
export class PhishingWebsiteReport extends CipherReportComponent implements OnInit {
  disabled = true;

  constructor(
    protected cipherService: CipherService,
    protected organizationService: OrganizationService,
    dialogService: DialogService,
    accountService: AccountService,
    passwordRepromptService: PasswordRepromptService,
    i18nService: I18nService,
    protected auditService: AuditService,
    syncService: SyncService,
    private collectionService: CollectionService,
    cipherFormConfigService: CipherFormConfigService,
    adminConsoleCipherFormConfigService: AdminConsoleCipherFormConfigService,
  ) {
    super(
      cipherService,
      dialogService,
      passwordRepromptService,
      organizationService,
      accountService,
      i18nService,
      syncService,
      cipherFormConfigService,
      adminConsoleCipherFormConfigService,
    );
  }

  async ngOnInit() {
    await super.load();
  }

  async setCiphers() {
    const allCiphers = await this.getAllCiphers();
    const visitedPhishingWebsites: ReportResult[] = [];
    const promises: Promise<void>[] = [];
    this.filterStatus = [0];
    allCiphers.forEach((ciph) => {
      const { type, login, isDeleted, edit, viewPassword } = ciph;
      if (
        type !== CipherType.Login ||
        login.password == null ||
        login.password === "" ||
        isDeleted ||
        (!this.organization && !edit) ||
        !viewPassword
      ) {
        return;
      }

      const promise = this.auditService.passwordLeaked(login.password).then((exposedCount) => {
        if (exposedCount > 0) {
          const row = { ...ciph, exposedXTimes: exposedCount } as ReportResult;
          visitedPhishingWebsites.push(row);
        }
      });
      promises.push(promise);
    });
    await Promise.all(promises);
    this.filterCiphersByOrg(visitedPhishingWebsites);
    this.dataSource.sort = { column: "exposedXTimes", direction: "desc" };
  }

  /**
   * Cipher needs to be a Login type, contain Uris, and not be deleted
   * @param cipher Current cipher with unsecured uri
   */
  private cipherContainsUnsecured(cipher: CipherView): boolean {
    if (
      cipher.type !== CipherType.Login ||
      !cipher.login.hasUris ||
      cipher.isDeleted ||
      (!this.organization && !cipher.edit)
    ) {
      return false;
    }

    const containsUnsecured = cipher.login.uris.some(
      (u: any) => u.uri != null && u.uri.indexOf("http://") === 0,
    );
    return containsUnsecured;
  }

  /**
   * Provides a way to determine if someone with permissions to run an organizational report is also able to view/edit ciphers within the results
   * Default to true for indivduals running reports on their own vault.
   * @param c CipherView
   * @returns boolean
   */
  protected canManageCipher(c: CipherView): boolean {
    // this will only ever be false from the org view;
    return true;
  }
}
