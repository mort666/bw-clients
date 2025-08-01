/* eslint-disable no-console */
import * as fs from "fs";
import * as path from "path";

import * as chalk from "chalk";

import { MigrationConfig, TransformationResult } from "../shared/types";

import { TypeScriptMigrator } from "./typescript-migrator";

export interface BatchMigrationOptions {
  config: MigrationConfig;
  batchSize: number;
  maxConcurrency: number;
  outputDir: string;
  createBackups: boolean;
  continueOnError: boolean;
}

export interface BatchMigrationResult {
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  skippedFiles: number;
  results: TransformationResult[];
  duration: number;
}

/**
 * Handles batch migration of TypeScript files with progress tracking and error recovery
 */
export class BatchMigrator {
  private migrator: TypeScriptMigrator;

  constructor(private options: BatchMigrationOptions) {
    this.migrator = new TypeScriptMigrator(options.config);
  }

  /**
   * Execute batch migration with progress tracking
   */
  async migrate(): Promise<BatchMigrationResult> {
    const startTime = Date.now();

    console.log(chalk.blue("🔍 Analyzing files to migrate..."));
    const usages = this.migrator.analyzeUsage();
    const filesToMigrate = Array.from(new Set(usages.map((u) => u.filePath)));

    console.log(chalk.blue(`📊 Found ${filesToMigrate.length} files to migrate`));

    if (this.options.createBackups && !this.options.config.dryRun) {
      await this.createBackups(filesToMigrate);
    }

    const results: TransformationResult[] = [];
    let processedFiles = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    const skippedFiles = 0;

    // Process files in batches
    for (let i = 0; i < filesToMigrate.length; i += this.options.batchSize) {
      const batch = filesToMigrate.slice(i, i + this.options.batchSize);

      console.log(
        chalk.blue(
          `📦 Processing batch ${Math.floor(i / this.options.batchSize) + 1}/${Math.ceil(filesToMigrate.length / this.options.batchSize)} (${batch.length} files)`,
        ),
      );

      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);

      // Update counters
      for (const result of batchResults) {
        processedFiles++;
        if (result.success) {
          successfulFiles++;
        } else {
          failedFiles++;
          if (!this.options.continueOnError) {
            console.error(
              chalk.red(`❌ Migration failed for ${result.filePath}, stopping batch migration`),
            );
            break;
          }
        }
      }

      // Progress update
      const progress = Math.round((processedFiles / filesToMigrate.length) * 100);
      console.log(
        chalk.gray(`Progress: ${progress}% (${processedFiles}/${filesToMigrate.length})`),
      );
    }

    const duration = Date.now() - startTime;

    // Save changes if not in dry run mode
    if (!this.options.config.dryRun) {
      console.log(chalk.blue("💾 Saving changes..."));
      await this.migrator["parser"].saveChanges();
    }

    // Generate comprehensive report
    await this.generateBatchReport(results, duration);

    return {
      totalFiles: filesToMigrate.length,
      processedFiles,
      successfulFiles,
      failedFiles,
      skippedFiles,
      results,
      duration,
    };
  }

  /**
   * Process a batch of files with controlled concurrency
   */
  private async processBatch(filePaths: string[]): Promise<TransformationResult[]> {
    const results: TransformationResult[] = [];

    // Process files with limited concurrency
    for (let i = 0; i < filePaths.length; i += this.options.maxConcurrency) {
      const concurrentBatch = filePaths.slice(i, i + this.options.maxConcurrency);

      const promises = concurrentBatch.map(async (filePath) => {
        try {
          if (this.options.config.verbose) {
            console.log(chalk.gray(`  Processing: ${path.relative(process.cwd(), filePath)}`));
          }

          return await this.migrator.migrateFile(filePath);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            filePath,
            changes: [],
            errors: [`Batch processing error: ${errorMessage}`],
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Create backup files before migration
   */
  private async createBackups(filePaths: string[]): Promise<void> {
    const backupDir = path.join(this.options.outputDir, "backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(chalk.yellow("📦 Creating backups..."));

    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupPath = path.join(backupDir, relativePath.replace(/[/\\]/g, "_") + ".backup");

        // Ensure backup directory exists
        const backupFileDir = path.dirname(backupPath);
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }

        fs.copyFileSync(filePath, backupPath);
      }
    }

    console.log(chalk.green(`📦 Created backups for ${filePaths.length} files in ${backupDir}`));
  }

  /**
   * Generate comprehensive batch migration report
   */
  private async generateBatchReport(
    results: TransformationResult[],
    duration: number,
  ): Promise<void> {
    const reportDir = this.options.outputDir;
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(reportDir, `batch-migration-report-${timestamp}.md`);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);

    let report = `# Batch TypeScript Migration Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Duration:** ${Math.round(duration / 1000)}s\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total files:** ${results.length}\n`;
    report += `- **Successful:** ${successful}\n`;
    report += `- **Failed:** ${failed}\n`;
    report += `- **Total changes:** ${totalChanges}\n`;
    report += `- **Success rate:** ${Math.round((successful / results.length) * 100)}%\n\n`;

    // Performance metrics
    const avgTimePerFile = duration / results.length;
    report += `## Performance Metrics\n\n`;
    report += `- **Average time per file:** ${Math.round(avgTimePerFile)}ms\n`;
    report += `- **Files per second:** ${Math.round(1000 / avgTimePerFile)}\n\n`;

    // Change statistics
    const changeTypes = results.reduce(
      (acc, result) => {
        result.changes.forEach((change) => {
          acc[change.type] = (acc[change.type] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    if (Object.keys(changeTypes).length > 0) {
      report += `## Change Types\n\n`;
      Object.entries(changeTypes).forEach(([type, count]) => {
        report += `- **${type}:** ${count}\n`;
      });
      report += `\n`;
    }

    // Failed files section
    if (failed > 0) {
      report += `## Failed Files\n\n`;
      results
        .filter((r) => !r.success)
        .forEach((result) => {
          report += `### ${result.filePath}\n\n`;
          result.errors.forEach((error) => {
            report += `- ${error}\n`;
          });
          report += `\n`;
        });
    }

    // Successful files with changes
    const successfulWithChanges = results.filter((r) => r.success && r.changes.length > 0);
    if (successfulWithChanges.length > 0) {
      report += `## Successful Migrations\n\n`;
      successfulWithChanges.forEach((result) => {
        report += `### ${result.filePath}\n\n`;
        result.changes.forEach((change) => {
          report += `- **${change.type}** (Line ${change.location.line}): ${change.description}\n`;
          if (change.original && change.replacement) {
            report += `  - Before: \`${change.original}\`\n`;
            report += `  - After: \`${change.replacement}\`\n`;
          }
        });
        report += `\n`;
      });
    }

    fs.writeFileSync(reportPath, report);
    console.log(chalk.green(`📊 Batch migration report saved to: ${reportPath}`));
  }

  /**
   * Validate batch migration results
   */
  async validateMigration(): Promise<{
    isValid: boolean;
    remainingUsages: number;
    issues: string[];
  }> {
    console.log(chalk.blue("🔍 Validating batch migration results..."));

    const issues: string[] = [];
    const usages = this.migrator.analyzeUsage();

    if (usages.length > 0) {
      issues.push(`Found ${usages.length} remaining I18nService usages`);
      usages.forEach((usage) => {
        issues.push(`  - ${usage.filePath}:${usage.line} - "${usage.key}"`);
      });
    }

    // Additional validation checks could be added here
    // - Check for compilation errors
    // - Check for missing $localize imports
    // - Check for malformed $localize calls

    return {
      isValid: issues.length === 0,
      remainingUsages: usages.length,
      issues,
    };
  }
}
