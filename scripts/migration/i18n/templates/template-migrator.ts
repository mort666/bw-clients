/* eslint-disable no-console */
import { readFileSync, writeFileSync } from "fs";

import { MigrationConfig, TransformationResult, I18nUsage } from "../shared/types";

import { TemplateTransformer } from "./template-transformer";

/**
 * Main class for template migration from i18n pipes to i18n attributes
 */
export class TemplateMigrator {
  private transformer: TemplateTransformer;

  constructor(private config: MigrationConfig) {
    this.transformer = new TemplateTransformer();
  }

  /**
   * Analyze i18n pipe usage in a template file
   */
  analyzeTemplate(filePath: string): I18nUsage[] {
    try {
      const templateContent = readFileSync(filePath, "utf-8");
      return this.transformer.findI18nPipeUsage(templateContent, filePath);
    } catch (error) {
      if (this.config.verbose) {
        console.error(`Error reading template file ${filePath}:`, error);
      }
      return [];
    }
  }

  /**
   * Migrate a single template file
   */
  async migrateTemplate(filePath: string): Promise<TransformationResult> {
    try {
      const templateContent = readFileSync(filePath, "utf-8");
      const result = this.transformer.transformTemplate(templateContent, filePath);

      if (result.success && result.changes.length > 0) {
        // Get the transformed content by applying all changes
        const transformedContent = this.applyChangesToContent(templateContent, result.changes);

        // Validate the transformation
        if (this.transformer.validateTransformation(templateContent, transformedContent)) {
          if (!this.config.dryRun) {
            writeFileSync(filePath, transformedContent, "utf-8");
          }
        } else {
          result.success = false;
          result.errors.push("Transformation validation failed");
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filePath,
        changes: [],
        errors: [`Error processing template file: ${errorMessage}`],
      };
    }
  }

  /**
   * Migrate multiple template files
   */
  async migrateTemplates(filePaths: string[]): Promise<TransformationResult[]> {
    const results: TransformationResult[] = [];

    for (const filePath of filePaths) {
      if (this.config.verbose) {
        console.log(`Processing template: ${filePath}`);
      }

      const result = await this.migrateTemplate(filePath);
      results.push(result);

      if (!result.success) {
        console.error(`Failed to process ${filePath}:`, result.errors);
      }
    }

    return results;
  }

  /**
   * Generate analysis report for template usage
   */
  generateTemplateAnalysisReport(filePaths: string[]): string {
    const allUsages: I18nUsage[] = [];

    for (const filePath of filePaths) {
      const usages = this.analyzeTemplate(filePath);
      allUsages.push(...usages);
    }

    const fileCount = new Set(allUsages.map((u) => u.filePath)).size;
    const keyCount = new Set(allUsages.map((u) => u.key)).size;

    let report = `# Template i18n Pipe Usage Analysis Report\n\n`;
    report += `## Summary\n`;
    report += `- Total pipe usage count: ${allUsages.length}\n`;
    report += `- Template files affected: ${fileCount}\n`;
    report += `- Unique translation keys: ${keyCount}\n\n`;

    report += `## Usage by File\n`;
    const usagesByFile = allUsages.reduce(
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
        if (usage.context) {
          report += ` - Context: \`${usage.context.trim()}\``;
        }
        report += `\n`;
      });
    });

    report += `\n## Most Common Keys\n`;
    const keyCounts = allUsages.reduce(
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
   * Generate migration statistics
   */
  generateMigrationStats(results: TransformationResult[]): string {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);

    let stats = `# Template Migration Statistics\n\n`;
    stats += `- Templates processed: ${results.length}\n`;
    stats += `- Successful: ${successful}\n`;
    stats += `- Failed: ${failed}\n`;
    stats += `- Total transformations: ${totalChanges}\n\n`;

    if (failed > 0) {
      stats += `## Failed Templates\n`;
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

  /**
   * Apply transformation changes to content
   */
  private applyChangesToContent(content: string, changes: TransformationResult["changes"]): string {
    let transformedContent = content;

    // Sort changes by position (descending) to avoid position shifts
    const sortedChanges = changes.sort((a, b) => {
      if (a.location.line !== b.location.line) {
        return b.location.line - a.location.line;
      }
      return b.location.column - a.location.column;
    });

    for (const change of sortedChanges) {
      if (change.type === "replace" && change.original && change.replacement) {
        transformedContent = transformedContent.replace(change.original, change.replacement);
      }
    }

    return transformedContent;
  }
}
