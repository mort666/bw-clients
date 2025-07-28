// Mock chalk to avoid dependency issues in test environment
jest.mock("chalk", () => ({
  default: {
    blue: (text: string) => text,
    yellow: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
  },
  blue: (text: string) => text,
  yellow: (text: string) => text,
  green: (text: string) => text,
  red: (text: string) => text,
  cyan: (text: string) => text,
  gray: (text: string) => text,
}));

import * as fs from "fs";
import * as path from "path";

import { Project } from "ts-morph";

import { MigrationConfig } from "../shared/types";

import { MigrationValidator } from "./migration-validator";

describe("MigrationValidator", () => {
  let project: Project;
  let tempDir: string;
  let config: MigrationConfig;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = path.join(__dirname, "temp-test-" + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    // Create test tsconfig.json
    const tsConfigPath = path.join(tempDir, "tsconfig.json");
    fs.writeFileSync(
      tsConfigPath,
      JSON.stringify({
        compilerOptions: {
          target: "ES2020",
          module: "ES2020",
          lib: ["ES2020", "DOM"],
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ["**/*.ts"],
      }),
    );

    config = {
      sourceRoot: tempDir,
      tsConfigPath,
      dryRun: false,
      verbose: false,
    };

    project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should detect remaining I18nService usage", async () => {
    // Create file with remaining I18nService usage
    const testFile = path.join(tempDir, "remaining.ts");
    fs.writeFileSync(
      testFile,
      `
      import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

      class Test {
        constructor(private i18nService: I18nService) {}

        test() {
          // This should be detected as remaining usage
          return this.i18nService.t('notMigrated');
        }
      }
    `,
    );

    project.addSourceFileAtPath(testFile);

    const validator = new MigrationValidator(config);
    const result = await validator.validate();

    expect(result.isValid).toBe(false);
    expect(result.summary.remainingI18nUsages).toBe(1);
    expect(result.issues.length).toBeGreaterThan(0);
    const remainingUsageIssues = result.issues.filter((i) =>
      i.message.includes("Remaining I18nService.t() call"),
    );
    expect(remainingUsageIssues.length).toBe(1);
    expect(remainingUsageIssues[0].type).toBe("error");
  });

  it("should detect malformed $localize usage", async () => {
    // Create file with malformed $localize
    const testFile = path.join(tempDir, "malformed.ts");
    fs.writeFileSync(
      testFile,
      `
      class Test {
        test() {
          // Missing parameter name
          return $localize\`Message with \${param}\`;
        }
      }
    `,
    );

    project.addSourceFileAtPath(testFile);

    const validator = new MigrationValidator(config);
    const result = await validator.validate();

    expect(result.summary.malformedLocalizeUsages).toBeGreaterThan(0);
    const malformedIssues = result.issues.filter((i) => i.message.includes("malformed $localize"));
    expect(malformedIssues.length).toBeGreaterThan(0);
  });

  it("should generate comprehensive validation report", async () => {
    // Create mixed scenario file
    const testFile = path.join(tempDir, "mixed.ts");
    fs.writeFileSync(
      testFile,
      `
      import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

      class Mixed {
        constructor(private i18nService: I18nService) {}

        test() {
          // Remaining usage (error)
          const old = this.i18nService.t('old');

          // Malformed $localize (warning)
          const malformed = $localize\`Bad \${param}\`;

          // Good $localize
          const good = $localize\`Good \${param}:param:\`;

          return [old, malformed, good];
        }
      }
    `,
    );

    project.addSourceFileAtPath(testFile);

    const validator = new MigrationValidator(config);
    const result = await validator.validate();
    const report = validator.generateReport(result);

    expect(report).toContain("Migration Validation Report");
    expect(report).toContain("INVALID");
    expect(report).toContain("Remaining I18nService.t() call");
    expect(report).toContain("malformed $localize");
    expect(result.summary.errors).toBeGreaterThan(0);
    expect(result.summary.warnings).toBeGreaterThan(0);
  });

  it("should validate files without issues", async () => {
    // Create file with proper $localize usage
    const testFile = path.join(tempDir, "valid.ts");
    fs.writeFileSync(
      testFile,
      `
      class Test {
        test() {
          return $localize\`Valid message\`;
        }

        testWithParam() {
          return $localize\`Message with \${param}:param:\`;
        }
      }
    `,
    );

    project.addSourceFileAtPath(testFile);

    const validator = new MigrationValidator(config);
    const result = await validator.validate();

    expect(result.summary.remainingI18nUsages).toBe(0);
    expect(result.summary.malformedLocalizeUsages).toBe(0);

    // May have TypeScript errors due to missing dependencies, but no migration-specific issues
    const migrationIssues = result.issues.filter(
      (i) =>
        i.message.includes("Remaining I18nService") || i.message.includes("malformed $localize"),
    );
    expect(migrationIssues).toHaveLength(0);
  });
});
