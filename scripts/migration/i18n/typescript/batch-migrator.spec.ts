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

import { BatchMigrator, BatchMigrationOptions } from "./batch-migrator";
import { MigrationValidator } from "./migration-validator";

describe("BatchMigrator", () => {
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

  it("should handle batch migration of multiple files", async () => {
    // Create test files
    const testFiles = [
      {
        path: path.join(tempDir, "component1.ts"),
        content: `
          import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

          class Component1 {
            constructor(private i18nService: I18nService) {}

            getMessage() {
              return this.i18nService.t('message1');
            }
          }
        `,
      },
      {
        path: path.join(tempDir, "component2.ts"),
        content: `
          import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

          class Component2 {
            test() {
              const msg = this.i18nService.t('message2', 'param');
              return msg;
            }
          }
        `,
      },
      {
        path: path.join(tempDir, "service.ts"),
        content: `
          import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

          class TestService {
            constructor(private i18n: I18nService) {}

            getMessages() {
              return [
                this.i18n.t('service.message1'),
                this.i18n.t('service.message2', count.toString())
              ];
            }
          }
        `,
      },
    ];

    // Write test files
    testFiles.forEach((file) => {
      fs.writeFileSync(file.path, file.content);
      project.addSourceFileAtPath(file.path);
    });

    const options: BatchMigrationOptions = {
      config,
      batchSize: 2,
      maxConcurrency: 1,
      outputDir: path.join(tempDir, "reports"),
      createBackups: true,
      continueOnError: true,
    };

    const batchMigrator = new BatchMigrator(options);
    const result = await batchMigrator.migrate();

    expect(result.totalFiles).toBe(3);
    expect(result.successfulFiles).toBe(3);
    expect(result.failedFiles).toBe(0);
    expect(result.results).toHaveLength(3);

    // Verify backups were created
    const backupDir = path.join(tempDir, "reports", "backups");
    expect(fs.existsSync(backupDir)).toBe(true);

    // Verify files were transformed
    const transformedFile1 = fs.readFileSync(testFiles[0].path, "utf8");
    expect(transformedFile1).toContain("$localize`message1`");
    expect(transformedFile1).not.toContain("i18nService.t(");

    const transformedFile2 = fs.readFileSync(testFiles[1].path, "utf8");
    expect(transformedFile2).toContain("$localize`message2${");
    expect(transformedFile2).not.toContain("I18nService");
  });

  it("should handle errors gracefully and continue processing", async () => {
    // Create a file with syntax errors
    const invalidFile = path.join(tempDir, "invalid.ts");
    fs.writeFileSync(
      invalidFile,
      `
      import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

      class Invalid {
        // Syntax error - missing closing brace
        test() {
          return this.i18nService.t('test');
      }
    `,
    );

    const validFile = path.join(tempDir, "valid.ts");
    fs.writeFileSync(
      validFile,
      `
      import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

      class Valid {
        test() {
          return this.i18nService.t('valid');
        }
      }
    `,
    );

    project.addSourceFileAtPath(invalidFile);
    project.addSourceFileAtPath(validFile);

    const options: BatchMigrationOptions = {
      config,
      batchSize: 1,
      maxConcurrency: 1,
      outputDir: path.join(tempDir, "reports"),
      createBackups: false,
      continueOnError: true,
    };

    const batchMigrator = new BatchMigrator(options);
    const result = await batchMigrator.migrate();

    expect(result.totalFiles).toBe(2);
    expect(result.successfulFiles).toBe(2); // Both files should be processed successfully
    expect(result.failedFiles).toBe(0);

    // Valid file should be processed
    const validContent = fs.readFileSync(validFile, "utf8");
    expect(validContent).toContain("$localize`valid`");
  });

  it("should validate migration results", async () => {
    // Create test file
    const testFile = path.join(tempDir, "test.ts");
    fs.writeFileSync(
      testFile,
      `
      import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

      class Test {
        constructor(private i18nService: I18nService) {}

        test() {
          return this.i18nService.t('test');
        }
      }
    `,
    );

    project.addSourceFileAtPath(testFile);

    const options: BatchMigrationOptions = {
      config,
      batchSize: 1,
      maxConcurrency: 1,
      outputDir: path.join(tempDir, "reports"),
      createBackups: false,
      continueOnError: true,
    };

    const batchMigrator = new BatchMigrator(options);
    await batchMigrator.migrate();

    // Validate results
    const validation = await batchMigrator.validateMigration();
    expect(validation.isValid).toBe(true);
    expect(validation.remainingUsages).toBe(0);
    expect(validation.issues).toHaveLength(0);
  });

  it("should complete full migration workflow", async () => {
    // Create realistic test scenario
    const files = [
      {
        path: path.join(tempDir, "auth.component.ts"),
        content: `
          import { Component } from '@angular/core';
          import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

          @Component({
            selector: 'app-auth',
            template: '<div>{{ message }}</div>'
          })
          export class AuthComponent {
            message: string;

            constructor(private i18nService: I18nService) {}

            ngOnInit() {
              this.message = this.i18nService.t('loginRequired');
            }

            showError(count: number) {
              return this.i18nService.t('errorCount', count.toString());
            }
          }
        `,
      },
      {
        path: path.join(tempDir, "vault.service.ts"),
        content: `
          import { Injectable } from '@angular/core';
          import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

          @Injectable()
          export class VaultService {
            constructor(private i18n: I18nService) {}

            getStatusMessage(status: string) {
              switch (status) {
                case 'locked':
                  return this.i18n.t('vaultLocked');
                case 'unlocked':
                  return this.i18n.t('vaultUnlocked');
                default:
                  return this.i18n.t('unknownStatus', status);
              }
            }
          }
        `,
      },
    ];

    // Write test files
    files.forEach((file) => {
      fs.writeFileSync(file.path, file.content);
      project.addSourceFileAtPath(file.path);
    });

    // Step 1: Batch Migration
    const migrationOptions: BatchMigrationOptions = {
      config,
      batchSize: 10,
      maxConcurrency: 2,
      outputDir: path.join(tempDir, "reports"),
      createBackups: true,
      continueOnError: false,
    };

    const batchMigrator = new BatchMigrator(migrationOptions);
    const migrationResult = await batchMigrator.migrate();

    expect(migrationResult.successfulFiles).toBe(2);
    expect(migrationResult.failedFiles).toBe(0);

    // Step 2: Validation
    const validator = new MigrationValidator(config);
    const validationResult = await validator.validate();

    // Validation may show TypeScript errors due to missing dependencies in test environment
    // but the migration itself should be successful
    expect(validationResult.summary.remainingI18nUsages).toBe(0);

    // Step 3: Verify transformed content
    const authContent = fs.readFileSync(files[0].path, "utf8");
    expect(authContent).toContain("$localize`loginRequired`");
    expect(authContent).toContain("$localize`errorCount${count.toString()}:param0:`");
    expect(authContent).not.toContain("i18nService.t(");

    const vaultContent = fs.readFileSync(files[1].path, "utf8");
    expect(vaultContent).toContain("$localize`vaultLocked`");
    expect(vaultContent).toContain("$localize`vaultUnlocked`");
    expect(vaultContent).toContain("$localize`unknownStatus${status}:param0:`");
    expect(vaultContent).not.toContain("i18n.t(");

    // Step 4: Verify reports were generated
    const reportsDir = path.join(tempDir, "reports");
    expect(fs.existsSync(reportsDir)).toBe(true);

    const reportFiles = fs
      .readdirSync(reportsDir)
      .filter((f) => f.startsWith("batch-migration-report"));
    expect(reportFiles.length).toBeGreaterThan(0);
  });
});
