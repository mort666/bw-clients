import { SourceFile, Node } from "ts-morph";

import { TranslationLookup } from "../shared/translation-lookup";
import { TransformationResult, TransformationChange, I18nUsage } from "../shared/types";

/**
 * AST transformation utilities for TypeScript code migration
 */
export class ASTTransformer {
  private translationLookup: TranslationLookup;

  constructor(rootPath?: string) {
    this.translationLookup = new TranslationLookup(rootPath);
  }

  /**
   * Initialize the translation lookup system
   */
  async initialize(combinedFilePath?: string): Promise<void> {
    await this.translationLookup.loadTranslations(combinedFilePath);
  }

  /**
   * Find all I18nService.t() method calls in a source file
   */
  findI18nServiceCalls(sourceFile: SourceFile): I18nUsage[] {
    const usages: I18nUsage[] = [];

    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();

        if (Node.isPropertyAccessExpression(expression)) {
          const object = expression.getExpression();
          const property = expression.getName();

          // Check if this is a call to i18nService.t() or this.i18n.t()
          if (property === "t" && this.isI18nServiceAccess(object)) {
            const args = node.getArguments();
            if (args.length > 0) {
              const keyArg = args[0];
              const key = this.extractStringLiteral(keyArg);

              if (key) {
                const parameters = args.slice(1).map((arg) => arg.getText());
                const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());

                usages.push({
                  filePath: sourceFile.getFilePath(),
                  line,
                  column,
                  method: "t",
                  key,
                  parameters: parameters.length > 0 ? parameters : undefined,
                });
              }
            }
          }
        }
      }
    });

    return usages;
  }

  /**
   * Transform I18nService.t() calls to $localize calls
   */
  transformI18nServiceCalls(sourceFile: SourceFile): TransformationResult {
    const changes: TransformationChange[] = [];
    const errors: string[] = [];

    try {
      // Find and replace I18nService calls
      sourceFile.forEachDescendant((node) => {
        if (Node.isCallExpression(node)) {
          const expression = node.getExpression();

          if (Node.isPropertyAccessExpression(expression)) {
            const object = expression.getExpression();
            const property = expression.getName();

            if (property === "t" && this.isI18nServiceAccess(object)) {
              const args = node.getArguments();
              if (args.length > 0) {
                const keyArg = args[0];
                const key = this.extractStringLiteral(keyArg);

                if (key) {
                  const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());
                  const original = node.getText();

                  // Generate $localize replacement
                  const replacement = this.generateLocalizeCall(key, args.slice(1));

                  // Check if translation was found
                  const hasTranslation = this.translationLookup.hasTranslation(key);
                  if (!hasTranslation) {
                    errors.push(`Warning: No translation found for key '${key}' at line ${line}`);
                  }

                  // Replace the node
                  node.replaceWithText(replacement);

                  changes.push({
                    type: "replace",
                    location: { line, column },
                    original,
                    replacement,
                    description: `Replaced i18nService.t('${key}') with $localize${hasTranslation ? "" : " (translation not found)"}`,
                  });
                }
              }
            }
          }
        }
      });

      // Remove I18nService imports if no longer used
      this.removeUnusedI18nImports(sourceFile, changes);

      return {
        success: true,
        filePath: sourceFile.getFilePath(),
        changes,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Error transforming file: ${errorMessage}`);
      return {
        success: false,
        filePath: sourceFile.getFilePath(),
        changes,
        errors,
      };
    }
  }

  /**
   * Check if a node represents access to I18nService
   */
  private isI18nServiceAccess(node: Node): boolean {
    const text = node.getText();
    return text.includes("i18nService") || text.includes("i18n") || text.includes("this.i18n");
  }

  /**
   * Extract string literal value from a node
   */
  private extractStringLiteral(node: Node): string | null {
    if (Node.isStringLiteral(node)) {
      return node.getLiteralValue();
    }
    if (Node.isNoSubstitutionTemplateLiteral(node)) {
      return node.getLiteralValue();
    }
    return null;
  }

  /**
   * Generate $localize call with parameters using actual translation text
   */
  private generateLocalizeCall(key: string, paramArgs: Node[]): string {
    // Get the full translation entry from the lookup
    const translationEntry = this.translationLookup.getTranslationEntry(key);
    const messageText = translationEntry?.message || key; // Fallback to key if translation not found

    if (paramArgs.length === 0) {
      // Simple case: no parameters
      return `$localize\`:@@${key}:${this.escapeForTemplate(messageText)}\``;
    }

    // Handle parameter substitution using the placeholders object
    let processedMessage = messageText;
    const placeholders = translationEntry?.placeholders || {};

    // Create a map of parameter positions to arguments based on placeholders
    const paramMap = new Map<string, { arg: string; paramName: string }>();

    // Map placeholders to parameter arguments
    Object.entries(placeholders).forEach(([placeholderName, placeholderInfo]) => {
      const content = placeholderInfo.content;
      if (content && content.startsWith("$") && content.length > 1) {
        // Extract parameter number from content like "$1", "$2", etc.
        const paramNumber = parseInt(content.substring(1));
        if (!isNaN(paramNumber) && paramNumber > 0 && paramNumber <= paramArgs.length) {
          const argIndex = paramNumber - 1;
          paramMap.set(placeholderName.toUpperCase(), {
            arg: paramArgs[argIndex].getText(),
            paramName: placeholderName,
          });
        }
      }
    });

    // Replace $VAR$ placeholders in the message with $localize parameter syntax
    paramMap.forEach(({ arg, paramName }, placeholderName) => {
      const placeholder = `$${placeholderName}$`;
      if (processedMessage.includes(placeholder)) {
        processedMessage = processedMessage.replace(placeholder, `\${${arg}}:${paramName}:`);
      }
    });

    // Handle any remaining parameters that weren't mapped through placeholders
    // This is a fallback for cases where placeholders might not be properly defined
    paramArgs.forEach((arg, index) => {
      const paramName = `param${index}`;
      const genericPlaceholder = `$${index + 1}$`;
      if (processedMessage.includes(genericPlaceholder)) {
        processedMessage = processedMessage.replace(
          genericPlaceholder,
          `\${${arg.getText()}}:${paramName}:`,
        );
      }
    });

    return `$localize\`:@@${key}:${this.escapeForTemplate(processedMessage)}\``;
  }

  /**
   * Escape special characters for template literal usage
   * Preserves $localize parameter syntax like ${param}:name:
   */
  private escapeForTemplate(text: string): string {
    return (
      text
        .replace(/\\/g, "\\\\") // Escape backslashes
        .replace(/`/g, "\\`") // Escape backticks
        // Don't escape $ that are part of ${...}: parameter syntax
        .replace(/\$(?!\{[^}]+\}:[^:]*:)/g, "\\$")
    );
  }

  /**
   * Remove unused I18nService imports
   */
  private removeUnusedI18nImports(sourceFile: SourceFile, changes: TransformationChange[]): void {
    const imports = sourceFile.getImportDeclarations();

    imports.forEach((importDecl) => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      if (moduleSpecifier.includes("i18n.service")) {
        // Check if I18nService is still used in the file
        const text = sourceFile.getFullText();

        // Look for actual I18nService usage (constructor parameters, type annotations, etc.)
        // but exclude the .t() method calls since we've transformed those
        const hasI18nServiceType =
          text.includes(": I18nService") ||
          text.includes("<I18nService>") ||
          text.includes("I18nService>") ||
          text.includes("I18nService,") ||
          text.includes("I18nService)");

        // Check for remaining .t() calls that weren't transformed
        const hasRemainingTCalls = text.match(/\bi18nService\.t\s*\(/);

        // Only remove if there are no type references and no remaining method calls
        if (!hasI18nServiceType && !hasRemainingTCalls) {
          const { line, column } = sourceFile.getLineAndColumnAtPos(importDecl.getStart());
          const original = importDecl.getText();

          importDecl.remove();

          changes.push({
            type: "remove",
            location: { line, column },
            original,
            description: "Removed unused I18nService import",
          });
        }
      }
    });
  }
}
