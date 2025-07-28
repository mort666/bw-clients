# Template Migration Tool

This tool migrates Angular templates from using i18n pipes (`{{ 'key' | i18n }}`) to Angular's standard i18n attributes (`<span i18n="@@key">text</span>`).

## Features

- **Analysis**: Analyze current i18n pipe usage in templates
- **Migration**: Transform i18n pipes to i18n attributes
- **Validation**: Check for remaining i18n pipe usage after migration
- **Comparison**: Generate before/after comparison reports
- **Backup**: Create backup files before migration
- **Dry-run**: Preview changes without applying them

## Usage

### Prerequisites

Make sure you're in the `scripts/migration/i18n` directory:

```bash
cd scripts/migration/i18n
```

### Commands

#### Analyze Templates

Analyze current i18n pipe usage in templates:

```bash
npm run template-analyze -- --pattern "**/*.html" --verbose
```

Options:

- `--pattern <pattern>`: Glob pattern for template files (default: `**/*.html`)
- `--output <path>`: Save analysis report to file
- `--verbose`: Enable verbose logging

#### Migrate Templates

Migrate templates from i18n pipes to i18n attributes:

```bash
npm run template-migrate -- --pattern "**/*.html" --dry-run --verbose
```

Options:

- `--pattern <pattern>`: Glob pattern for template files (default: `**/*.html`)
- `--file <path>`: Migrate specific file only
- `--dry-run`: Preview changes without applying them
- `--output <path>`: Output directory for migration reports
- `--backup`: Create backup files before migration
- `--verbose`: Enable verbose logging

#### Validate Migration

Check for remaining i18n pipe usage after migration:

```bash
npm run template-validate -- --pattern "**/*.html" --verbose
```

Options:

- `--pattern <pattern>`: Glob pattern for template files (default: `**/*.html`)
- `--verbose`: Enable verbose logging

#### Compare Templates

Generate before/after comparison for a single template:

```bash
npm run template-compare -- --file "path/to/template.html"
```

Options:

- `--file <path>`: Template file to compare (required)
- `--output <path>`: Save comparison report to file
- `--verbose`: Enable verbose logging

#### Rollback Migration

Restore files from backup:

```bash
npm run template-cli -- rollback --backup-dir "./migration-reports/backups"
```

Options:

- `--backup-dir <path>`: Path to backup directory (default: `./migration-reports/backups`)
- `--verbose`: Enable verbose logging

## Examples

### Basic Migration Workflow

1. **Analyze current usage**:

   ```bash
   npm run template-analyze -- --pattern "src/**/*.html" --output analysis-report.md
   ```

2. **Preview migration (dry-run)**:

   ```bash
   npm run template-migrate -- --pattern "src/**/*.html" --dry-run --verbose
   ```

3. **Perform migration with backup**:

   ```bash
   npm run template-migrate -- --pattern "src/**/*.html" --backup --output ./migration-reports
   ```

4. **Validate results**:
   ```bash
   npm run template-validate -- --pattern "src/**/*.html"
   ```

### Single File Migration

1. **Compare a single file**:

   ```bash
   npm run template-compare -- --file "src/app/component.html" --output comparison.md
   ```

2. **Migrate a single file**:
   ```bash
   npm run template-migrate -- --file "src/app/component.html" --backup
   ```

## Transformation Examples

### Interpolation

**Before:**

```html
<h1>{{ 'welcome' | i18n }}</h1>
```

**After:**

```html
<h1><span i18n="@@welcome">welcome</span></h1>
```

### Attribute Binding

**Before:**

```html
<button [title]="'clickMe' | i18n">Click</button>
```

**After:**

```html
<button [title]="clickMe" i18n-title="@@click-me">Click</button>
```

### Complex Templates

**Before:**

```html
<div>
  <h1>{{ 'appTitle' | i18n }}</h1>
  <nav>
    <a [title]="'homeLink' | i18n" href="/">{{ 'home' | i18n }}</a>
  </nav>
</div>
```

**After:**

```html
<div>
  <h1><span i18n="@@app-title">appTitle</span></h1>
  <nav>
    <a [title]="homeLink" i18n-title="@@home-link" href="/"><span i18n="@@home">home</span></a>
  </nav>
</div>
```

## Key Transformations

- **Translation keys**: Converted from camelCase/snake_case to kebab-case IDs

  - `camelCaseKey` → `@@camel-case-key`
  - `snake_case_key` → `@@snake-case-key`
  - `dotted.key.name` → `@@dotted-key-name`

- **Interpolations**: Wrapped in `<span>` elements with `i18n` attributes
- **Attribute bindings**: Converted to `i18n-{attribute}` attributes
- **Parameters**: Currently preserved as-is (may need manual review)

## Output Files

When using `--output` option, the tool generates:

- **Analysis reports**: Markdown files with usage statistics
- **Migration reports**: Detailed change logs with before/after comparisons
- **Backup files**: Original files with `.backup` extension
- **Comparison reports**: Side-by-side before/after views

## Error Handling

The tool includes comprehensive error handling:

- **File not found**: Graceful handling of missing files
- **Parse errors**: Detailed error messages for malformed templates
- **Validation failures**: Automatic rollback on transformation errors
- **Backup creation**: Automatic backup before destructive operations

## Testing

Run the CLI tests:

```bash
npm test -- templates/cli.spec.ts
```

The test suite covers:

- Analysis functionality
- Dry-run migration
- Actual file migration
- Validation of results
- Comparison report generation
- Error scenarios

## Integration

This tool is part of the larger Angular i18n migration suite. Use it in conjunction with:

- **TypeScript migrator**: For migrating `I18nService.t()` calls to `$localize`
- **Build system updates**: For configuring Angular's i18n build process
- **Translation file conversion**: For converting JSON to XLIFF format

## Troubleshooting

### Common Issues

1. **No files found**: Check your pattern and current directory
2. **Permission errors**: Ensure write permissions for target files
3. **Parse errors**: Check for malformed HTML in templates
4. **Validation failures**: Review transformation accuracy

### Debug Mode

Use `--verbose` flag for detailed logging:

```bash
npm run template-migrate -- --pattern "**/*.html" --verbose --dry-run
```

This will show:

- Files being processed
- Transformations being applied
- Validation results
- Error details
