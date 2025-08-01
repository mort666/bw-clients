/* eslint-disable no-console */
import * as path from "path";

import chalk from "chalk";
import { Project, SourceFile, Node } from "ts-morph";

import { MigrationConfig } from "../shared/types";

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  filePath: string;
  line: number;
  column: number;
  message: string;
  code?: string;
}

export interface ValidationSummary {
  totalFiles: number;
  filesWithIssues: number;
  errors: number;
  warnings: number;
  info: number;
  remainingI18nUsages: number;
  malformedLocalizeUsages: number;
  missingImports: number;
}

/**
 * Validates TypeScript migration results and checks for common issues
 */
export class MigrationValidator {
  private project: Project;

  constructor(private config: MigrationConfig) {
    this.project = new Project({
      tsConfigFilePath: config.tsConfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  }

  /**
   * Perform comprehensive validation of migration results
   */
  async validate(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const sourceFiles = this.project.getSourceFiles();

    console.log(chalk.blue(`🔍 Validating ${sourceFiles.length} files...`));

    for (const sourceFile of sourceFiles) {
      if (this.config.verbose) {
        console.log(
          chalk.gray(`  Validating: ${path.relative(process.cwd(), sourceFile.getFilePath())}`),
        );
      }

      // Check for remaining I18nService usage
      issues.push(...this.checkRemainingI18nUsage(sourceFile));

      // Check for malformed $localize usage
      issues.push(...this.checkMalformedLocalizeUsage(sourceFile));

      // Check for missing imports
      issues.push(...this.checkMissingImports(sourceFile));

      // Check for compilation errors
      issues.push(...this.checkCompilationErrors(sourceFile));

      // Check for potential runtime issues
      issues.push(...this.checkRuntimeIssues(sourceFile));
    }

    const summary = this.generateSummary(sourceFiles, issues);
    const isValid = issues.filter((i) => i.type === "error").length === 0;

    return {
      isValid,
      issues,
      summary,
    };
  }

  /**
   * Check for remaining I18nService usage that wasn't migrated
   */
  private checkRemainingI18nUsage(sourceFile: SourceFile): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();

        if (Node.isPropertyAccessExpression(expression)) {
          const object = expression.getExpression();
          const property = expression.getName();

          if (property === "t" && this.isI18nServiceAccess(object)) {
            const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());

            issues.push({
              type: "error",
              filePath: sourceFile.getFilePath(),
              line,
              column,
              message: "Remaining I18nService.t() call found - migration incomplete",
              code: node.getText(),
            });
          }
        }
      }
    });

    return issues;
  }

  /**
   * Check for malformed $localize usage
   */
  private checkMalformedLocalizeUsage(sourceFile: SourceFile): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    sourceFile.forEachDescendant((node) => {
      if (Node.isTaggedTemplateExpression(node)) {
        const tag = node.getTag();

        if (Node.isIdentifier(tag) && tag.getText() === "$localize") {
          const template = node.getTemplate();
          const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());

          // Check for common malformed patterns
          if (Node.isTemplateExpression(template)) {
            const templateText = template.getText();

            // Check for missing parameter names
            if (templateText.includes("${") && !templateText.includes(":")) {
              issues.push({
                type: "warning",
                filePath: sourceFile.getFilePath(),
                line,
                column,
                message: "Potential malformed $localize parameter - missing parameter name",
                code: node.getText(),
              });
            }

            // Check for unescaped special characters
            if (templateText.includes("`") && !templateText.includes("\\`")) {
              issues.push({
                type: "warning",
                filePath: sourceFile.getFilePath(),
                line,
                column,
                message: "Potential unescaped backtick in $localize template",
                code: node.getText(),
              });
            }
          }
        }
      }
    });

    return issues;
  }

  /**
   * Check for missing imports that might be needed
   */
  private checkMissingImports(sourceFile: SourceFile): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const text = sourceFile.getFullText();

    // Check if $localize is used but @angular/localize is not imported
    if (text.includes("$localize")) {
      const hasLocalizeImport = sourceFile.getImportDeclarations().some((importDecl) => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        return moduleSpecifier.includes("@angular/localize");
      });

      // Note: $localize is typically a global, but we should check if it needs explicit import
      if (!hasLocalizeImport && this.needsExplicitLocalizeImport(sourceFile)) {
        issues.push({
          type: "info",
          filePath: sourceFile.getFilePath(),
          line: 1,
          column: 1,
          message: "File uses $localize but may need explicit import in some configurations",
        });
      }
    }

    return issues;
  }

  /**
   * Check for TypeScript compilation errors
   */
  private checkCompilationErrors(sourceFile: SourceFile): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      const diagnostics = sourceFile.getPreEmitDiagnostics();

      for (const diagnostic of diagnostics) {
        const start = diagnostic.getStart();
        const { line, column } = start
          ? sourceFile.getLineAndColumnAtPos(start)
          : { line: 1, column: 1 };

        issues.push({
          type: "error",
          filePath: sourceFile.getFilePath(),
          line,
          column,
          message: `TypeScript error: ${diagnostic.getMessageText()}`,
        });
      }
    } catch (error) {
      // If we can't get diagnostics, add a warning
      issues.push({
        type: "warning",
        filePath: sourceFile.getFilePath(),
        line: 1,
        column: 1,
        message: `Could not check compilation errors: ${error}`,
      });
    }

    return issues;
  }

  /**
   * Check for potential runtime issues
   */
  private checkRuntimeIssues(sourceFile: SourceFile): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    sourceFile.forEachDescendant((node) => {
      if (Node.isTaggedTemplateExpression(node)) {
        const tag = node.getTag();

        if (Node.isIdentifier(tag) && tag.getText() === "$localize") {
          const template = node.getTemplate();
          const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());

          if (Node.isTemplateExpression(template)) {
            const spans = template.getTemplateSpans();

            // Check for complex expressions that might cause runtime issues
            spans.forEach((span) => {
              const expression = span.getExpression();
              const expressionText = expression.getText();

              // Check for function calls in template expressions
              if (expressionText.includes("(") && expressionText.includes(")")) {
                issues.push({
                  type: "warning",
                  filePath: sourceFile.getFilePath(),
                  line,
                  column,
                  message: "Complex expression in $localize template may cause runtime issues",
                  code: expressionText,
                });
              }
            });
          }
        }
      }
    });

    return issues;
  }

  /**
   * Generate validation summary
   */
  private generateSummary(sourceFiles: SourceFile[], issues: ValidationIssue[]): ValidationSummary {
    const filesWithIssues = new Set(issues.map((i) => i.filePath)).size;
    const errors = issues.filter((i) => i.type === "error").length;
    const warnings = issues.filter((i) => i.type === "warning").length;
    const info = issues.filter((i) => i.type === "info").length;

    const remainingI18nUsages = issues.filter((i) =>
      i.message.includes("Remaining I18nService.t() call"),
    ).length;

    const malformedLocalizeUsages = issues.filter((i) =>
      i.message.includes("malformed $localize"),
    ).length;

    const missingImports = issues.filter((i) =>
      i.message.includes("may need explicit import"),
    ).length;

    return {
      totalFiles: sourceFiles.length,
      filesWithIssues,
      errors,
      warnings,
      info,
      remainingI18nUsages,
      malformedLocalizeUsages,
      missingImports,
    };
  }

  /**
   * Generate validation report
   */
  generateReport(result: ValidationResult): string {
    let report = `# Migration Validation Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total files:** ${result.summary.totalFiles}\n`;
    report += `- **Files with issues:** ${result.summary.filesWithIssues}\n`;
    report += `- **Errors:** ${result.summary.errors}\n`;
    report += `- **Warnings:** ${result.summary.warnings}\n`;
    report += `- **Info:** ${result.summary.info}\n`;
    report += `- **Overall status:** ${result.isValid ? "✅ VALID" : "❌ INVALID"}\n\n`;

    report += `## Issue Breakdown\n\n`;
    report += `- **Remaining I18nService usages:** ${result.summary.remainingI18nUsages}\n`;
    report += `- **Malformed $localize usages:** ${result.summary.malformedLocalizeUsages}\n`;
    report += `- **Missing imports:** ${result.summary.missingImports}\n\n`;

    if (result.issues.length > 0) {
      report += `## Issues by File\n\n`;

      const issuesByFile = result.issues.reduce(
        (acc, issue) => {
          if (!acc[issue.filePath]) {
            acc[issue.filePath] = [];
          }
          acc[issue.filePath].push(issue);
          return acc;
        },
        {} as Record<string, ValidationIssue[]>,
      );

      Object.entries(issuesByFile).forEach(([filePath, fileIssues]) => {
        report += `### ${filePath}\n\n`;

        fileIssues.forEach((issue) => {
          const icon = issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️";
          report += `${icon} **Line ${issue.line}:** ${issue.message}\n`;
          if (issue.code) {
            report += `   \`${issue.code}\`\n`;
          }
        });

        report += `\n`;
      });
    }

    return report;
  }

  /**
   * Check if a node represents access to I18nService
   */
  private isI18nServiceAccess(node: Node): boolean {
    const text = node.getText();
    return text.includes("i18nService") || text.includes("i18n") || text.includes("this.i18n");
  }

  /**
   * Check if file needs explicit $localize import
   */
  private needsExplicitLocalizeImport(sourceFile: SourceFile): boolean {
    // This is a heuristic - in most Angular setups, $localize is global
    // But in some configurations, it might need explicit import
    const text = sourceFile.getFullText();

    // If there are many $localize usages, it might benefit from explicit import
    const localizeCount = (text.match(/\$localize/g) || []).length;
    return localizeCount > 5;
  }
}
