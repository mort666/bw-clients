# TakeUntil to TakeUntilDestroyed Migration Tool

A CLI utility that automatically migrates RxJS `takeUntil` patterns to Angular's `takeUntilDestroyed` using ts-morph.

## What it does

This tool identifies and transforms the following patterns in Angular components, directives, pipes, and services:

✅ **Converts takeUntil patterns:**

- `takeUntil(this._destroy)` → `takeUntilDestroyed(this.destroyRef)`
- `takeUntil(this.destroy$)` → `takeUntilDestroyed(this.destroyRef)`
- `takeUntil(this._destroy$)` → `takeUntilDestroyed(this.destroyRef)`

✅ **Automatically handles context:**

- In constructor: `takeUntilDestroyed()` (auto-infers destroyRef)
- In methods: `takeUntilDestroyed(this.destroyRef)` (explicit destroyRef)

✅ **Cleans up old patterns:**

- Removes unused destroy Subject properties
- Removes empty `ngOnDestroy` methods
- Removes `OnDestroy` interface when no longer needed
- Updates imports automatically

✅ **Adds required imports:**

- `inject, DestroyRef` from `@angular/core`
- `takeUntilDestroyed` from `@angular/core/rxjs-interop`

## Usage

### Basic Usage

```bash
npx ts-node scripts/migrations/takeuntil/takeuntil-migrator.ts
```

### With Custom Options

```bash
# Specify custom tsconfig path
npx ts-node scripts/migrations/takeuntil/takeuntil-migrator.ts --tsconfig ./apps/web/tsconfig.json

# Specify custom file pattern
npx ts-node scripts/migrations/takeuntil/takeuntil-migrator.ts --pattern "src/**/*.component.ts"

# Show help
npx ts-node scripts/migrations/takeuntil/takeuntil-migrator.ts --help
```

## Example Transformation

### Before:

```typescript
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({...})
export class MyComponent implements OnInit, OnDestroy {
  private _destroy$ = new Subject<void>();

  ngOnInit() {
    this.someService.data$
      .pipe(takeUntil(this._destroy$))
      .subscribe(data => {
        // handle data
      });
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }
}
```

### After:

```typescript
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({...})
export class MyComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.someService.data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        // handle data
      });
  }
}
```

## Safety Features

- ⚠️ **Only processes Angular classes** (with @Component, @Directive, @Pipe, @Injectable decorators)
- ⚠️ **Safe property removal** - only removes destroy subjects that are exclusively used for takeUntil
- ⚠️ **Preserves other OnDestroy logic** - won't remove ngOnDestroy if it contains other cleanup code
- ⚠️ **Context-aware replacements** - handles constructor vs method usage appropriately

## Options

| Option                | Description           | Default                                           |
| --------------------- | --------------------- | ------------------------------------------------- |
| `--tsconfig <path>`   | Path to tsconfig.json | `./tsconfig.json`                                 |
| `--pattern <pattern>` | File pattern to match | `/**/*.+(component\|directive\|pipe\|service).ts` |
| `--help, -h`          | Show help message     | -                                                 |

## Output

The tool provides detailed output showing:

- Files processed and migrated
- Number of takeUntil calls replaced
- DestroyRef properties added
- Destroy properties removed

## Post-Migration Steps

After running the migration:

1. **Run your linter/formatter** (eslint, prettier)
2. **Run your tests** to ensure everything works correctly
3. **Manually review changes** for any edge cases

## Limitations

- Only handles basic `takeUntil(this.propertyName)` patterns
- Doesn't handle complex expressions or dynamic property access
- Assumes standard naming conventions for destroy subjects
- May require manual cleanup of complex OnDestroy implementations

## Testing

The migration tool includes comprehensive integration tests to ensure reliability and correctness.

### Running Tests

```bash
# Navigate to test directory
cd scripts/migrations/takeuntil/test

# Run all tests
npm test
```

### Test Fixtures

The `test/fixtures/` directory contains sample files representing various migration patterns:

- Basic takeUntil patterns
- Multiple patterns in one file
- Complex ngOnDestroy logic
- Mixed usage scenarios
- Non-Angular classes
- Already migrated files
