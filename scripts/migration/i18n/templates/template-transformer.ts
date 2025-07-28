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
      let transformedContent = templateContent;

      // Transform interpolations: {{ 'key' | i18n }} -> <span i18n="@@key">key</span>
      transformedContent = this.transformInterpolations(transformedContent, changes);

      // Transform attributes: [title]="'key' | i18n" -> [title]="'key'" i18n-title="@@key"
      transformedContent = this.transformAttributes(transformedContent, changes);

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
   * Transform interpolation usage: {{ 'key' | i18n }} -> <span i18n="@@key">key</span>
   */
  private transformInterpolations(
    templateContent: string,
    changes: TransformationChange[],
  ): string {
    let transformedContent = templateContent;

    // Pattern for string literal interpolations
    const stringInterpolationPattern =
      /\{\{\s*['"`]([^'"`]+)['"`]\s*\|\s*i18n(?::([^}]+))?\s*\}\}/g;

    let match;
    while ((match = stringInterpolationPattern.exec(templateContent)) !== null) {
      const original = match[0];
      const key = match[1];
      const i18nId = this.generateI18nId(key);
      const replacement = `<span i18n="@@${i18nId}">${key}</span>`;

      transformedContent = transformedContent.replace(original, replacement);

      const position = this.getPositionInfo(templateContent, match.index);
      changes.push({
        type: "replace",
        location: position,
        original,
        replacement,
        description: `Transformed interpolation '${key}' to i18n attribute`,
      });
    }

    // Pattern for variable interpolations
    const variableInterpolationPattern =
      /\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\|\s*i18n(?::([^}]+))?\s*\}\}/g;

    while ((match = variableInterpolationPattern.exec(templateContent)) !== null) {
      const original = match[0];
      const variable = match[1];
      const i18nId = this.generateI18nId(variable);
      const replacement = `<span i18n="@@${i18nId}">{{${variable}}}</span>`;

      transformedContent = transformedContent.replace(original, replacement);

      const position = this.getPositionInfo(templateContent, match.index);
      changes.push({
        type: "replace",
        location: position,
        original,
        replacement,
        description: `Transformed variable interpolation '${variable}' to i18n attribute`,
      });
    }

    return transformedContent;
  }

  /**
   * Transform attribute usage: [attr]="'key' | i18n" -> [attr]="'key'" i18n-attr="@@key"
   */
  private transformAttributes(templateContent: string, changes: TransformationChange[]): string {
    let transformedContent = templateContent;

    // Pattern for attributes with i18n pipe
    const attributePattern = /(\[?[\w-]+\]?)\s*=\s*["']([^"']*\|\s*i18n[^"']*)["']/g;

    let match;
    while ((match = attributePattern.exec(templateContent)) !== null) {
      const original = match[0];
      const attrName = match[1];
      const attrValue = match[2];

      // Extract the key from the pipe expression
      const keyMatch = attrValue.match(/['"`]([^'"`]+)['"`]\s*\|\s*i18n(?::([^"'|]+))?/);
      if (keyMatch) {
        const key = keyMatch[1];
        const i18nId = this.generateI18nId(key);

        // Remove brackets if present for i18n attribute
        const baseAttrName = attrName.replace(/[\[\]]/g, "");
        const replacement = `${attrName}="${key}" i18n-${baseAttrName}="@@${i18nId}"`;

        transformedContent = transformedContent.replace(original, replacement);

        const position = this.getPositionInfo(templateContent, match.index);
        changes.push({
          type: "replace",
          location: position,
          original,
          replacement,
          description: `Transformed attribute '${attrName}' with key '${key}' to i18n attribute`,
        });
      }

      // Handle variable attributes
      const variableMatch = attrValue.match(
        /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*\|\s*i18n(?::([^"'|]+))?/,
      );
      if (variableMatch && !keyMatch) {
        const variable = variableMatch[1];
        const i18nId = this.generateI18nId(variable);

        const baseAttrName = attrName.replace(/[\[\]]/g, "");
        const replacement = `${attrName}="${variable}" i18n-${baseAttrName}="@@${i18nId}"`;

        transformedContent = transformedContent.replace(original, replacement);

        const position = this.getPositionInfo(templateContent, match.index);
        changes.push({
          type: "replace",
          location: position,
          original,
          replacement,
          description: `Transformed variable attribute '${attrName}' with variable '${variable}' to i18n attribute`,
        });
      }
    }

    return transformedContent;
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
    } catch (error) {
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
    const i18nAttrs = content.match(/i18n(-[\w-]+)?="@@[\w-]+"/g) || [];
    return i18nAttrs.every((attr) => attr.includes("@@"));
  }
}
