/* eslint-disable no-console */
import * as fs from "fs";
import * as path from "path";

/**
 * Interface for a translation entry
 */
export interface TranslationEntry {
  message: string;
  description?: string;
  placeholders?: Record<string, any>;
}

/**
 * Interface for combined translations
 */
export interface CombinedTranslations {
  [key: string]: TranslationEntry;
}

/**
 * Interface for translation source information
 */
export interface TranslationSource {
  app: string;
  filePath: string;
  keyCount: number;
}

/**
 * Result of combining translations
 */
export interface CombineResult {
  translations: CombinedTranslations;
  sources: TranslationSource[];
  conflicts: Array<{
    key: string;
    sources: string[];
    values: string[];
  }>;
  totalKeys: number;
}

/**
 * Service for combining translation files from multiple applications
 */
export class TranslationCombiner {
  private readonly appPaths = [
    "apps/browser/src/_locales/en/messages.json",
    "apps/desktop/src/locales/en/messages.json",
    "apps/web/src/locales/en/messages.json",
    "apps/cli/src/locales/en/messages.json",
  ];

  constructor(private rootPath: string = process.cwd()) {
    // If we're in the migration directory, go up to the project root
    if (this.rootPath.endsWith("scripts/migration/i18n")) {
      this.rootPath = path.join(this.rootPath, "../../..");
    }
  }

  /**
   * Combine all English translation files into a single lookup
   */
  combineTranslations(): CombineResult {
    const combined: CombinedTranslations = {};
    const sources: TranslationSource[] = [];
    const conflicts: Array<{
      key: string;
      sources: string[];
      values: string[];
    }> = [];

    for (const appPath of this.appPaths) {
      const fullPath = path.join(this.rootPath, appPath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`Translation file not found: ${fullPath}`);
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const translations = JSON.parse(content) as Record<string, TranslationEntry>;
        const appName = this.extractAppName(appPath);

        let keyCount = 0;

        for (const [key, entry] of Object.entries(translations)) {
          keyCount++;

          if (combined[key]) {
            // Handle conflicts
            const existingMessage = combined[key].message;
            const newMessage = entry.message;

            if (existingMessage !== newMessage) {
              const existingConflict = conflicts.find((c) => c.key === key);
              if (existingConflict) {
                if (!existingConflict.sources.includes(appName)) {
                  existingConflict.sources.push(appName);
                  existingConflict.values.push(newMessage);
                }
              } else {
                conflicts.push({
                  key,
                  sources: [this.findSourceForKey(key, sources), appName],
                  values: [existingMessage, newMessage],
                });
              }
            }

            // Keep the first occurrence (or could implement priority logic)
            continue;
          }

          combined[key] = entry;
        }

        sources.push({
          app: appName,
          filePath: fullPath,
          keyCount,
        });
      } catch (error) {
        console.error(`Error reading translation file ${fullPath}:`, error);
      }
    }

    return {
      translations: combined,
      sources,
      conflicts,
      totalKeys: Object.keys(combined).length,
    };
  }

  /**
   * Save combined translations to a file
   */
  saveCombinedTranslations(result: CombineResult, outputPath: string): void {
    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        sources: result.sources,
        totalKeys: result.totalKeys,
        conflictCount: result.conflicts.length,
      },
      translations: result.translations,
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  }

  /**
   * Generate a report of the combination process
   */
  generateCombinationReport(result: CombineResult): string {
    let report = `# Translation Combination Report\n\n`;

    report += `## Summary\n`;
    report += `- **Total unique keys**: ${result.totalKeys}\n`;
    report += `- **Source applications**: ${result.sources.length}\n`;
    report += `- **Conflicts found**: ${result.conflicts.length}\n\n`;

    report += `## Sources\n`;
    result.sources.forEach((source) => {
      report += `- **${source.app}**: ${source.keyCount} keys\n`;
      report += `  - Path: \`${source.filePath}\`\n`;
    });
    report += `\n`;

    if (result.conflicts.length > 0) {
      report += `## Conflicts\n`;
      report += `The following keys have different values across applications:\n\n`;

      result.conflicts.forEach((conflict) => {
        report += `### \`${conflict.key}\`\n`;
        conflict.sources.forEach((source, index) => {
          report += `- **${source}**: "${conflict.values[index]}"\n`;
        });
        report += `\n`;
      });
    }

    report += `## Key Distribution\n`;
    const keysByApp = result.sources
      .map((s) => ({ app: s.app, count: s.keyCount }))
      .sort((a, b) => b.count - a.count);

    keysByApp.forEach((item) => {
      const percentage = ((item.count / result.totalKeys) * 100).toFixed(1);
      report += `- **${item.app}**: ${item.count} keys (${percentage}% of total)\n`;
    });

    return report;
  }

  /**
   * Extract app name from file path
   */
  private extractAppName(filePath: string): string {
    const parts = filePath.split("/");
    const appIndex = parts.findIndex((part) => part === "apps");
    return appIndex !== -1 && appIndex + 1 < parts.length ? parts[appIndex + 1] : "unknown";
  }

  /**
   * Find which source contains a specific key
   */
  private findSourceForKey(key: string, sources: TranslationSource[]): string {
    // This is a simplified approach - in a real implementation,
    // we'd need to track which source each key came from
    return sources.length > 0 ? sources[sources.length - 1].app : "unknown";
  }

  /**
   * Get translation message for a key
   */
  getTranslationMessage(translations: CombinedTranslations, key: string): string | null {
    const entry = translations[key];
    return entry ? entry.message : null;
  }

  /**
   * Check if a key exists in the combined translations
   */
  hasTranslation(translations: CombinedTranslations, key: string): boolean {
    return key in translations;
  }

  /**
   * Get all available translation keys
   */
  getAllKeys(translations: CombinedTranslations): string[] {
    return Object.keys(translations).sort();
  }

  /**
   * Search for keys containing a specific text
   */
  searchKeys(translations: CombinedTranslations, searchText: string): string[] {
    const lowerSearch = searchText.toLowerCase();
    return Object.keys(translations).filter(
      (key) =>
        key.toLowerCase().includes(lowerSearch) ||
        translations[key].message.toLowerCase().includes(lowerSearch),
    );
  }
}
