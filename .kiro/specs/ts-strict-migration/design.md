# Design Document

## Overview

The TypeScript strict mode migration will systematically enable strict compilation across the entire Bitwarden client codebase. The project currently uses `typescript-strict-plugin` which allows gradual migration by using `@ts-strict-ignore` comments to exclude files from strict checking. The migration involves removing these ignore comments from files after fixing strict mode violations, and finally removing the plugin and enabling native TypeScript strict mode.

The codebase is currently configured with `"strict": false` in the base TypeScript configuration, with the `typescript-strict-plugin` providing selective strict checking. Files with `@ts-strict-ignore` comments are excluded from strict mode checking, allowing for incremental migration.

## Architecture

### Migration Strategy

The migration follows a bottom-up approach, starting with core libraries that have minimal dependencies and working up to applications that depend on multiple libraries. This ensures that strict mode violations are fixed at the foundation level first.

**Migration Order:**

1. Core infrastructure libraries (`platform`, `common`)
2. Domain-specific libraries (`auth`, `vault`, `key-management`, etc.)
3. UI libraries (`components`, `angular`)
4. Applications (`cli`, `browser`, `desktop`, `web`)
5. Licensed features (`bitwarden_license`)

### TypeScript Configuration Changes

The migration will update TypeScript configurations to enable strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    // Individual strict flags (enabled by strict: true)
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

### Incremental Migration Approach

The migration uses a phased approach where each library/application is migrated individually:

1. **Assessment Phase**: Run TypeScript compiler with strict mode to identify violations
2. **Fix Phase**: Systematically fix strict mode violations
3. **Validation Phase**: Ensure tests pass and functionality is preserved
4. **Configuration Phase**: Update tsconfig.json to enable strict mode for that module

## Components and Interfaces

### TypeScript Configuration Management

**Base Configuration (`tsconfig.base.json`)**

- Central configuration that all projects extend
- Will be updated to enable strict mode once all modules are migrated
- Maintains path mappings and compiler options

**Project-Specific Configurations**

- Each app and library has its own tsconfig.json that extends the base
- Individual projects can temporarily override strict settings during migration
- Angular-specific configurations maintain `strictTemplates: true`

### Migration Tooling

**TypeScript Strict Plugin**

- Currently installed and configured (`typescript-strict-plugin@2.4.4`)
- Provides gradual strict mode checking
- Will be removed once native strict mode is fully enabled

**Type Checking Scripts**

- `scripts/test-types.js` runs type checking across all libraries
- Will be updated to use native strict mode checking
- Provides concurrent type checking for faster feedback

### Common Strict Mode Patterns

**Null Safety Patterns**

```typescript
// Before: Potential null/undefined access
function processUser(user: User) {
  return user.name.toUpperCase(); // Error if user.name is null/undefined
}

// After: Explicit null checking
function processUser(user: User) {
  return user.name?.toUpperCase() ?? "Unknown";
}
```

**Property Initialization**

```typescript
// Before: Uninitialized properties
class UserService {
  private apiClient: ApiClient; // Error: not initialized
}

// After: Explicit initialization
class UserService {
  private apiClient!: ApiClient; // Definite assignment assertion
  // OR
  private apiClient: ApiClient | undefined;
  // OR
  private apiClient = new ApiClient();
}
```

**Function Type Safety**

```typescript
// Before: Implicit any parameters
function handleCallback(callback) {
  // Error: implicit any
  callback();
}

// After: Explicit typing
function handleCallback(callback: () => void) {
  callback();
}
```

## Data Models

### Migration Tracking

**Violation Categories**

- Null/undefined safety violations
- Implicit any type violations
- Uninitialized property violations
- Function type violations
- Implicit return violations
- Implicit this context violations

**Progress Tracking**

- Track completion status per library/application
- Document common patterns and solutions
- Maintain list of complex cases requiring special handling

## Error Handling

### Migration Error Categories

**Type Assertion Errors**

- Use type guards instead of type assertions where possible
- Document cases where assertions are necessary
- Prefer narrowing types over assertions

**Legacy Code Compatibility**

- Some legacy patterns may require gradual migration
- Use `// @ts-ignore` sparingly and document reasons
- Plan for future refactoring of problematic patterns

**Third-Party Library Issues**

- Some external libraries may not have strict-compatible types
- Use module augmentation or custom type definitions
- Document workarounds for library-specific issues

### Rollback Strategy

**Per-Module Rollback**

- Each module can independently disable strict mode if critical issues arise
- Maintain ability to revert individual modules without affecting others
- Document rollback procedures and criteria

## Testing Strategy

### Automated Testing

**Type Checking Integration**

- Integrate strict mode checking into CI/CD pipeline
- Ensure all type checking passes before merging
- Update existing type checking scripts to use strict mode

**Unit Test Compatibility**

- Ensure all existing unit tests continue to pass
- Fix test-specific strict mode violations
- Maintain test coverage during migration

**Integration Testing**

- Run full application builds to ensure no runtime regressions
- Test critical user flows after each module migration
- Validate that all applications start and function correctly

### Manual Testing

**Application Functionality**

- Test core features in each application after migration
- Verify that user workflows remain intact
- Check for any runtime errors introduced by strict mode fixes

**Performance Validation**

- Ensure strict mode changes don't impact application performance
- Monitor build times and compilation speed
- Validate that bundle sizes remain reasonable

### Continuous Validation

**Pre-commit Hooks**

- Update existing hooks to enforce strict mode compliance
- Prevent new strict mode violations from being introduced
- Maintain code quality standards throughout migration

**Development Workflow**

- Update development scripts to use strict mode
- Provide clear error messages for strict mode violations
- Integrate strict checking into IDE configurations

## Implementation Phases

### Phase 1: Infrastructure Setup

- Update tooling and scripts for strict mode checking
- Establish migration patterns and documentation
- Set up tracking and validation processes

### Phase 2: Core Libraries Migration

- Migrate `libs/platform` and `libs/common`
- Establish patterns for common strict mode fixes
- Validate that dependent libraries still compile

### Phase 3: Domain Libraries Migration

- Migrate domain-specific libraries in dependency order
- Apply established patterns from core library migration
- Maintain compatibility with unmigrated modules

### Phase 4: UI and Application Migration

- Migrate UI libraries and components
- Migrate applications (CLI, browser, desktop, web)
- Ensure full application functionality

### Phase 5: Final Configuration

- Enable strict mode in base TypeScript configuration
- Remove typescript-strict-plugin dependency
- Update documentation and development guidelines

## Success Criteria

- All TypeScript compilation passes with strict mode enabled
- All existing tests continue to pass
- All applications build and run successfully
- No runtime regressions introduced
- Development workflow improved with better type safety
- Clear documentation of migration patterns and best practices
