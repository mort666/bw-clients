#!/usr/bin/env node
/* eslint-disable no-console */

import * as fs from "fs";
import * as path from "path";

import * as chalk from "chalk";
import { Command } from "commander";

import { MigrationConfig } from "../shared/types";

import { TypeScriptMigrator } from "./typescript-migrator";

const program = new Command();

program
  .name("i18n-typescript-migrator")
  .description("CLI tool for migrating TypeScript code from I18nService to $localize")
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze current I18nService usage patterns")
  .option("-c, --config <path>", "Path to tsconfig.json", "./tsconfig.json")
  .option("-o, --output <path>", "Output file for analysis report")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: path.resolve(options.config),
        dryRun: true,
        verbose: options.verbose || false,
      };

      console.log(chalk.blue("🔍 Analyzing I18nService usage..."));

      const migrator = new TypeScriptMigrator(config);
      const report = migrator.generateAnalysisReport();

      if (options.output) {
        fs.writeFileSync(options.output, report);
        console.log(chalk.green(`✅ Analysis report saved to: ${options.output}`));
      } else {
        console.log(report);
      }
    } catch (error) {
      console.error(chalk.red("❌ Analysis failed:"), error);
      process.exit(1);
    }
  });

program
  .command("migrate")
  .description("Migrate TypeScript files from I18nService to $localize")
  .option("-c, --config <path>", "Path to tsconfig.json", "./tsconfig.json")
  .option("-f, --file <path>", "Migrate specific file only")
  .option("-d, --dry-run", "Preview changes without applying them")
  .option("-o, --output <path>", "Output directory for migration reports")
  .option("-t, --translations <path>", "Path to combined translations file")
  .option("-v, --verbose", "Enable verbose logging")
  .option("--backup", "Create backup files before migration")
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: path.resolve(options.config),
        dryRun: options.dryRun || false,
        verbose: options.verbose || false,
      };

      const migrator = new TypeScriptMigrator(config, options.translations);

      if (options.backup && !options.dryRun) {
        console.log(chalk.yellow("📦 Creating backups..."));
        await createBackups(migrator, options.output || "./migration-reports");
      }

      console.log(chalk.blue("🚀 Starting TypeScript migration..."));

      let results;
      if (options.file) {
        console.log(chalk.blue(`📄 Migrating file: ${options.file}`));
        const result = await migrator.migrateFile(path.resolve(options.file));
        results = [result];
      } else {
        results = await migrator.migrateAll();
      }

      const stats = migrator.generateMigrationStats(results);
      console.log(stats);

      // Save detailed report
      if (options.output) {
        const reportDir = options.output;
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const reportPath = path.join(reportDir, `migration-report-${timestamp}.md`);

        let detailedReport = stats + "\n\n## Detailed Changes\n\n";
        results.forEach((result) => {
          detailedReport += `### ${result.filePath}\n`;
          if (result.success) {
            result.changes.forEach((change) => {
              detailedReport += `- ${change.description}\n`;
              if (change.original) {
                detailedReport += `  - **Before:** \`${change.original}\`\n`;
              }
              if (change.replacement) {
                detailedReport += `  - **After:** \`${change.replacement}\`\n`;
              }
            });
          } else {
            detailedReport += "**Errors:**\n";
            result.errors.forEach((error) => {
              detailedReport += `- ${error}\n`;
            });
          }
          detailedReport += "\n";
        });

        fs.writeFileSync(reportPath, detailedReport);
        console.log(chalk.green(`📊 Detailed report saved to: ${reportPath}`));
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed === 0) {
        console.log(
          chalk.green(`✅ Migration completed successfully! ${successful} files processed.`),
        );
      } else {
        console.log(
          chalk.yellow(
            `⚠️  Migration completed with warnings. ${successful} successful, ${failed} failed.`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("❌ Migration failed:"), error);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate migration results and check for issues")
  .option("-c, --config <path>", "Path to tsconfig.json", "./tsconfig.json")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: path.resolve(options.config),
        dryRun: true,
        verbose: options.verbose || false,
      };

      console.log(chalk.blue("🔍 Validating migration results..."));

      const migrator = new TypeScriptMigrator(config);
      const usages = migrator.analyzeUsage();

      if (usages.length === 0) {
        console.log(chalk.green("✅ No remaining I18nService usage found!"));
      } else {
        console.log(chalk.yellow(`⚠️  Found ${usages.length} remaining I18nService usages:`));
        usages.forEach((usage) => {
          console.log(`  - ${usage.filePath}:${usage.line} - "${usage.key}"`);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("❌ Validation failed:"), error);
      process.exit(1);
    }
  });

program
  .command("rollback")
  .description("Rollback migration using backup files")
  .option("-b, --backup-dir <path>", "Path to backup directory", "./migration-reports/backups")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔄 Rolling back migration..."));

      const backupDir = options.backupDir;
      if (!fs.existsSync(backupDir)) {
        console.error(chalk.red(`❌ Backup directory not found: ${backupDir}`));
        process.exit(1);
      }

      // Check for path mapping file
      const mappingPath = path.join(backupDir, "path-mapping.json");
      if (!fs.existsSync(mappingPath)) {
        console.error(chalk.red("❌ Path mapping file not found. Cannot restore files safely."));
        console.log(
          chalk.gray("This backup was created with an older version that doesn't preserve paths."),
        );
        process.exit(1);
      }

      const pathMapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
      const backupFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith(".backup"));

      if (backupFiles.length === 0) {
        console.error(chalk.red("❌ No backup files found"));
        process.exit(1);
      }

      let restoredCount = 0;
      for (const backupFile of backupFiles) {
        const backupPath = path.join(backupDir, backupFile);
        const originalPath = pathMapping[backupFile];

        if (!originalPath) {
          console.warn(chalk.yellow(`⚠️  No mapping found for backup file: ${backupFile}`));
          continue;
        }

        // Ensure the directory exists
        const originalDir = path.dirname(originalPath);
        if (!fs.existsSync(originalDir)) {
          fs.mkdirSync(originalDir, { recursive: true });
        }

        fs.copyFileSync(backupPath, originalPath);
        restoredCount++;

        if (options.verbose) {
          console.log(chalk.gray(`Restored: ${originalPath}`));
        }
      }

      console.log(chalk.green(`✅ Rollback completed! ${restoredCount} files restored.`));
    } catch (error) {
      console.error(chalk.red("❌ Rollback failed:"), error);
      process.exit(1);
    }
  });

async function createBackups(migrator: TypeScriptMigrator, outputDir: string): Promise<void> {
  const backupDir = path.join(outputDir, "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get all files that would be affected
  const usages = migrator.analyzeUsage();
  const filesToBackup = new Set(usages.map((u) => u.filePath));

  // Create a mapping file to track original paths
  const pathMapping: Record<string, string> = {};

  for (const filePath of filesToBackup) {
    if (fs.existsSync(filePath)) {
      // Create a unique backup filename that preserves path info
      const relativePath = path.relative(process.cwd(), filePath);
      const backupFileName = relativePath.replace(/[/\\]/g, "_") + ".backup";
      const backupPath = path.join(backupDir, backupFileName);

      fs.copyFileSync(filePath, backupPath);
      pathMapping[backupFileName] = filePath;
    }
  }

  // Save the path mapping for restoration
  const mappingPath = path.join(backupDir, "path-mapping.json");
  fs.writeFileSync(mappingPath, JSON.stringify(pathMapping, null, 2));

  console.log(chalk.green(`📦 Created backups for ${filesToBackup.size} files`));
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ Uncaught Exception:"), error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ Unhandled Rejection at:"), promise, "reason:", reason);
  process.exit(1);
});

program.parse();
