import { parseTemplate, TmplAstNode, TmplAstElement, TmplAstBoundText } from "@angular/compiler";

import { I18nUsage } from "../shared/types";

/**
 * Utility class for parsing Angular templates using Angular compiler
 */
export class TemplateParser {
  /**
   * Find all i18n pipe usage in a template
   */
  findI18nPipeUsage(templateContent: string, filePath: string): I18nUsage[] {
    const usages: I18nUsage[] = [];

    // Parse template using Angular compiler
    const parseResult = parseTemplate(templateContent, filePath);

    if (parseResult.nodes) {
      this.traverseNodes(parseResult.nodes, usages, filePath);
    }

    return usages;
  }

  /**
   * Recursively traverse template AST nodes to find i18n pipe usage
   */
  private traverseNodes(nodes: TmplAstNode[], usages: I18nUsage[], filePath: string): void {
    for (const node of nodes) {
      this.processNode(node, usages, filePath);

      // Recursively process child nodes
      if ("children" in node && Array.isArray(node.children)) {
        this.traverseNodes(node.children, usages, filePath);
      }
    }
  }

  /**
   * Process a single template AST node to find i18n pipe usage
   */
  private processNode(node: TmplAstNode, usages: I18nUsage[], filePath: string): void {
    // Handle bound text nodes (interpolations)
    if (this.isBoundText(node)) {
      const expression = node.value;

      if (expression && typeof expression == "object" && "source" in expression) {
        const expressionText = (expression.source as string) || "";

        if (this.containsI18nPipe(expressionText)) {
          const pipeUsage = this.extractI18nPipeUsage(expressionText);
          if (pipeUsage) {
            // Get the actual text from the source span instead of reconstructing it
            const actualContext = node.sourceSpan.start.file.content.substring(
              node.sourceSpan.start.offset,
              node.sourceSpan.end.offset,
            );
            usages.push({
              filePath,
              line: node.sourceSpan.start.line + 1,
              column: node.sourceSpan.start.col,
              method: "pipe",
              key: pipeUsage.key,
              parameters: pipeUsage.parameters,
              context: actualContext,
            });
          }
        }
      }
    }

    // Handle element nodes with attributes
    if (this.isElement(node)) {
      // Check bound attributes (property bindings)
      for (const input of node.inputs || []) {
        if (input.value && "source" in input.value) {
          const inputValue = (input.value.source as string) || "";
          if (this.containsI18nPipe(inputValue)) {
            const pipeUsage = this.extractI18nPipeUsage(inputValue);
            if (pipeUsage) {
              usages.push({
                filePath,
                line: input.sourceSpan.start.line + 1,
                column: input.sourceSpan.start.col,
                method: "pipe",
                key: pipeUsage.key,
                parameters: pipeUsage.parameters,
                context: `[${input.name}]="${inputValue}"`,
              });
            }
          }
        }
      }

      // Check regular attributes
      for (const attr of node.attributes || []) {
        if (attr.value && this.containsI18nPipe(attr.value)) {
          const pipeUsage = this.extractI18nPipeUsage(attr.value);
          if (pipeUsage) {
            usages.push({
              filePath,
              line: attr.sourceSpan.start.line + 1,
              column: attr.sourceSpan.start.col,
              method: "pipe",
              key: pipeUsage.key,
              parameters: pipeUsage.parameters,
              context: `${attr.name}="${attr.value}"`,
            });
          }
        }
      }
    }
  }

  /**
   * Check if a node is a bound text node
   */
  private isBoundText(node: TmplAstNode): node is TmplAstBoundText {
    return node.constructor.name === "BoundText" || "value" in node;
  }

  /**
   * Check if a node is an element node
   */
  private isElement(node: TmplAstNode): node is TmplAstElement {
    return node.constructor.name === "Element" || ("inputs" in node && "attributes" in node);
  }

  /**
   * Check if an expression contains i18n pipe usage
   */
  private containsI18nPipe(expression: string): boolean {
    return /\|\s*i18n\b/.test(expression);
  }

  /**
   * Extract i18n pipe usage details from an expression
   */
  private extractI18nPipeUsage(expression: string): { key: string; parameters?: string[] } | null {
    // Match patterns like: 'key' | i18n or 'key' | i18n:param1:param2
    const pipeMatch = expression.match(/['"`]([^'"`]+)['"`]\s*\|\s*i18n(?::([^|}]+))?/);

    if (pipeMatch) {
      const key = pipeMatch[1];
      const paramString = pipeMatch[2];
      const parameters = paramString
        ? paramString
            .split(":")
            .map((p) => p.trim())
            .filter((p) => p)
        : undefined;

      return { key, parameters };
    }

    // Match more complex patterns with variables
    const complexMatch = expression.match(/([^|]+)\s*\|\s*i18n(?::([^|}]+))?/);
    if (complexMatch) {
      const keyExpression = complexMatch[1].trim();
      const paramString = complexMatch[2];
      const parameters = paramString
        ? paramString
            .split(":")
            .map((p) => p.trim())
            .filter((p) => p)
        : undefined;

      // For complex expressions, use the full expression as the key
      return { key: keyExpression, parameters };
    }

    return null;
  }

  /**
   * Get line and column information for a position in the template
   */
  getPositionInfo(templateContent: string, position: number): { line: number; column: number } {
    const lines = templateContent.substring(0, position).split("\n");
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  /**
   * Check if a template contains any i18n pipe usage
   */
  hasI18nPipeUsage(templateContent: string): boolean {
    return /\|\s*i18n\b/.test(templateContent);
  }

  /**
   * Extract all unique translation keys from a template
   */
  extractTranslationKeys(templateContent: string): string[] {
    const usages = this.findI18nPipeUsage(templateContent, "");
    const keys = new Set(usages.map((usage) => usage.key));
    return Array.from(keys);
  }
}
