#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Sample test script to demonstrate the TypeScript migration CLI tool
 * This script creates sample files and runs the migration tool on them
 */

import * as fs from "fs";
import * as path from "path";

import chalk from "chalk";

import { MigrationConfig } from "../shared/types";

import { BatchMigrator, BatchMigrationOptions } from "./batch-migrator";
import { MigrationValidator } from "./migration-validator";
import { TypeScriptMigrator } from "./typescript-migrator";

async function runSampleTest() {
  console.log(chalk.blue("🧪 Running TypeScript Migration CLI Sample Test"));
  console.log(chalk.blue("=".repeat(60)));

  // Create temporary test directory
  const testDir = path.join(__dirname, "sample-test-" + Date.now());
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // Create sample TypeScript files
    await createSampleFiles(testDir);

    // Create tsconfig.json
    const tsConfigPath = path.join(testDir, "tsconfig.json");
    fs.writeFileSync(
      tsConfigPath,
      JSON.stringify(
        {
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
        },
        null,
        2,
      ),
    );

    const config: MigrationConfig = {
      sourceRoot: testDir,
      tsConfigPath,
      dryRun: false,
      verbose: true,
    };

    // Step 1: Analysis
    console.log(chalk.yellow("\n📊 Step 1: Analyzing I18nService usage"));
    const migrator = new TypeScriptMigrator(config);
    const analysisReport = migrator.generateAnalysisReport();
    console.log(analysisReport);

    // Step 2: Batch Migration
    console.log(chalk.yellow("\n🚀 Step 2: Running batch migration"));
    const batchOptions: BatchMigrationOptions = {
      config,
      batchSize: 3,
      maxConcurrency: 2,
      outputDir: path.join(testDir, "reports"),
      createBackups: true,
      continueOnError: true,
    };

    const batchMigrator = new BatchMigrator(batchOptions);
    const migrationResult = await batchMigrator.migrate();

    console.log(chalk.green(`✅ Migration completed:`));
    console.log(`  - Total files: ${migrationResult.totalFiles}`);
    console.log(`  - Successful: ${migrationResult.successfulFiles}`);
    console.log(`  - Failed: ${migrationResult.failedFiles}`);
    console.log(`  - Duration: ${Math.round(migrationResult.duration / 1000)}s`);

    // Step 3: Validation
    console.log(chalk.yellow("\n🔍 Step 3: Validating migration results"));
    const validator = new MigrationValidator(config);
    const validationResult = await validator.validate();

    console.log(chalk.green(`📋 Validation results:`));
    console.log(`  - Valid: ${validationResult.isValid ? "✅ YES" : "❌ NO"}`);
    console.log(`  - Errors: ${validationResult.summary.errors}`);
    console.log(`  - Warnings: ${validationResult.summary.warnings}`);
    console.log(`  - Remaining I18n usages: ${validationResult.summary.remainingI18nUsages}`);

    if (!validationResult.isValid) {
      console.log(chalk.red("\n❌ Validation issues found:"));
      validationResult.issues.forEach((issue) => {
        const icon = issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️";
        console.log(
          `  ${icon} ${path.relative(testDir, issue.filePath)}:${issue.line} - ${issue.message}`,
        );
      });
    }

    // Step 4: Show transformed files
    console.log(chalk.yellow("\n📄 Step 4: Showing transformed files"));
    await showTransformedFiles(testDir);

    console.log(chalk.green("\n🎉 Sample test completed successfully!"));
    console.log(chalk.blue(`📁 Test files created in: ${testDir}`));
    console.log(chalk.blue(`📊 Reports available in: ${path.join(testDir, "reports")}`));
  } catch (error) {
    console.error(chalk.red("❌ Sample test failed:"), error);
    process.exit(1);
  }
}

async function createSampleFiles(testDir: string) {
  const sampleFiles = [
    {
      name: "auth.component.ts",
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

  getWelcomeMessage(name: string) {
    return this.i18nService.t('welcomeMessage', name);
  }
}
      `.trim(),
    },
    {
      name: "vault.service.ts",
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

  getItemCountMessage(count: number) {
    if (count === 0) {
      return this.i18n.t('noItems');
    } else if (count === 1) {
      return this.i18n.t('oneItem');
    } else {
      return this.i18n.t('multipleItems', count.toString());
    }
  }
}
      `.trim(),
    },
    {
      name: "settings.component.ts",
      content: `
import { Component } from '@angular/core';
import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
  constructor(private i18nService: I18nService) {}

  getTitle() {
    return this.i18nService.t('settings');
  }

  getSaveMessage() {
    return this.i18nService.t('settingsSaved');
  }

  getConfirmationMessage(action: string) {
    return this.i18nService.t('confirmAction', action);
  }
}
      `.trim(),
    },
    {
      name: "utils.ts",
      content: `
import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

export class Utils {
  static formatMessage(i18nService: I18nService, key: string, ...params: string[]) {
    if (params.length === 0) {
      return i18nService.t(key);
    } else if (params.length === 1) {
      return i18nService.t(key, params[0]);
    } else {
      // This is a complex case that might need manual review
      return i18nService.t(key, ...params);
    }
  }

  static getErrorMessage(i18nService: I18nService, errorCode: number) {
    return i18nService.t('error.' + errorCode.toString());
  }
}
      `.trim(),
    },
    {
      name: "no-i18n.component.ts",
      content: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-no-i18n',
  template: '<div>No i18n usage here</div>'
})
export class NoI18nComponent {
  message = 'This file has no I18nService usage';

  constructor() {}

  getMessage() {
    return this.message;
  }
}
      `.trim(),
    },
  ];

  console.log(chalk.blue("📝 Creating sample files..."));

  for (const file of sampleFiles) {
    const filePath = path.join(testDir, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(chalk.gray(`  Created: ${file.name}`));
  }
}

async function showTransformedFiles(testDir: string) {
  const files = fs.readdirSync(testDir).filter((f) => f.endsWith(".ts") && f !== "sample-test.ts");

  for (const file of files.slice(0, 2)) {
    // Show first 2 files to avoid too much output
    const filePath = path.join(testDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    console.log(chalk.cyan(`\n📄 ${file}:`));
    console.log(chalk.gray("─".repeat(40)));

    // Show only the relevant parts
    const lines = content.split("\n");
    const relevantLines = lines.filter(
      (line) =>
        line.includes("$localize") || line.includes("i18nService") || line.includes("import"),
    );

    relevantLines.forEach((line) => {
      if (line.includes("$localize")) {
        console.log(chalk.green(line.trim()));
      } else if (line.includes("i18nService.t(")) {
        console.log(chalk.red(line.trim()));
      } else {
        console.log(chalk.gray(line.trim()));
      }
    });
  }
}

// Run the sample test if this file is executed directly
if (require.main === module) {
  runSampleTest().catch((error) => {
    console.error("❌ Sample test failed:", error);
    process.exit(1);
  });
}

export { runSampleTest };
