/* eslint-disable no-console */
import { MigrationConfig, TransformationResult, I18nUsage } from "../shared/types";

import { ASTTransformer } from "./ast-transformer";
import { ProjectParser } from "./project-parser";

/**
 * Main class for TypeScript code migration from I18nService to $localize
 */
export class TypeScriptMigrator {
  private parser: ProjectParser;
  private transformer: ASTTransformer;

  constructor(
    private config: MigrationConfig,
    private translationsPath?: string,
  ) {
    this.parser = new ProjectParser(config);
    this.transformer = new ASTTransformer();
  }

  /**
   * Analyze current I18nService usage across the project
   */
  analyzeUsage(): I18nUsage[] {
    const sourceFiles = this.parser.findI18nServiceImports();
    const allUsages: I18nUsage[] = [];

    sourceFiles.forEach((sourceFile) => {
      const usages = this.transformer.findI18nServiceCalls(sourceFile);
      allUsages.push(...usages);
    });

    return allUsages;
  }

  /**
   * Generate analysis report of current usage patterns
   */
  generateAnalysisReport(): string {
    const usages = this.analyzeUsage();
    const fileCount = new Set(usages.map((u) => u.filePath)).size;
    const keyCount = new Set(usages.map((u) => u.key)).size;

    let report = `# I18nService Usage Analysis Report\n\n`;
    report += `## Summary\n`;
    report += `- Total usage count: ${usages.length}\n`;
    report += `- Files affected: ${fileCount}\n`;
    report += `- Unique translation keys: ${keyCount}\n\n`;

    report += `## Usage by File\n`;
    const usagesByFile = usages.reduce(
      (acc, usage) => {
        if (!acc[usage.filePath]) {
          acc[usage.filePath] = [];
        }
        acc[usage.filePath].push(usage);
        return acc;
      },
      {} as Record<string, I18nUsage[]>,
    );

    Object.entries(usagesByFile).forEach(([filePath, fileUsages]) => {
      report += `\n### ${filePath}\n`;
      fileUsages.forEach((usage) => {
        report += `- Line ${usage.line}: \`${usage.key}\``;
        if (usage.parameters) {
          report += ` (with parameters: ${usage.parameters.join(", ")})`;
        }
        report += `\n`;
      });
    });

    report += `\n## Most Common Keys\n`;
    const keyCounts = usages.reduce(
      (acc, usage) => {
        acc[usage.key] = (acc[usage.key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(keyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        report += `- \`${key}\`: ${count} usage(s)\n`;
      });

    return report;
  }

  /**
   * Migrate all TypeScript files in the project
   */
  async migrateAll(): Promise<TransformationResult[]> {
    await this.transformer.initialize(this.translationsPath);

    const sourceFiles = this.parser.findI18nServiceImports();
    const results: TransformationResult[] = [];

    if (this.config.verbose) {
      console.log(`Found ${sourceFiles.length} files with I18nService imports`);
    }

    for (const sourceFile of sourceFiles) {
      if (this.config.verbose) {
        console.log(`Processing: ${sourceFile.getFilePath()}`);
      }

      const result = this.transformer.transformI18nServiceCalls(sourceFile);
      results.push(result);

      if (!result.success) {
        console.error(`Failed to process ${result.filePath}:`, result.errors);
      }
    }

    // Save changes if not in dry run mode
    if (!this.config.dryRun) {
      await this.parser.saveChanges();
    }

    return results;
  }

  /**
   * Migrate a specific file
   */
  async migrateFile(filePath: string): Promise<TransformationResult> {
    await this.transformer.initialize(this.translationsPath);

    const sourceFile = this.parser.getSourceFile(filePath);

    if (!sourceFile) {
      return {
        success: false,
        filePath,
        changes: [],
        errors: [`File not found: ${filePath}`],
      };
    }

    const result = this.transformer.transformI18nServiceCalls(sourceFile);

    if (!this.config.dryRun && result.success) {
      await this.parser.saveChanges();
    }

    return result;
  }

  /**
   * Generate migration statistics
   */
  generateMigrationStats(results: TransformationResult[]): string {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);

    let stats = `# Migration Statistics\n\n`;
    stats += `- Files processed: ${results.length}\n`;
    stats += `- Successful: ${successful}\n`;
    stats += `- Failed: ${failed}\n`;
    stats += `- Total changes: ${totalChanges}\n\n`;

    if (failed > 0) {
      stats += `## Failed Files\n`;
      results
        .filter((r) => !r.success)
        .forEach((result) => {
          stats += `- ${result.filePath}\n`;
          result.errors.forEach((error) => {
            stats += `  - ${error}\n`;
          });
        });
    }

    return stats;
  }
}
