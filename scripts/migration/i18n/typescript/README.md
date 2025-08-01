# TypeScript Migration CLI Tool

This CLI tool automates the migration of TypeScript code from Bitwarden's custom I18nService to Angular's built-in `$localize` function.

## Features

- **Batch Processing**: Migrate multiple files efficiently with configurable batch sizes
- **Validation**: Comprehensive validation of migration results
- **Rollback Support**: Create backups and rollback changes if needed
- **Detailed Reporting**: Generate comprehensive migration reports
- **Error Recovery**: Continue processing even when individual files fail
- **Progress Tracking**: Real-time progress updates during batch operations

## Installation

The tool is part of the Bitwarden clients repository and uses existing dependencies:

```bash
cd scripts/migration/i18n
npm install  # If package.json dependencies are needed
```

## Usage

### Command Line Interface

The CLI tool provides several commands:

#### 1. Analyze Usage

Analyze current I18nService usage patterns without making changes:

```bash
npm run cli analyze [options]

# Examples:
npm run cli analyze --verbose
npm run cli analyze --output analysis-report.md
npm run cli analyze --config ./custom-tsconfig.json
```

**Options:**

- `-c, --config <path>`: Path to tsconfig.json (default: ./tsconfig.json)
- `-o, --output <path>`: Output file for analysis report
- `-v, --verbose`: Enable verbose logging

#### 2. Migrate Files

Migrate TypeScript files from I18nService to $localize:

```bash
npm run cli migrate [options]

# Examples:
npm run cli migrate --dry-run --verbose
npm run cli migrate --file ./src/component.ts
npm run cli migrate --backup --output ./migration-reports
```

**Options:**

- `-c, --config <path>`: Path to tsconfig.json (default: ./tsconfig.json)
- `-f, --file <path>`: Migrate specific file only
- `-d, --dry-run`: Preview changes without applying them
- `-o, --output <path>`: Output directory for migration reports
- `-v, --verbose`: Enable verbose logging
- `--backup`: Create backup files before migration

#### 3. Validate Migration

Validate migration results and check for issues:

```bash
npm run cli validate [options]

# Examples:
npm run cli validate --verbose
npm run cli validate --config ./tsconfig.json
```

**Options:**

- `-c, --config <path>`: Path to tsconfig.json (default: ./tsconfig.json)
- `-v, --verbose`: Enable verbose logging

#### 4. Rollback Changes

Rollback migration using backup files:

```bash
npm run cli rollback [options]

# Examples:
npm run cli rollback --backup-dir ./migration-reports/backups
npm run cli rollback --verbose
```

**Options:**

- `-b, --backup-dir <path>`: Path to backup directory (default: ./migration-reports/backups)
- `-v, --verbose`: Enable verbose logging

### Programmatic Usage

You can also use the migration tools programmatically:

```typescript
import { TypeScriptMigrator } from "./typescript-migrator";
import { BatchMigrator } from "./batch-migrator";
import { MigrationValidator } from "./migration-validator";

// Basic migration
const config = {
  sourceRoot: process.cwd(),
  tsConfigPath: "./tsconfig.json",
  dryRun: false,
  verbose: true,
};

const migrator = new TypeScriptMigrator(config);
const results = await migrator.migrateAll();

// Batch migration with options
const batchOptions = {
  config,
  batchSize: 10,
  maxConcurrency: 3,
  outputDir: "./reports",
  createBackups: true,
  continueOnError: true,
};

const batchMigrator = new BatchMigrator(batchOptions);
const batchResult = await batchMigrator.migrate();

// Validation
const validator = new MigrationValidator(config);
const validationResult = await validator.validate();
```

## Migration Process

### What Gets Migrated

The tool transforms the following patterns:

#### Simple Translation Calls

```typescript
// Before
this.i18nService.t("loginRequired");

// After
$localize`loginRequired`;
```

#### Parameterized Translation Calls

```typescript
// Before
this.i18nService.t("itemCount", count.toString());

// After
$localize`itemCount${count.toString()}:param0:`;
```

#### Multiple Parameters

```typescript
// Before
this.i18nService.t("welcomeMessage", name, role);

// After
$localize`welcomeMessage${name}:param0:${role}:param1:`;
```

#### Import Cleanup

The tool automatically removes unused I18nService imports when they're no longer needed:

```typescript
// Before
import { I18nService } from "@bitwarden/common/platform/services/i18n.service";

class Component {
  test() {
    return this.i18nService.t("message");
  }
}

// After
class Component {
  test() {
    return $localize`message`;
  }
}
```

### What Doesn't Get Migrated

- Constructor parameters and type annotations are preserved if I18nService is still used for other purposes
- Dynamic translation keys (variables) require manual review
- Complex parameter expressions may need manual adjustment

## Validation

The validation system checks for:

### Errors (Migration Blockers)

- Remaining I18nService.t() calls that weren't migrated
- TypeScript compilation errors
- Syntax errors in generated code

### Warnings (Potential Issues)

- Malformed $localize parameter syntax
- Complex expressions in template literals
- Unescaped special characters

### Info (Recommendations)

- Files that might benefit from explicit $localize imports
- Performance optimization opportunities

## Reports

The tool generates several types of reports:

### Analysis Report

- Usage statistics across the codebase
- Most common translation keys
- Files with the most I18nService usage

### Migration Report

- Detailed list of all changes made
- Success/failure statistics
- Performance metrics
- Before/after code comparisons

### Validation Report

- Comprehensive issue analysis
- Categorized problems by severity
- File-by-file breakdown of issues

## Sample Test

Run the sample test to see the tool in action:

```bash
npm run sample-test
```

This creates sample TypeScript files and demonstrates the complete migration workflow:

1. Analysis of I18nService usage
2. Batch migration with backups
3. Validation of results
4. Display of transformed code

## Best Practices

### Before Migration

1. **Backup your code**: Always use version control and consider the `--backup` option
2. **Run analysis first**: Use `analyze` command to understand the scope
3. **Test on a subset**: Start with a single file or directory
4. **Review complex cases**: Check files with dynamic keys or complex parameters

### During Migration

1. **Use dry-run mode**: Preview changes before applying them
2. **Enable verbose logging**: Monitor progress and catch issues early
3. **Process in batches**: Use reasonable batch sizes for large codebases
4. **Continue on errors**: Use `continueOnError` to process as much as possible

### After Migration

1. **Run validation**: Always validate results after migration
2. **Test your application**: Ensure functionality works as expected
3. **Review reports**: Check migration reports for any issues
4. **Update build configuration**: Configure Angular's i18n extraction

## Troubleshooting

### Common Issues

#### "File not found" errors

- Ensure tsconfig.json path is correct
- Check that source files are included in TypeScript project

#### "Remaining I18nService usage" warnings

- Review files manually for dynamic keys or complex usage
- Some patterns may require manual migration

#### Performance issues with large codebases

- Reduce batch size and concurrency
- Process specific directories instead of entire codebase
- Use file filtering options

#### Compilation errors after migration

- Check for missing imports or type issues
- Review complex parameter transformations
- Ensure $localize is properly configured

### Getting Help

1. Check the validation report for specific issues
2. Review the migration report for transformation details
3. Use verbose mode for detailed logging
4. Test with sample files first

## Configuration

### TypeScript Configuration

Ensure your tsconfig.json includes all files you want to migrate:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "strict": true
  },
  "include": ["src/**/*.ts", "libs/**/*.ts"]
}
```

### Migration Configuration

The MigrationConfig interface supports:

```typescript
interface MigrationConfig {
  sourceRoot: string; // Root directory for source files
  tsConfigPath: string; // Path to TypeScript configuration
  dryRun: boolean; // Preview mode without changes
  verbose: boolean; // Detailed logging
}
```

### Batch Configuration

For large codebases, configure batch processing:

```typescript
interface BatchMigrationOptions {
  config: MigrationConfig;
  batchSize: number; // Files per batch (default: 10)
  maxConcurrency: number; // Concurrent file processing (default: 3)
  outputDir: string; // Report output directory
  createBackups: boolean; // Create backup files
  continueOnError: boolean; // Continue on individual file errors
}
```

## Contributing

When contributing to the migration tools:

1. Add tests for new transformation patterns
2. Update validation rules for new edge cases
3. Maintain backward compatibility
4. Document new features and options
5. Test with real-world codebases

## License

This tool is part of the Bitwarden clients repository and follows the same GPL-3.0 license.
