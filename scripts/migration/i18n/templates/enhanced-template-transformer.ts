import { TransformationResult, TransformationChange, I18nUsage } from "../shared/types";
import { TranslationLookup } from "../shared/translation-lookup";

import { TemplateParser } from "./template-parser";

/**
 * Enhanced template transformation utilities that use real translation values
 */
export class EnhancedTemplateTransformer {
  private parser: TemplateParser;
  private translationLookup: TranslationLookup;

  constructor(translationLookup?: TranslationLookup) {
    this.parser = new TemplateParser();
    this.translationLookup = translationLookup || new TranslationLookup();
  }

  /**
   * Initialize the transformer with translation data
   */
  async initialize(combinedTranslationsPath?: string): Promise<void> {
    await this.translationLookup.loadTranslations(combinedTranslationsPath);
  }

  /**
   * Find all i18n pipe usage in a template file
   */
  findI18nPipeUsage(templateContent: string, filePath: string): I18nUsage[] {
    return this.parser.findI18nPipeUsage(templateContent, filePath);
  }

  /**
   * Transform i18n pipes to i18n attributes in a template using real translation values
   */
  transformTemplate(templateContent: string, filePath: string): TransformationResult {
    const changes: TransformationChange[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Use the parser to find all i18n pipe usages via AST
      const usages = this.parser.findI18nPipeUsage(templateContent, filePath);

      let transformedContent = templateContent;

      // Process each usage found by the AST parser (reverse order to handle replacements from end to start)
      for (const usage of usages.reverse()) {
        if (!usage.context) {
          continue; // Skip usages without context
        }

        const replacement = this.generateEnhancedReplacement(usage, warnings);
        transformedContent = this.replaceAtPosition(transformedContent, usage, replacement);

        changes.push({
          type: "replace",
          location: { line: usage.line, column: usage.column },
          original: usage.context,
          replacement,
          description: `Transformed ${usage.method} usage '${usage.key}' to i18n attribute with real translation`,
        });
      }

      return {
        success: true,
        filePath,
        changes,
        errors: [...errors, ...warnings],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Error transforming template: ${errorMessage}`);
      return {
        success: false,
        filePath,
        changes,
        errors,
      };
    }
  }

  /**
   * Generate enhanced replacement text using real translation values
   */
  private generateEnhancedReplacement(usage: I18nUsage, warnings: string[]): string {
    const i18nId = this.generateI18nId(usage.key);
    const context = usage.context || "";

    // Get the real translation value
    const translationValue = this.translationLookup.getTranslation(usage.key);

    if (!translationValue) {
      warnings.push(`Translation not found for key: ${usage.key}`);
    }

    // Use translation value if available, otherwise fall back to key
    const displayText = translationValue || usage.key;

    if (context.startsWith("{{") && context.endsWith("}}")) {
      // Interpolation: {{ 'key' | i18n }} -> <span i18n="@@key">Actual Translation</span>
      return `<span i18n="@@${i18nId}">${displayText}</span>`;
    } else if (context.includes("[") && context.includes("]")) {
      // Attribute binding: [title]="'key' | i18n" -> [title]="'Actual Translation'" i18n-title="@@key"
      const attrMatch = context.match(/\[([^\]]+)\]/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        return `[${attrName}]="${displayText}" i18n-${attrName}="@@${i18nId}"`;
      }
    }

    return context; // fallback
  }

  /**
   * Replace usage at specific position in template content
   */
  private replaceAtPosition(content: string, usage: I18nUsage, replacement: string): string {
    // Find the exact position of the usage.context in the content and replace it
    const context = usage.context || "";
    const contextIndex = content.indexOf(context);
    if (contextIndex !== -1) {
      return (
        content.substring(0, contextIndex) +
        replacement +
        content.substring(contextIndex + context.length)
      );
    }
    return content;
  }

  /**
   * Generate i18n ID from a translation key
   */
  private generateI18nId(key: string): string {
    // Convert camelCase or snake_case to kebab-case for i18n IDs
    return key
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/_/g, "-")
      .replace(/\./g, "-")
      .toLowerCase();
  }

  /**
   * Validate that a transformation is correct
   */
  validateTransformation(original: string, transformed: string): boolean {
    try {
      // Basic validation - ensure the transformed template is still valid HTML-like
      const hasMatchingBrackets = this.validateBrackets(transformed);
      const hasValidI18nAttributes = this.validateI18nAttributes(transformed);
      const hasNoRemainingPipes = !this.parser.hasI18nPipeUsage(transformed);

      return hasMatchingBrackets && hasValidI18nAttributes && hasNoRemainingPipes;
    } catch {
      return false;
    }
  }

  /**
   * Validate that brackets are properly matched
   */
  private validateBrackets(content: string): boolean {
    const openBrackets = (content.match(/\{/g) || []).length;
    const closeBrackets = (content.match(/\}/g) || []).length;
    return openBrackets === closeBrackets;
  }

  /**
   * Validate that i18n attributes are properly formatted
   */
  private validateI18nAttributes(content: string): boolean {
    const i18nAttrs = content.match(/i18n(-[\w-]+)?="[^"]*"/g) || [];
    return i18nAttrs.every((attr) => {
      const valueMatch = attr.match(/="([^"]*)"/);
      return valueMatch && valueMatch[1].startsWith("@@");
    });
  }

  /**
   * Generate a report of missing translations
   */
  generateMissingTranslationsReport(templateFiles: string[]): string {
    const allUsages: I18nUsage[] = [];
    const missingKeys = new Set<string>();
    const foundKeys = new Set<string>();

    // Collect all i18n usage from template files
    for (const filePath of templateFiles) {
      try {
        const content = require("fs").readFileSync(filePath, "utf-8");
        const usages = this.findI18nPipeUsage(content, filePath);
        allUsages.push(...usages);
      } catch (error) {
        console.warn(`Could not read template file: ${filePath}`);
      }
    }

    // Check which keys have translations
    for (const usage of allUsages) {
      if (this.translationLookup.hasTranslation(usage.key)) {
        foundKeys.add(usage.key);
      } else {
        missingKeys.add(usage.key);
      }
    }

    let report = `# Missing Translations Report\n\n`;
    report += `## Summary\n`;
    report += `- **Total unique keys found**: ${foundKeys.size + missingKeys.size}\n`;
    report += `- **Keys with translations**: ${foundKeys.size}\n`;
    report += `- **Missing translations**: ${missingKeys.size}\n`;
    report += `- **Coverage**: ${((foundKeys.size / (foundKeys.size + missingKeys.size)) * 100).toFixed(1)}%\n\n`;

    if (missingKeys.size > 0) {
      report += `## Missing Translation Keys\n`;
      const sortedMissing = Array.from(missingKeys).sort();

      for (const key of sortedMissing) {
        report += `- \`${key}\`\n`;

        // Get suggestions for missing keys
        const suggestions = this.translationLookup.getSuggestions(key, 3);
        if (suggestions.length > 0) {
          report += `  - Suggestions: ${suggestions.map((s) => `\`${s.key}\``).join(", ")}\n`;
        }
      }
      report += `\n`;
    }

    if (foundKeys.size > 0) {
      report += `## Keys with Translations\n`;
      const sortedFound = Array.from(foundKeys).sort();

      for (const key of sortedFound) {
        const translation = this.translationLookup.getTranslation(key);
        report += `- \`${key}\`: "${translation}"\n`;
      }
    }

    return report;
  }

  /**
   * Get translation lookup service
   */
  getTranslationLookup(): TranslationLookup {
    return this.translationLookup;
  }
}
