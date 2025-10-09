import { Utils } from "@bitwarden/common/platform/misc/utils";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

import {
  MemberDetails,
  OrganizationReportSummary,
  RiskInsightsData,
} from "../models/report-models";
import { MemberCipherDetailsResponse } from "../response/member-cipher-details.response";

export function flattenMemberDetails(
  memberCiphers: MemberCipherDetailsResponse[],
): MemberDetails[] {
  return memberCiphers.flatMap((member) =>
    member.cipherIds.map((cipherId) => ({
      userGuid: member.userGuid,
      userName: member.userName,
      email: member.email,
      cipherId,
    })),
  );
}
/**
 * Trim the cipher uris down to get the password health application.
 * The uri should only exist once after being trimmed. No duplication.
 * Example:
 *   - Untrimmed Uris: https://gmail.com, gmail.com/login
 *   - Both would trim to gmail.com
 *   - The cipher trimmed uri list should only return on instance in the list
 * @param cipher
 * @returns distinct list of trimmed cipher uris
 */
export function getTrimmedCipherUris(cipher: CipherView): string[] {
  const uris = cipher.login?.uris ?? [];

  const uniqueDomains = new Set<string>();

  uris.forEach((u: { uri: string | undefined }) => {
    const domain = Utils.getDomain(u.uri) ?? u.uri;
    uniqueDomains.add(domain);
  });
  return Array.from(uniqueDomains);
}

// Returns a deduplicated array of members by email
export function getUniqueMembers(orgMembers: MemberDetails[]): MemberDetails[] {
  const existingEmails = new Set<string>();
  return orgMembers.filter((member) => {
    if (existingEmails.has(member.email)) {
      return false;
    }
    existingEmails.add(member.email);
    return true;
  });
}

/**
 * Create a new Risk Insights Report
 *
 * @returns An empty report
 */
export function createNewReportData(): RiskInsightsData {
  return {
    creationDate: new Date(),
    reportData: [],
    summaryData: createNewSummaryData(),
    applicationData: [],
  };
}

/**
 * Create a new Risk Insights Report Summary
 *
 * @returns An empty report summary
 */
export function createNewSummaryData(): OrganizationReportSummary {
  return {
    totalMemberCount: 0,
    totalAtRiskMemberCount: 0,
    totalApplicationCount: 0,
    totalAtRiskApplicationCount: 0,
    totalCriticalMemberCount: 0,
    totalCriticalAtRiskMemberCount: 0,
    totalCriticalApplicationCount: 0,
    totalCriticalAtRiskApplicationCount: 0,
    newApplications: [],
  };
}
