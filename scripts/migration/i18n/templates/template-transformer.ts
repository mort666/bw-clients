import { TransformationResult, TransformationChange, I18nUsage } from "../shared/types";

import { TemplateParser } from "./template-parser";

/**
 * Template transformation utilities for migrating i18n pipes to i18n attributes
 */
export class TemplateTransformer {
  private parser: TemplateParser;

  constructor() {
    this.parser = new TemplateParser();
  }

  /**
   * Find all i18n pipe usage in a template file
   */
  findI18nPipeUsage(templateContent: string, filePath: string): I18nUsage[] {
    return this.parser.findI18nPipeUsage(templateContent, filePath);
  }

  /**
   * Transform i18n pipes to i18n attributes in a template
   */
  transformTemplate(templateContent: string, filePath: string): TransformationResult {
    const changes: TransformationChange[] = [];
    const errors: string[] = [];

    try {
      // Use the parser to find all i18n pipe usages via AST
      const usages = this.parser.findI18nPipeUsage(templateContent, filePath);

      let transformedContent = templateContent;

      // Process each usage found by the AST parser (reverse order to handle replacements from end to start)
      for (const usage of usages.reverse()) {
        if (!usage.context) {
          continue; // Skip usages without context
        }

        const replacement = this.generateReplacement(usage);
        transformedContent = this.replaceAtPosition(transformedContent, usage, replacement);

        changes.push({
          type: "replace",
          location: { line: usage.line, column: usage.column },
          original: usage.context,
          replacement,
          description: `Transformed ${usage.method} usage '${usage.key}' to i18n attribute`,
        });
      }

      return {
        success: true,
        filePath,
        changes,
        errors,
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
   * Generate replacement text for a given i18n usage
   */
  private generateReplacement(usage: I18nUsage): string {
    const i18nId = this.generateI18nId(usage.key);
    const context = usage.context || "";

    if (context.startsWith("{{") && context.endsWith("}}")) {
      // Interpolation: {{ 'key' | i18n }} -> <span i18n="@@key">key</span>
      return `<span i18n="@@${i18nId}">${usage.key}</span>`;
    } else if (context.includes("[") && context.includes("]")) {
      // Attribute binding: [title]="'key' | i18n" -> [title]="key" i18n-title="@@key"
      const attrMatch = context.match(/\[([^\]]+)\]/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        return `[${attrName}]="${usage.key}" i18n-${attrName}="@@${i18nId}"`;
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
   * Get line and column information for a position in the template
   */
  private getPositionInfo(
    templateContent: string,
    position: number,
  ): { line: number; column: number } {
    const lines = templateContent.substring(0, position).split("\n");
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
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
}
