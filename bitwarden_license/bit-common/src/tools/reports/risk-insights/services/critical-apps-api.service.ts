import { Injectable } from "@angular/core";
import { BehaviorSubject, firstValueFrom, Observable } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { EncryptService } from "@bitwarden/common/platform/abstractions/encrypt.service";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { Guid } from "@bitwarden/common/types/guid";
import { OrgKey } from "@bitwarden/common/types/key";
import { KeyService } from "@bitwarden/key-management";

@Injectable({
  providedIn: "root",
})
/* Retrieves and decrypts critical apps for a given organization
 *  Encrypts and saves data for a given organization
 */
export class CriticalAppsApiService {
  private criticalAppsList = new BehaviorSubject<PasswordHealthReportApplicationsResponse[]>([]);

  constructor(
    private apiService: ApiService,
    private keyService: KeyService,
    private encryptService: EncryptService,
  ) {}

  // Get a list of critical apps
  get criticalApps$(): Observable<PasswordHealthReportApplicationsResponse[]> {
    return this.criticalAppsList.asObservable();
  }

  // Reset the critical apps list
  set criticalApps(value: PasswordHealthReportApplicationsResponse[]) {
    this.criticalAppsList.next(value);
  }

  // Save the selected critical apps for a given organization
  async setCriticalApps(orgId: string, selectedUrls: string[]) {
    const key = await this.keyService.getOrgKey(orgId);

    // only save records that are not already in the database
    const newEntries = await this.filterNewEntries(orgId, selectedUrls);
    const criticalAppsRequests = await this.encryptNewEntries(orgId, key, newEntries);

    // save the new entries to the database
    const dbResponse = await this.apiService.send(
      "POST",
      "/reports/password-health-report-applications/",
      criticalAppsRequests,
      true,
      true,
    );

    // add the new entries to the criticalAppsList
    for (const responseItem of dbResponse) {
      const decryptedUrl = await this.encryptService.decryptToUtf8(
        new EncString(responseItem.uri),
        key,
      );
      if (!this.criticalAppsList.value.some((f) => f.uri === decryptedUrl)) {
        this.criticalAppsList.value.push({
          id: responseItem.id,
          organizationId: responseItem.organizationId,
          uri: decryptedUrl,
        } as PasswordHealthReportApplicationsResponse);
      }
    }
  }

  // Get the critical apps for a given organization
  async getCriticalApps(
    orgId: string,
  ): Promise<Observable<PasswordHealthReportApplicationsResponse[]>> {
    const response = await this.apiService.send(
      "GET",
      `/reports/password-health-report-applications/${orgId.toString()}`,
      null,
      true,
      true,
    );

    this.criticalAppsList.next([]);
    const key = await this.keyService.getOrgKey(orgId);

    await Promise.all(
      response.map(async (r: { id: Guid; organizationId: Guid; uri: string }) => {
        const decryptedUrl = await this.encryptService.decryptToUtf8(new EncString(r.uri), key);
        this.criticalAppsList.value.push({
          id: r.id,
          organizationId: r.organizationId,
          uri: decryptedUrl,
        } as PasswordHealthReportApplicationsResponse);
      }),
    );

    return this.criticalAppsList.asObservable();
  }

  private async filterNewEntries(orgId: string, selectedUrls: string[]): Promise<string[]> {
    return await firstValueFrom(this.criticalAppsList).then((criticalApps) => {
      const criticalAppsUri = criticalApps
        .filter((f) => f.organizationId === orgId)
        .map((f) => f.uri);
      return selectedUrls.filter((url) => !criticalAppsUri.includes(url));
    });
  }

  private async encryptNewEntries(
    orgId: string,
    key: OrgKey,
    newEntries: string[],
  ): Promise<PasswordHealthReportApplicationsRequest[]> {
    const criticalAppsPromises = newEntries.map(async (url) => {
      const encryptedUrlName = await this.encryptService.encrypt(url, key);
      return {
        organizationId: orgId,
        url: encryptedUrlName.encryptedString.toString(),
      } as PasswordHealthReportApplicationsRequest;
    });

    return await Promise.all(criticalAppsPromises);
  }
}

export interface PasswordHealthReportApplicationsRequest {
  organizationId: Guid;
  url: string;
}

export interface PasswordHealthReportApplicationsResponse {
  id: Guid;
  organizationId: Guid;
  uri: string;
}
