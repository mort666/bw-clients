/**
 * Shared types for the i18n migration tools
 */

export interface TransformationResult {
  success: boolean;
  filePath: string;
  changes: TransformationChange[];
  errors: string[];
}

export interface TransformationChange {
  type: "replace" | "add" | "remove";
  location: {
    line: number;
    column: number;
  };
  original?: string;
  replacement?: string;
  description: string;
}

export interface MigrationConfig {
  sourceRoot: string;
  tsConfigPath: string;
  dryRun: boolean;
  verbose: boolean;
}

export interface I18nUsage {
  filePath: string;
  line: number;
  column: number;
  method: "t" | "pipe";
  key: string;
  parameters?: string[];
  context?: string;
}
