#!/usr/bin/env node
/* eslint-disable no-console */

import * as fs from "fs";
import * as path from "path";

import * as chalk from "chalk";
import { Command } from "commander";

import { MigrationConfig } from "../shared/types";

import { TemplateMigrator } from "./template-migrator";

/**
 * Find template files matching a pattern
 */
function findTemplateFiles(pattern: string, rootDir: string = process.cwd()): string[] {
  const files: string[] = [];

  // Handle specific directory patterns like "templates/sample-templates/*.html"
  if (pattern.includes("/") && pattern.includes("*")) {
    const parts = pattern.split("/");
    const dirParts = parts.slice(0, -1);
    const filePart = parts[parts.length - 1];

    const targetDir = path.join(rootDir, ...dirParts);

    if (fs.existsSync(targetDir)) {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          if (filePart === "*.html" && entry.name.endsWith(".html")) {
            files.push(path.join(targetDir, entry.name));
          } else if (filePart.includes("*")) {
            const regex = new RegExp(filePart.replace(/\*/g, ".*"));
            if (regex.test(entry.name)) {
              files.push(path.join(targetDir, entry.name));
            }
          }
        }
      }
    }

    return files;
  }

  // Default recursive search
  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories that shouldn't contain templates
        if (!["node_modules", "dist", "coverage", ".git", ".angular"].includes(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        // Simple pattern matching - for now just check if it ends with .html
        if (pattern === "**/*.html" && entry.name.endsWith(".html")) {
          files.push(fullPath);
        } else if (pattern.includes("*")) {
          const regex = new RegExp(pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"));
          if (regex.test(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  walkDir(rootDir);
  return files;
}

const program = new Command();

program
  .name("i18n-template-migrator")
  .description("CLI tool for migrating Angular templates from i18n pipes to i18n attributes")
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze current i18n pipe usage in templates")
  .option("-p, --pattern <pattern>", "Glob pattern for template files", "**/*.html")
  .option("-o, --output <path>", "Output file for analysis report")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: "./tsconfig.json",
        dryRun: true,
        verbose: options.verbose || false,
      };

      console.log(chalk.blue("🔍 Analyzing i18n pipe usage in templates..."));

      const migrator = new TemplateMigrator(config);
      const templateFiles = findTemplateFiles(options.pattern);

      if (templateFiles.length === 0) {
        console.log(chalk.yellow("⚠️  No template files found matching pattern"));
        return;
      }

      console.log(chalk.gray(`Found ${templateFiles.length} template files`));

      const report = migrator.generateTemplateAnalysisReport(templateFiles);

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
  .description("Migrate template files from i18n pipes to i18n attributes")
  .option("-p, --pattern <pattern>", "Glob pattern for template files", "**/*.html")
  .option("-f, --file <path>", "Migrate specific file only")
  .option("-d, --dry-run", "Preview changes without applying them")
  .option("-o, --output <path>", "Output directory for migration reports")
  .option("-v, --verbose", "Enable verbose logging")
  .option("--backup", "Create backup files before migration")
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: "./tsconfig.json",
        dryRun: options.dryRun || false,
        verbose: options.verbose || false,
      };

      const migrator = new TemplateMigrator(config);

      let templateFiles: string[];
      if (options.file) {
        templateFiles = [path.resolve(options.file)];
        console.log(chalk.blue(`📄 Migrating file: ${options.file}`));
      } else {
        templateFiles = findTemplateFiles(options.pattern);
        console.log(
          chalk.blue(`🚀 Starting template migration for ${templateFiles.length} files...`),
        );
      }

      if (templateFiles.length === 0) {
        console.log(chalk.yellow("⚠️  No template files found matching pattern"));
        return;
      }

      if (options.backup && !options.dryRun) {
        console.log(chalk.yellow("📦 Creating backups..."));
        await createBackups(templateFiles, options.output || "./migration-reports");
      }

      const results = await migrator.migrateTemplates(templateFiles);
      const stats = migrator.generateMigrationStats(results);
      console.log(stats);

      // Save detailed report
      if (options.output) {
        const reportDir = options.output;
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const reportPath = path.join(reportDir, `template-migration-report-${timestamp}.md`);

        let detailedReport = stats + "\n\n## Detailed Changes\n\n";
        results.forEach((result) => {
          detailedReport += `### ${result.filePath}\n`;
          if (result.success) {
            if (result.changes.length > 0) {
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
              detailedReport += "No changes needed\n";
            }
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
      const withChanges = results.filter((r) => r.success && r.changes.length > 0).length;

      if (failed === 0) {
        console.log(
          chalk.green(
            `✅ Migration completed successfully! ${successful} files processed, ${withChanges} files modified.`,
          ),
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
  .description("Validate migration results and check for remaining i18n pipes")
  .option("-p, --pattern <pattern>", "Glob pattern for template files", "**/*.html")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: "./tsconfig.json",
        dryRun: true,
        verbose: options.verbose || false,
      };

      console.log(chalk.blue("🔍 Validating migration results..."));

      const migrator = new TemplateMigrator(config);
      const templateFiles = findTemplateFiles(options.pattern);

      if (templateFiles.length === 0) {
        console.log(chalk.yellow("⚠️  No template files found matching pattern"));
        return;
      }

      let totalUsages = 0;
      const filesWithUsages: string[] = [];

      for (const filePath of templateFiles) {
        const usages = migrator.analyzeTemplate(filePath);
        if (usages.length > 0) {
          totalUsages += usages.length;
          filesWithUsages.push(filePath);

          if (options.verbose) {
            console.log(chalk.yellow(`  ${filePath}: ${usages.length} remaining usages`));
            usages.forEach((usage) => {
              console.log(chalk.gray(`    Line ${usage.line}: ${usage.key}`));
            });
          }
        }
      }

      if (totalUsages === 0) {
        console.log(chalk.green("✅ No remaining i18n pipe usage found!"));
      } else {
        console.log(
          chalk.yellow(
            `⚠️  Found ${totalUsages} remaining i18n pipe usages in ${filesWithUsages.length} files`,
          ),
        );
        if (!options.verbose) {
          console.log(chalk.gray("Use --verbose to see detailed usage information"));
        }
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
      console.log(chalk.blue("🔄 Rolling back template migration..."));

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

program
  .command("compare")
  .description("Generate before/after comparison reports")
  .option("-f, --file <path>", "Template file to compare")
  .option("-o, --output <path>", "Output file for comparison report")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      if (!options.file) {
        console.error(chalk.red("❌ File path is required for comparison"));
        process.exit(1);
      }

      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`❌ File not found: ${filePath}`));
        process.exit(1);
      }

      const config: MigrationConfig = {
        sourceRoot: process.cwd(),
        tsConfigPath: "./tsconfig.json",
        dryRun: true,
        verbose: options.verbose || false,
      };

      console.log(chalk.blue(`🔍 Generating comparison for: ${options.file}`));

      const migrator = new TemplateMigrator(config);
      const originalContent = fs.readFileSync(filePath, "utf-8");
      const result = await migrator.migrateTemplate(filePath);

      if (!result.success) {
        console.error(chalk.red("❌ Migration failed:"), result.errors);
        process.exit(1);
      }

      // Apply changes to get transformed content
      let transformedContent = originalContent;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      let report = `# Template Migration Comparison\n\n`;
      report += `**File:** ${filePath}\n`;
      report += `**Changes:** ${result.changes.length}\n\n`;

      report += `## Before\n\`\`\`html\n${originalContent}\n\`\`\`\n\n`;
      report += `## After\n\`\`\`html\n${transformedContent}\n\`\`\`\n\n`;

      if (result.changes.length > 0) {
        report += `## Changes\n`;
        result.changes.forEach((change, index) => {
          report += `### Change ${index + 1}\n`;
          report += `**Description:** ${change.description}\n`;
          if (change.original) {
            report += `**Before:** \`${change.original}\`\n`;
          }
          if (change.replacement) {
            report += `**After:** \`${change.replacement}\`\n`;
          }
          report += `\n`;
        });
      }

      if (options.output) {
        fs.writeFileSync(options.output, report);
        console.log(chalk.green(`✅ Comparison report saved to: ${options.output}`));
      } else {
        console.log(report);
      }
    } catch (error) {
      console.error(chalk.red("❌ Comparison failed:"), error);
      process.exit(1);
    }
  });

async function createBackups(templateFiles: string[], outputDir: string): Promise<void> {
  const backupDir = path.join(outputDir, "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create a mapping file to track original paths
  const pathMapping: Record<string, string> = {};

  for (const filePath of templateFiles) {
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

  console.log(chalk.green(`📦 Created backups for ${templateFiles.length} files`));
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
