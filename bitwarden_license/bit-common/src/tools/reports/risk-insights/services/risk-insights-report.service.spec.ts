import { TestBed } from "@angular/core/testing";

import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { PasswordStrengthServiceAbstraction } from "@bitwarden/common/tools/password-strength";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";

import { mockCiphers } from "./ciphers.mock";
import { MemberCipherDetailsApiService } from "./member-cipher-details-api.service";
import { mockMemberCipherDetails } from "./member-cipher-details-api.service.spec";
import { RiskInsightsReportService } from "./risk-insights-report.service";

describe("RiskInsightsReportService", () => {
  let service: RiskInsightsReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RiskInsightsReportService,
        {
          provide: PasswordStrengthServiceAbstraction,
          useValue: {
            getPasswordStrength: (password: string) => {
              const score = password.length < 4 ? 1 : 4;
              return { score };
            },
          },
        },
        {
          provide: AuditService,
          useValue: {
            passwordLeaked: (password: string) => Promise.resolve(password === "123" ? 100 : 0),
          },
        },
        {
          provide: CipherService,
          useValue: {
            getAllFromApiForOrganization: jest.fn().mockResolvedValue(mockCiphers),
          },
        },
        {
          provide: MemberCipherDetailsApiService,
          useValue: {
            getMemberCipherDetails: jest.fn().mockResolvedValue(mockMemberCipherDetails),
          },
        },
      ],
    });

    service = TestBed.inject(RiskInsightsReportService);
  });

  it("should generate the raw data report correctly", async () => {
    const result = await service.generateRawDataReport("orgId");

    expect(result).toHaveLength(4);
  });
});
