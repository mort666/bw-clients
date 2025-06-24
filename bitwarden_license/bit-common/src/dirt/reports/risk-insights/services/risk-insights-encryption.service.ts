// FIXME: Update this file to be type safe
// @ts-strict-ignore
import { EncryptService } from "@bitwarden/common/key-management/crypto/abstractions/encrypt.service";
import { KeyGenerationService } from "@bitwarden/common/platform/abstractions/key-generation.service";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { OrganizationId } from "@bitwarden/common/types/guid";
import { KeyService } from "@bitwarden/key-management";

import {
  ApplicationHealthReportDetail,
  ApplicationHealthReportSummary,
  RiskInsightsReport,
  GetRiskInsightsReportResponse,
} from "../models/password-health";

export class RiskInsightsEncryptionService {
  constructor(
    private keyService: KeyService,
    private encryptService: EncryptService,
    private keyGeneratorService: KeyGenerationService,
  ) {}

  async generateEncryptedRiskInsightsReport(
    organizationId: OrganizationId,
    details: ApplicationHealthReportDetail[],
    summary: ApplicationHealthReportSummary,
  ): Promise<RiskInsightsReport> {
    const orgKey = await this.keyService.getOrgKey(organizationId as string);
    if (orgKey === null) {
      throw new Error("Organization key not found");
    }

    const reportWithSummary = { details, summary };

    const reportContentEncryptionKey = await this.keyGeneratorService.createKey(512);

    const reportEncrypted = await this.encryptService.encryptString(
      JSON.stringify(reportWithSummary),
      reportContentEncryptionKey,
    );

    const wrappedReportContentEncryptionKey = await this.encryptService.wrapSymmetricKey(
      reportContentEncryptionKey,
      orgKey,
    );

    const reportDataWithWrappedKey = {
      data: reportEncrypted.encryptedString,
      key: wrappedReportContentEncryptionKey.encryptedString,
    };

    const riskInsightReport = {
      organizationId: organizationId,
      date: new Date().toISOString(),
      reportData: JSON.stringify(reportDataWithWrappedKey),
      totalMembers: 0,
      totalAtRiskMembers: 0,
      totalApplications: 0,
      totalAtRiskApplications: 0,
      totalCriticalApplications: 0,
    };

    return riskInsightReport;
  }

  async decryptRiskInsightsReport(
    organizationId: OrganizationId,
    riskInsightsReportResponse: GetRiskInsightsReportResponse,
  ): Promise<[ApplicationHealthReportDetail[], ApplicationHealthReportSummary]> {
    try {
      const orgKey = await this.keyService.getOrgKey(organizationId as string);
      if (orgKey === null) {
        throw new Error("Organization key not found");
      }

      const reportDataInJson = JSON.parse(riskInsightsReportResponse.reportData);
      const reportEncrypted = reportDataInJson.data;
      const wrappedReportContentEncryptionKey = reportDataInJson.key;

      const unwrappedReportContentEncryptionKey = await this.encryptService.unwrapSymmetricKey(
        new EncString(wrappedReportContentEncryptionKey),
        orgKey,
      );

      const reportUnencrypted = await this.encryptService.decryptString(
        new EncString(reportEncrypted),
        unwrappedReportContentEncryptionKey,
      );

      const reportWithSummary = JSON.parse(reportUnencrypted);
      const reportJson = reportWithSummary.details;
      const reportSummary = reportWithSummary.summary;

      return [reportJson, reportSummary];
    } catch {
      return [null, null];
    }
  }
}
