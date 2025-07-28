import { SourceFile, Node } from "ts-morph";

import { TransformationResult, TransformationChange, I18nUsage } from "../shared/types";

/**
 * AST transformation utilities for TypeScript code migration
 */
export class ASTTransformer {
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

                  // Replace the node
                  node.replaceWithText(replacement);

                  changes.push({
                    type: "replace",
                    location: { line, column },
                    original,
                    replacement,
                    description: `Replaced i18nService.t('${key}') with $localize`,
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
   * Generate $localize call with parameters
   */
  private generateLocalizeCall(key: string, paramArgs: Node[]): string {
    if (paramArgs.length === 0) {
      return `$localize\`${key}\``;
    }

    // For now, handle simple parameter substitution
    // This will need to be enhanced for complex cases
    const params = paramArgs.map((arg, index) => `\${${arg.getText()}}:param${index}:`);
    return `$localize\`${key}${params.join("")}\``;
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
