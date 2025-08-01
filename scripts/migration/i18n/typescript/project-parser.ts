import { Project, SourceFile } from "ts-morph";

import { MigrationConfig } from "../shared/types";

/**
 * Utility class for parsing TypeScript projects using ts-morph
 */
export class ProjectParser {
  private project: Project;

  constructor(private config: MigrationConfig) {
    this.project = new Project({
      tsConfigFilePath: config.tsConfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  }

  /**
   * Get all source files in the project
   */
  getSourceFiles(): SourceFile[] {
    return this.project.getSourceFiles();
  }

  /**
   * Get a specific source file by path
   */
  getSourceFile(filePath: string): SourceFile | undefined {
    return this.project.getSourceFile(filePath);
  }

  /**
   * Add a source file to the project
   */
  addSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath);
  }

  /**
   * Save all changes to disk
   */
  async saveChanges(): Promise<void> {
    if (!this.config.dryRun) {
      await this.project.save();
    }
  }

  /**
   * Get the underlying ts-morph Project instance
   */
  getProject(): Project {
    return this.project;
  }

  /**
   * Find files that import I18nService
   */
  findI18nServiceImports(): SourceFile[] {
    return this.project.getSourceFiles().filter((sourceFile) => {
      return sourceFile.getImportDeclarations().some((importDecl) => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        return (
          moduleSpecifier.includes("i18n.service") ||
          moduleSpecifier.includes("@bitwarden/common/platform/services/i18n.service")
        );
      });
    });
  }

  /**
   * Find files that use the i18n pipe in template strings
   */
  findI18nPipeUsage(): SourceFile[] {
    return this.project.getSourceFiles().filter((sourceFile) => {
      const text = sourceFile.getFullText();
      return text.includes("| i18n") || text.includes("|i18n");
    });
  }
}
