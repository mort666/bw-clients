# Design Document

## Overview

This design outlines the migration from Bitwarden's custom i18n system (I18nService and I18nPipe) to Angular's built-in localization system (@angular/localize) with runtime locale switching support. The migration will replace the custom translation system with Angular's standard localization while maintaining the ability to dynamically switch locales at runtime, which is essential for user preference management.

The current system uses a custom TranslationService and I18nService that loads JSON translation files at runtime and provides a `t()` method for translations and an `i18n` pipe for templates. The new system will use Angular's `$localize` function for TypeScript code and `i18n` attributes for templates, with runtime locale loading and switching capabilities as supported by Angular's recent updates.

## Architecture

### Current System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Templates     │    │   TypeScript     │    │  Translation    │
│   {{ 'key' |    │    │   i18n.t('key')  │    │  JSON Files     │
│   i18n }}       │    │                  │    │  (en.json, etc) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   I18nService       │
                    │   - t() method      │
                    │   - setLocale()     │
                    │   - locale$         │
                    └─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  TranslationService │
                    │  - loadMessages()   │
                    │  - translate()      │
                    └─────────────────────┘
```

### New System Architecture (Runtime Localization)

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Templates     │    │   TypeScript     │    │   XLIFF Files   │
│   <span i18n>   │    │   $localize      │    │   (messages.xlf │
│   Text</span>   │    │   `Text`         │    │   per locale)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  Angular Runtime    │
                    │  - loadTranslations │
                    │  - $localize runtime│
                    │  - Dynamic switching│
                    └─────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  Runtime Locale     │
                    │  Management         │
                    │  - Locale switching │
                    │  - Translation load │
                    └─────────────────────┘
```

## Components and Interfaces

### 1. Translation Extraction and Build Configuration

**Angular CLI Configuration (`angular.json`)**

- Configure i18n extraction and build options
- Define supported locales and source locale
- Set up build configurations for each locale

**Extraction Configuration**

- Use Angular CLI's `ng extract-i18n` command
- Configure extraction to generate XLIFF 2.0 files
- Set up automated extraction in build pipeline

### 2. Template Migration System

**Template Transformer**

- Parse Angular templates using angular-eslint's template parser
- Identify `| i18n` pipe usage patterns
- Transform to `i18n` attributes with proper IDs and descriptions
- Handle complex cases like interpolation and pluralization

**Migration Patterns:**

```html
<!-- Before -->
{{ 'loginWithDevice' | i18n }} {{ 'itemsCount' | i18n: count }}

<!-- After -->
<span i18n="@@loginWithDevice">Log in with device</span>
<span i18n="@@itemsCount" i18n-plural>{count, plural, =1 {1 item} other {{{count}} items}}</span>
```

### 3. TypeScript Code Migration System

**Code Transformer using ts-morph**

- Parse TypeScript files to find I18nService usage
- Replace `i18nService.t()` calls with `$localize` calls
- Handle parameter substitution and maintain type safety
- Update imports and remove I18nService dependencies

**Migration Patterns:**

```typescript
// Before
this.i18nService.t("loginWithDevice");
this.i18nService.t("itemsCount", count.toString());

// After
$localize`Log in with device`;
$localize`${count}:count: items`;
```

### 4. Locale Management System

**Runtime Locale Service**

- Create a service to handle dynamic locale switching at runtime
- Integrate with Angular's runtime localization APIs
- Load translation files dynamically without application restart
- Maintain compatibility with existing locale persistence
- Handle locale switching for SPA scenarios

**Interface:**

```typescript
export interface RuntimeLocaleService {
  currentLocale$: Observable<string>;
  supportedLocales: string[];
  setLocale(locale: string): Promise<void>;
  loadTranslations(locale: string): Promise<void>;
  getLocaleDisplayName(locale: string): string;
}
```

### 5. Build System Integration

**Webpack Configuration Updates**

- Update webpack configs to support runtime i18n loading
- Configure dynamic import of translation files
- Set up proper chunking for translation resources
- Integrate with existing build pipeline

**Build Scripts**

- Create scripts for extracting translations
- Set up merge process for updated translations
- Configure single build with runtime translation loading
- Implement translation file serving and caching logic

## Data Models

### Translation File Format Migration

**Current JSON Format:**

```json
{
  "loginWithDevice": {
    "message": "Log in with device"
  },
  "itemsCount": {
    "message": "Items: __$1__",
    "placeholders": {
      "count": {
        "content": "$1"
      }
    }
  }
}
```

**New XLIFF Format:**

```xml
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0">
  <file id="ngi18n" source-language="en-US">
    <unit id="loginWithDevice">
      <segment>
        <source>Log in with device</source>
      </segment>
    </unit>
    <unit id="itemsCount">
      <segment>
        <source>{count, plural, =1 {1 item} other {{count} items}}</source>
      </segment>
    </unit>
  </file>
</xliff>
```

### Locale Configuration Model

```typescript
interface LocaleConfig {
  code: string;
  name: string;
  direction: "ltr" | "rtl";
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
}

interface I18nConfig {
  defaultLocale: string;
  supportedLocales: LocaleConfig[];
  fallbackLocale: string;
  extractionPath: string;
  outputPath: string;
}
```

## Error Handling

### Migration Error Handling

**Template Migration Errors**

- Handle malformed template syntax
- Report untranslatable dynamic content
- Provide fallbacks for complex pipe expressions
- Generate migration reports with warnings

**Code Migration Errors**

- Handle complex I18nService usage patterns
- Report dynamic translation key usage
- Provide manual migration guidance for edge cases
- Maintain error context for debugging

### Runtime Error Handling

**Missing Translation Handling**

- Configure Angular's missing translation strategy
- Implement fallback to default locale
- Log missing translations for development
- Provide graceful degradation in production

**Locale Loading Errors**

- Handle failed locale bundle loading
- Implement retry mechanisms
- Fallback to default locale on errors
- Provide user feedback for locale issues

## Testing Strategy

### Migration Testing

**Automated Migration Tests**

- Unit tests for template transformation logic
- Unit tests for TypeScript code transformation
- Integration tests for complete migration workflow
- Regression tests comparing old vs new output

**Translation Completeness Tests**

- Verify all translation keys are migrated
- Check parameter substitution correctness
- Validate XLIFF file structure
- Test locale-specific formatting

### Runtime Testing

**Functional Testing**

- Test all translated UI elements
- Verify locale switching functionality
- Test parameter interpolation
- Validate pluralization rules

**Performance Testing**

- Compare bundle sizes before/after migration
- Measure application startup time
- Test memory usage with different locales
- Benchmark translation rendering performance

### Cross-Platform Testing

**Application Testing**

- Test web application with all locales
- Test browser extension functionality
- Test desktop application localization
- Verify CLI tool translations

**Browser Compatibility**

- Test locale-specific builds in all supported browsers
- Verify proper fallback behavior
- Test right-to-left language support
- Validate accessibility with screen readers

## Implementation Phases

### Phase 1: Foundation Setup

- Install and configure @angular/localize
- Set up build configuration for i18n
- Create migration tooling infrastructure
- Establish testing framework

### Phase 2: Template Migration

- Implement template parsing and transformation
- Migrate core UI components
- Test template migration accuracy
- Create migration validation tools

### Phase 3: TypeScript Migration

- Implement code transformation using ts-morph
- Migrate service and component code
- Update dependency injection patterns
- Test code migration accuracy

### Phase 4: Build System Integration

- Update webpack configurations
- Implement locale-specific builds
- Set up extraction and merge workflows
- Test build pipeline end-to-end

### Phase 5: Translation File Migration

- Convert JSON files to XLIFF format
- Validate translation completeness
- Set up translation workflow
- Test all locale-specific builds

### Phase 6: Legacy System Removal

- Remove I18nService and related code
- Clean up unused dependencies
- Update documentation
- Perform final testing and validation
