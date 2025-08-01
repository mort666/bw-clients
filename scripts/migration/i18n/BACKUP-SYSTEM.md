# Improved Backup System

## Overview

The migration tools now include an improved backup system that preserves full file paths, enabling safe rollback operations even for files in nested directory structures.

## Problem Solved

**Previous Issue**: The original backup system only stored filenames without paths:

```
backups/
├── component.html.backup     # Lost path info!
├── template.html.backup      # Could be from anywhere!
└── form.html.backup          # No way to restore correctly!
```

**New Solution**: Path-preserving backup system:

```
backups/
├── path-mapping.json                           # Maps backup files to original paths
├── src_app_components_login.html.backup        # Unique filename with path info
├── src_shared_templates_form.html.backup       # No naming conflicts
└── libs_ui_components_button.html.backup       # Safe restoration
```

## How It Works

### 1. Backup Creation

When creating backups, the system:

1. **Generates unique backup filenames** by replacing path separators with underscores:

   ```typescript
   const relativePath = path.relative(process.cwd(), filePath);
   const backupFileName = relativePath.replace(/[/\\]/g, "_") + ".backup";
   ```

2. **Creates a path mapping file** that tracks original locations:

   ```json
   {
     "src_app_login.html.backup": "/full/path/to/src/app/login.html",
     "libs_ui_button.html.backup": "/full/path/to/libs/ui/button.html"
   }
   ```

3. **Copies files to backup directory** with the unique names.

### 2. Backup Restoration

When restoring backups, the system:

1. **Reads the path mapping file** to get original locations
2. **Creates missing directories** if they don't exist
3. **Restores files to their exact original paths**
4. **Validates each restoration** before proceeding

## Usage Examples

### TypeScript Migration with Backup

```bash
# Create backups and migrate
npm run migrate -- --backup --output ./migration-reports

# If something goes wrong, rollback
npm run cli -- rollback --backup-dir ./migration-reports/backups
```

### Template Migration with Backup

```bash
# Create backups and migrate templates
npm run template-migrate -- --pattern "src/**/*.html" --backup --output ./reports

# Rollback if needed
npm run template-cli -- rollback --backup-dir ./reports/backups
```

## File Structure

### Backup Directory Structure

```
migration-reports/
└── backups/
    ├── path-mapping.json                    # Critical: Maps backup files to originals
    ├── src_app_login_login.component.html.backup
    ├── src_shared_ui_button.component.html.backup
    ├── libs_forms_input.component.html.backup
    └── apps_web_dashboard_main.component.html.backup
```

### Path Mapping Format

```json
{
  "src_app_login_login.component.html.backup": "/project/src/app/login/login.component.html",
  "src_shared_ui_button.component.html.backup": "/project/src/shared/ui/button.component.html",
  "libs_forms_input.component.html.backup": "/project/libs/forms/input.component.html"
}
```

## Safety Features

### 1. Path Validation

- Verifies path mapping file exists before restoration
- Warns about orphaned backup files without mappings
- Creates missing directories during restoration

### 2. Error Handling

- Graceful handling of missing mapping files
- Clear error messages for corrupted backups
- Verbose logging for troubleshooting

### 3. Backward Compatibility Detection

```bash
❌ Path mapping file not found. Cannot restore files safely.
This backup was created with an older version that doesn't preserve paths.
```

## Migration from Old Backup System

If you have backups created with the old system (without path mapping):

1. **Manual Restoration Required**: The old backups cannot be automatically restored
2. **Identify Original Locations**: You'll need to manually determine where files belong
3. **Create New Backups**: Re-run migrations with `--backup` to create proper backups

## Testing

The backup system includes comprehensive tests covering:

- Path preservation across nested directories
- Restoration accuracy
- Missing directory creation
- Error handling scenarios
- Orphaned file detection

Run tests:

```bash
npm test -- templates/backup-system.spec.ts
```

## Best Practices

### 1. Always Use Backups for Production

```bash
# Good: Creates backups before migration
npm run template-migrate -- --pattern "src/**/*.html" --backup

# Risky: No backup created
npm run template-migrate -- --pattern "src/**/*.html"
```

### 2. Verify Backup Creation

```bash
# Check that path-mapping.json exists
ls -la migration-reports/backups/path-mapping.json

# Verify backup count matches expected files
cat migration-reports/backups/path-mapping.json | jq 'keys | length'
```

### 3. Test Rollback on Small Set First

```bash
# Test rollback on a few files first
npm run template-migrate -- --file "src/app/test.html" --backup
npm run template-cli -- rollback --backup-dir ./migration-reports/backups
```

## Troubleshooting

### Issue: "Path mapping file not found"

**Cause**: Backup was created with old version or mapping file was deleted
**Solution**: Cannot auto-restore; manual restoration required

### Issue: "No mapping found for backup file"

**Cause**: Backup file exists but not in mapping (corrupted backup)
**Solution**: Check backup integrity; may need to recreate

### Issue: Restoration fails with permission errors

**Cause**: Insufficient permissions to create directories or write files
**Solution**: Check file permissions and disk space

## Implementation Details

### Filename Sanitization

```typescript
// Convert paths to safe filenames
const backupFileName = relativePath.replace(/[/\\]/g, "_") + ".backup";

// Examples:
// "src/app/login.html" → "src_app_login.html.backup"
// "libs\\ui\\button.html" → "libs_ui_button.html.backup"
```

### Directory Creation

```typescript
// Ensure target directory exists during restoration
const originalDir = path.dirname(originalPath);
if (!fs.existsSync(originalDir)) {
  fs.mkdirSync(originalDir, { recursive: true });
}
```

### Path Mapping Storage

```typescript
// Save mapping as JSON for easy parsing
const mappingPath = path.join(backupDir, "path-mapping.json");
fs.writeFileSync(mappingPath, JSON.stringify(pathMapping, null, 2));
```

This improved backup system ensures that migration operations can be safely reversed, even in complex project structures with deeply nested files.
