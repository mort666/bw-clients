import { Injectable } from "@angular/core";

import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { PasswordStrengthServiceAbstraction } from "@bitwarden/common/tools/password-strength";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { BadgeVariant } from "@bitwarden/components";

import { MemberCipherDetailsApiService } from "./member-cipher-details-api.service";

export type ApplicationHealthReportDetail = {
  applicationName: string;
  passwordCount: number;
  atRiskPasswordCount: number;
  memberCount: number;
  atRiskMemberCount: number;

  memberDetails: MemberDetailsFlat[];
  atRiskMemberDetails: MemberDetailsFlat[];
};

export type CipherHealthReportUriDetail = {
  cipherId: string;
  reusedPasswordCount: number;
  weakPasswordDetail: WeakPasswordDetail;
  exposedPasswordDetail: ExposedPasswordDetail;
  cipherMembers: MemberDetailsFlat[];
  trimmedUri: string;
};

export type CipherHealthReportDetail = CipherView & {
  reusedPasswordCount: number;
  weakPasswordDetail: WeakPasswordDetail;
  exposedPasswordDetail: ExposedPasswordDetail;
  cipherMembers: MemberDetailsFlat[];
  trimmedUris: string[];
};

type WeakPasswordDetail = {
  score: number;
  detailValue: WeakPasswordScore;
};

type WeakPasswordScore = {
  label: string;
  badgeVariant: BadgeVariant;
};

type ExposedPasswordDetail = {
  exposedXTimes: number;
};

export type MemberDetailsFlat = {
  userName: string;
  email: string;
  cipherId: string;
};
@Injectable()
export class RiskInsightsReportService {
  passwordUseMap = new Map<string, number>();

  constructor(
    private passwordStrengthService: PasswordStrengthServiceAbstraction,
    private auditService: AuditService,
    private cipherService: CipherService,
    private memberCipherDetailsApiService: MemberCipherDetailsApiService,
  ) {}

  // Report data from raw cipher health data.
  // Can be used in the Raw Data diagnostic tab (just exclude the members in the view)
  // and can be used in the raw data + members tab when including the members in the view
  async generateRawDataReport(organizationId: string): Promise<CipherHealthReportDetail[]> {
    const allCiphers = await this.cipherService.getAllFromApiForOrganization(organizationId);
    const memberCipherDetails =
      await this.memberCipherDetailsApiService.getMemberCipherDetails(organizationId);
    const flattenedDetails: MemberDetailsFlat[] = memberCipherDetails.flatMap((dtl) =>
      dtl.cipherIds.map((c) => this.getMemberDetailsFlat(dtl.userName, dtl.email, c)),
    );

    return this.getCipherDetails(allCiphers, flattenedDetails);
  }

  // Report data for raw cipher health broken out into the uris
  // Can be used in the raw data + members + uri diagnostic report
  async generateRawDataUriReport(organizationId: string): Promise<CipherHealthReportUriDetail[]> {
    const cipherHealthDetails = await this.generateRawDataReport(organizationId);

    return this.getCipherUriDetails(cipherHealthDetails);
  }

  // Report data for the aggregation of uris to like uris and getting password/member counts,
  // members, and at risk statuses.
  async generateApplicationsReport(
    organizationId: string,
  ): Promise<ApplicationHealthReportDetail[]> {
    const cipherHealthUriReport = await this.generateRawDataUriReport(organizationId);
    return this.getApplicationHealthReport(cipherHealthUriReport);
  }

  private async getCipherDetails(
    ciphers: CipherView[],
    memberDetails: MemberDetailsFlat[],
  ): Promise<CipherHealthReportDetail[]> {
    const cipherHealthReports: CipherHealthReportDetail[] = [];

    for (const cipher of ciphers) {
      if (this.validateCipher(cipher)) {
        const weakPassword = this.findWeakPassword(cipher);
        // Looping over all ciphers needs to happen first to determine reused passwords over all ciphers.
        // Store in the set and evaluate later
        this.findReusedPassword(cipher);
        const exposedPassword = await this.findExposedPassword(cipher);

        // Get the cipher members
        const cipherMembers = memberDetails.filter((x) => x.cipherId === cipher.id);

        // Trim uris to host name and create the cipher health report
        const cipherTrimmedUris = this.getTrimmedCipherUris(cipher);
        const cipherHealth = {
          ...cipher,
          weakPasswordDetail: weakPassword,
          exposedPasswordDetail: exposedPassword,
          cipherMembers: cipherMembers,
          trimmedUris: cipherTrimmedUris,
        } as CipherHealthReportDetail;

        cipherHealthReports.push(cipherHealth);
      }
    }

    // loop for reused passwords
    cipherHealthReports.forEach((detail) => {
      detail.reusedPasswordCount = this.passwordUseMap.has(detail.id)
        ? this.passwordUseMap.get(detail.id)
        : 0;
    });
    return cipherHealthReports;
  }

  // Flattens the cipher to trimmed uris. Used for the raw data + uri
  private getCipherUriDetails(
    cipherHealthReport: CipherHealthReportDetail[],
  ): CipherHealthReportUriDetail[] {
    return cipherHealthReport.flatMap((rpt) =>
      rpt.trimmedUris.map((u) => this.getFlattenedCipherDetails(rpt, u)),
    );
  }

  // Loop through the flattened cipher to uri data. If the item exists it's values need to be updated with the new item.
  // If the item is new, create and add the object with the flattened details
  private getApplicationHealthReport(
    cipherHealthUriReport: CipherHealthReportUriDetail[],
  ): ApplicationHealthReportDetail[] {
    const appReports: ApplicationHealthReportDetail[] = [];
    cipherHealthUriReport.forEach((uri) => {
      const index = appReports.findIndex((item) => item.applicationName === uri.trimmedUri);

      let atRisk: boolean = false;
      if (uri.exposedPasswordDetail || uri.weakPasswordDetail || uri.reusedPasswordCount > 0) {
        atRisk = true;
      }

      if (index === -1) {
        appReports.push(this.getApplicationReportDetail(uri, atRisk));
      } else {
        appReports[index] = this.getApplicationReportDetail(uri, atRisk, appReports[index]);
      }
    });
    return appReports;
  }

  private findReusedPassword(cipher: CipherView) {
    if (this.passwordUseMap.has(cipher.login.password)) {
      this.passwordUseMap.set(
        cipher.login.password,
        (this.passwordUseMap.get(cipher.login.password) || 0) + 1,
      );
    } else {
      this.passwordUseMap.set(cipher.login.password, 1);
    }
  }

  private async findExposedPassword(cipher: CipherView): Promise<ExposedPasswordDetail> {
    const exposedCount = await this.auditService.passwordLeaked(cipher.login.password);
    if (exposedCount > 0) {
      const exposedDetail = { exposedXTimes: exposedCount } as ExposedPasswordDetail;
      return exposedDetail;
    }
    return null;
  }

  private findWeakPassword(cipher: CipherView): WeakPasswordDetail {
    const hasUserName = this.isUserNameNotEmpty(cipher);
    let userInput: string[] = [];
    if (hasUserName) {
      const atPosition = cipher.login.username.indexOf("@");
      if (atPosition > -1) {
        userInput = userInput
          .concat(
            cipher.login.username
              .substring(0, atPosition)
              .trim()
              .toLowerCase()
              .split(/[^A-Za-z0-9]/),
          )
          .filter((i) => i.length >= 3);
      } else {
        userInput = cipher.login.username
          .trim()
          .toLowerCase()
          .split(/[^A-Za-z0-9]/)
          .filter((i) => i.length >= 3);
      }
    }
    const { score } = this.passwordStrengthService.getPasswordStrength(
      cipher.login.password,
      null,
      userInput.length > 0 ? userInput : null,
    );

    if (score != null && score <= 2) {
      const scoreValue = this.weakPasswordScore(score);
      const weakPasswordDetail = { score: score, detailValue: scoreValue } as WeakPasswordDetail;
      return weakPasswordDetail;
    }
    return null;
  }

  private weakPasswordScore(score: number): WeakPasswordScore {
    switch (score) {
      case 4:
        return { label: "strong", badgeVariant: "success" };
      case 3:
        return { label: "good", badgeVariant: "primary" };
      case 2:
        return { label: "weak", badgeVariant: "warning" };
      default:
        return { label: "veryWeak", badgeVariant: "danger" };
    }
  }

  // Create the new application health report detail object with the details from the cipher health report uri detail object
  // update or create the at risk values if the item is at risk.
  private getApplicationReportDetail(
    newUriDetail: CipherHealthReportUriDetail,
    isAtRisk: boolean,
    existingUriDetail?: ApplicationHealthReportDetail,
  ): ApplicationHealthReportDetail {
    const reportDetail = {
      applicationName: existingUriDetail
        ? existingUriDetail.applicationName
        : newUriDetail.trimmedUri,
      passwordCount: existingUriDetail ? existingUriDetail.passwordCount + 1 : 1,
      memberDetails: existingUriDetail
        ? this.getUniqueMembers(existingUriDetail.memberDetails.concat(newUriDetail.cipherMembers))
        : newUriDetail.cipherMembers,
      atRiskMemberDetails: existingUriDetail ? existingUriDetail.atRiskMemberDetails : [],
      atRiskPasswordCount: existingUriDetail ? existingUriDetail.atRiskPasswordCount : 0,
    } as ApplicationHealthReportDetail;

    if (isAtRisk) {
      (reportDetail.atRiskPasswordCount = reportDetail.atRiskPasswordCount + 1),
        (reportDetail.atRiskMemberDetails = this.getUniqueMembers(
          reportDetail.atRiskMemberDetails.concat(newUriDetail.cipherMembers),
        ));
    }

    reportDetail.memberCount = reportDetail.memberDetails.length;

    return reportDetail;
  }

  // Gets a distinct list of members given a list of members.
  // Uses a set here to avoid using indexOf.
  private getUniqueMembers(orgMembers: MemberDetailsFlat[]): MemberDetailsFlat[] {
    const existingEmails = new Set<string>();
    const distinctUsers = orgMembers.filter((member) => {
      if (existingEmails.has(member.email)) {
        return false;
      }
      existingEmails.add(member.email);
      return true;
    });
    return distinctUsers;
  }

  private getFlattenedCipherDetails(
    detail: CipherHealthReportDetail,
    uri: string,
  ): CipherHealthReportUriDetail {
    return {
      cipherId: detail.id,
      reusedPasswordCount: detail.reusedPasswordCount,
      weakPasswordDetail: detail.weakPasswordDetail,
      exposedPasswordDetail: detail.exposedPasswordDetail,
      cipherMembers: detail.cipherMembers,
      trimmedUri: uri,
    };
  }

  private getMemberDetailsFlat(
    userName: string,
    email: string,
    cipherId: string,
  ): MemberDetailsFlat {
    return {
      userName: userName,
      email: email,
      cipherId: cipherId,
    };
  }

  // Trim the cipher uris down to get the password health application.
  // The uri should only exist once after being trimmed. No duplication.
  // Example:
  //   - Untrimmed Uris: https://gmail.com, gmail.com/login
  //   - Both would trim to gmail.com
  //   - The cipher trimmed uri list should only return on instance in the list
  private getTrimmedCipherUris(cipher: CipherView): string[] {
    const cipherUris: string[] = [];
    const uris = cipher.login?.uris ?? [];
    uris.map((u: { uri: string }) => {
      const uri = Utils.getHostname(u.uri).replace("www.", "");
      if (!cipherUris.includes(uri)) {
        cipherUris.push(uri);
      }
    });
    return cipherUris;
  }

  private isUserNameNotEmpty(c: CipherView): boolean {
    return !Utils.isNullOrWhitespace(c.login.username);
  }

  /**
   * Validates that the cipher is a login item, has a password
   * is not deleted, and the user can view the password
   * @param c the input cipher
   */
  private validateCipher(c: CipherView): boolean {
    const { type, login, isDeleted, viewPassword } = c;
    if (
      type !== CipherType.Login ||
      login.password == null ||
      login.password === "" ||
      isDeleted ||
      !viewPassword
    ) {
      return false;
    }
    return true;
  }
}
