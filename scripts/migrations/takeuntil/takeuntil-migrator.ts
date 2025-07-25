#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { readFileSync } from "fs";
import { resolve } from "path";

import { Project, SyntaxKind, Scope, SourceFile, CallExpression, ClassDeclaration } from "ts-morph";

/**
 * CLI utility to migrate RxJS takeUntil patterns to Angular's takeUntilDestroyed
 *
 * This tool identifies and transforms the following patterns:
 * 1. takeUntil(this._destroy) -> takeUntilDestroyed(this.destroyRef)
 * 2. takeUntil(this.destroy$) -> takeUntilDestroyed(this.destroyRef)
 * 3. Removes destroy Subject properties when they're only used for takeUntil
 * 4. Adds DestroyRef injection when needed
 * 5. Updates imports
 */

interface MigrationStats {
  filesProcessed: number;
  filesMigrated: number;
  takeUntilCallsReplaced: number;
  destroyPropertiesRemoved: number;
  destroyRefPropertiesAdded: number;
}

interface TakeUntilPattern {
  callExpression: CallExpression;
  destroyProperty: string;
  withinConstructor: boolean;
  withinMethod: boolean;
}

class TakeUntilMigrator {
  private project: Project;
  private stats: MigrationStats = {
    filesProcessed: 0,
    filesMigrated: 0,
    takeUntilCallsReplaced: 0,
    destroyPropertiesRemoved: 0,
    destroyRefPropertiesAdded: 0,
  };

  constructor(tsConfigPath: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
    });
  }

  /**
   * Main migration method
   */
  migrate(pattern: string = "/**/*.+(component|directive|pipe|service).ts"): MigrationStats {
    console.log("🚀 Starting takeUntil to takeUntilDestroyed migration...");
    console.log(`📁 Using pattern: ${pattern}`);

    const files = this.project.getSourceFiles(pattern);
    console.log(`📄 Found ${files.length} files to process`);

    for (const file of files) {
      this.processFile(file);
    }

    this.printSummary();
    return this.stats;
  }

  /**
   * Process a single file
   */
  private processFile(file: SourceFile): void {
    this.stats.filesProcessed++;
    const filePath = file.getFilePath();
    console.log(`🔍 Processing: ${filePath.split("/").pop()}`);

    const classes = file.getDescendantsOfKind(SyntaxKind.ClassDeclaration);
    let fileMigrated = false;
    let fileNeedsDestroyRef = false;

    for (const clazz of classes) {
      const result = this.processClass(clazz, file);
      if (result.migrated) {
        fileMigrated = true;
      }
      if (result.needsDestroyRef) {
        fileNeedsDestroyRef = true;
      }
    }

    if (fileMigrated) {
      this.stats.filesMigrated++;
      this.updateImports(file, fileNeedsDestroyRef);
      file.saveSync();
      console.log(`✅ Migrated: ${filePath.split("/").pop()}`);
    }
  }

  /**
   * Process a single class
   */
  private processClass(
    clazz: ClassDeclaration,
    file: SourceFile,
  ): { migrated: boolean; needsDestroyRef: boolean } {
    // Only process Angular classes (Component, Directive, Pipe, Injectable)
    if (!this.isAngularClass(clazz)) {
      return { migrated: false, needsDestroyRef: false };
    }

    const takeUntilPatterns = this.findTakeUntilPatterns(clazz);
    if (takeUntilPatterns.length === 0) {
      return { migrated: false, needsDestroyRef: false };
    }

    console.log(
      `  🎯 Found ${takeUntilPatterns.length} takeUntil pattern(s) in class ${clazz.getName()}`,
    );

    let needsDestroyRef = false;
    const destroyPropertiesUsed = new Set<string>();

    // Process each takeUntil pattern
    for (const pattern of takeUntilPatterns) {
      destroyPropertiesUsed.add(pattern.destroyProperty);

      // Only use auto-inference when directly within constructor
      // Methods called from constructor might also be called elsewhere, so they need explicit destroyRef
      if (pattern.withinConstructor) {
        // Directly in constructor: takeUntilDestroyed() can auto-infer destroyRef
        pattern.callExpression.replaceWithText("takeUntilDestroyed()");
      } else {
        // In methods or property initializers: need explicit destroyRef
        pattern.callExpression.replaceWithText("takeUntilDestroyed(this.destroyRef)");
        needsDestroyRef = true;
      }

      this.stats.takeUntilCallsReplaced++;
    }

    // Add destroyRef property if needed
    if (needsDestroyRef && !this.hasDestroyRefProperty(clazz)) {
      this.addDestroyRefProperty(clazz);
      this.stats.destroyRefPropertiesAdded++;
    }

    // Remove destroy properties that are only used for takeUntil
    for (const destroyPropertyName of destroyPropertiesUsed) {
      if (this.canRemoveDestroyProperty(clazz, destroyPropertyName)) {
        this.removeDestroyProperty(clazz, destroyPropertyName);
        this.stats.destroyPropertiesRemoved++;
      }
    }

    // Remove ngOnDestroy if it only handled destroy subject
    this.cleanupNgOnDestroy(clazz, destroyPropertiesUsed);

    return { migrated: true, needsDestroyRef };
  }

  /**
   * Check if class has Angular decorators
   */
  private isAngularClass(clazz: ClassDeclaration): boolean {
    const angularDecorators = ["Component", "Directive", "Pipe", "Injectable"];
    return clazz
      .getDecorators()
      .some((decorator) => angularDecorators.includes(decorator.getName()));
  }

  /**
   * Find all takeUntil patterns in a class
   */
  private findTakeUntilPatterns(clazz: ClassDeclaration): TakeUntilPattern[] {
    const patterns: TakeUntilPattern[] = [];

    const takeUntilCalls = clazz.getDescendantsOfKind(SyntaxKind.CallExpression).filter((call) => {
      const identifier = call.getExpression();
      return identifier.getText() === "takeUntil";
    });

    for (const call of takeUntilCalls) {
      const args = call.getArguments();
      if (args.length !== 1) {
        continue;
      }

      const arg = args[0].getText();

      // Match patterns like this._destroy, this.destroy$, this._destroy$, etc.
      const destroyPropertyMatch = arg.match(/^this\.(_?destroy\$?|_?destroy_?\$?)$/);
      if (!destroyPropertyMatch) {
        continue;
      }

      const destroyProperty = destroyPropertyMatch[1];
      const withinConstructor = !!call.getFirstAncestorByKind(SyntaxKind.Constructor);
      const withinMethod = !!call.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);

      patterns.push({
        callExpression: call,
        destroyProperty,
        withinConstructor,
        withinMethod: withinMethod && !withinConstructor,
      });
    }

    return patterns;
  }

  /**
   * Check if class already has a destroyRef property
   */
  private hasDestroyRefProperty(clazz: ClassDeclaration): boolean {
    return clazz.getInstanceProperties().some((prop) => prop.getName() === "destroyRef");
  }

  /**
   * Add destroyRef property to class
   */
  private addDestroyRefProperty(clazz: ClassDeclaration): void {
    const lastProperty = clazz.getInstanceProperties().slice(-1)[0];
    const insertIndex = lastProperty ? lastProperty.getChildIndex() + 1 : 0;

    clazz.insertProperty(insertIndex, {
      name: "destroyRef",
      scope: Scope.Private,
      isReadonly: true,
      initializer: "inject(DestroyRef)",
    });

    console.log(`  ➕ Added destroyRef property`);
  }

  /**
   * Check if a destroy property can be safely removed
   */
  private canRemoveDestroyProperty(clazz: ClassDeclaration, propertyName: string): boolean {
    const property = clazz.getInstanceProperty(propertyName);
    if (!property) {
      return false;
    }

    // Find all references to this property in the class
    const propertyReferences = clazz
      .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
      .filter(
        (access) =>
          access.getName() === propertyName && access.getExpression().getText() === "this",
      );

    // Check if all references are only in takeUntil calls or ngOnDestroy
    for (const ref of propertyReferences) {
      // Skip if it's the property declaration itself
      const refText = ref.getFullText();
      if (refText.includes("=") && refText.includes("new Subject")) {
        continue;
      }

      // Allow if it's in a takeUntil call argument
      const takeUntilCall = ref.getFirstAncestorByKind(SyntaxKind.CallExpression);
      if (takeUntilCall && takeUntilCall.getExpression().getText() === "takeUntil") {
        continue;
      }

      // Allow if it's in ngOnDestroy for calling next() or complete()
      const method = ref.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);
      if (method && method.getName() === "ngOnDestroy") {
        // Check if this is a method call on the property
        const parent = ref.getParent();
        if (parent && parent.getKind() === SyntaxKind.PropertyAccessExpression) {
          const grandParent = parent.getParent();
          if (grandParent && grandParent.getKind() === SyntaxKind.CallExpression) {
            const methodCall = parent.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            const methodName = methodCall.getName();
            if (methodName === "next" || methodName === "complete") {
              continue;
            }
          }
        }
      }

      // If we reach here, the property is used elsewhere and can't be removed
      console.log(`  💡 Property ${propertyName} is used elsewhere, keeping it`);
      return false;
    }

    return true;
  }

  /**
   * Remove a destroy property from the class
   */
  private removeDestroyProperty(clazz: ClassDeclaration, propertyName: string): void {
    const property = clazz.getInstanceProperty(propertyName);
    if (property) {
      property.remove();
      console.log(`  ➖ Removed destroy property: ${propertyName}`);
    }
  }

  /**
   * Clean up ngOnDestroy method if it only handled destroy subjects
   */
  private cleanupNgOnDestroy(clazz: ClassDeclaration, destroyProperties: Set<string>): void {
    const ngOnDestroy = clazz.getMethod("ngOnDestroy");
    if (!ngOnDestroy) {
      return;
    }

    const body = ngOnDestroy.getBody();
    if (!body) {
      return;
    }

    // Type assertion to access getStatements method
    const blockBody = body as any;
    if (!blockBody.getStatements) {
      return;
    }

    const statements = blockBody.getStatements();
    let hasOnlyDestroySubjectCalls = true;
    let hasDestroySubjectCalls = false;

    // Check if any destroy properties are still in use (not removed)
    const hasRemainingDestroyProperties = Array.from(destroyProperties).some((prop) => {
      return clazz.getInstanceProperty(prop) !== undefined;
    });

    // If any destroy properties remain, preserve ngOnDestroy
    if (hasRemainingDestroyProperties) {
      console.log(`  💡 Preserving ngOnDestroy because destroy properties are still in use`);
      return;
    }

    // Check if all statements are just destroy subject calls
    for (const statement of statements) {
      const text = statement.getText().trim();

      // Allow empty statements or comments
      if (!text || text.startsWith("//") || text.startsWith("/*")) {
        continue;
      }

      // Check if it's a destroy subject call
      let isDestroySubjectCall = false;
      for (const destroyProp of destroyProperties) {
        if (
          text.includes(`this.${destroyProp}.next(`) ||
          text.includes(`this.${destroyProp}.complete(`)
        ) {
          isDestroySubjectCall = true;
          hasDestroySubjectCalls = true;
          break;
        }
      }

      if (!isDestroySubjectCall) {
        hasOnlyDestroySubjectCalls = false;
      }
    }

    // Only remove the method if it ONLY has destroy subject calls and no other logic
    if (hasOnlyDestroySubjectCalls && hasDestroySubjectCalls) {
      ngOnDestroy.remove();

      // Remove OnDestroy from implements clause if it exists
      const implementsClause = clazz.getImplements();
      const onDestroyIndex = implementsClause.findIndex((impl) =>
        impl.getText().includes("OnDestroy"),
      );

      if (onDestroyIndex !== -1) {
        clazz.removeImplements(onDestroyIndex);
      }

      console.log(`  ➖ Removed ngOnDestroy method`);
    } else if (hasDestroySubjectCalls) {
      // If there are other statements, just remove the destroy subject calls
      this.removeDestroySubjectCallsFromNgOnDestroy(ngOnDestroy, destroyProperties);
    }
  }

  /**
   * Remove only the destroy subject calls from ngOnDestroy, preserving other logic
   */
  private removeDestroySubjectCallsFromNgOnDestroy(
    ngOnDestroy: any,
    destroyProperties: Set<string>,
  ): void {
    const body = ngOnDestroy.getBody();
    if (!body) {
      return;
    }

    const blockBody = body as any;
    if (!blockBody.getStatements) {
      return;
    }

    const statements = blockBody.getStatements();
    const statementsToRemove: any[] = [];

    for (const statement of statements) {
      const text = statement.getText().trim();

      // Check if it's a destroy subject call
      for (const destroyProp of destroyProperties) {
        if (
          text.includes(`this.${destroyProp}.next(`) ||
          text.includes(`this.${destroyProp}.complete(`)
        ) {
          statementsToRemove.push(statement);
          break;
        }
      }
    }

    // Remove the destroy subject call statements
    for (const statement of statementsToRemove) {
      statement.remove();
    }

    if (statementsToRemove.length > 0) {
      console.log(`  ➖ Removed destroy subject calls from ngOnDestroy`);
    }
  }

  /**
   * Update file imports
   */
  private updateImports(file: SourceFile, needsDestroyRef: boolean): void {
    // Remove unused imports
    this.removeUnusedRxjsImports(file);
    this.removeUnusedAngularImports(file);

    // Add Angular imports
    if (needsDestroyRef) {
      this.addImport(file, "@angular/core", ["inject", "DestroyRef"]);
    }
    this.addImport(file, "@angular/core/rxjs-interop", ["takeUntilDestroyed"]);
  }

  /**
   * Remove unused Angular imports
   */
  private removeUnusedAngularImports(file: SourceFile): void {
    const angularImports = file
      .getImportDeclarations()
      .filter((imp) => imp.getModuleSpecifierValue() === "@angular/core");

    for (const importDecl of angularImports) {
      const namedImports = importDecl.getNamedImports();
      const unusedImports: string[] = [];

      for (const namedImport of namedImports) {
        const importName = namedImport.getName();
        if (importName === "OnDestroy") {
          // Check if OnDestroy is still used in the file (in implements clauses or method signatures)
          const onDestroyUsages = file
            .getDescendantsOfKind(SyntaxKind.Identifier)
            .filter((id) => id.getText() === "OnDestroy" && id !== namedImport.getNameNode());

          if (onDestroyUsages.length === 0) {
            unusedImports.push(importName);
          }
        }
      }

      // Remove unused imports
      for (const unusedImport of unusedImports) {
        const namedImport = namedImports.find((ni) => ni.getName() === unusedImport);
        if (namedImport) {
          namedImport.remove();
          console.log(`  ➖ Removed unused import: ${unusedImport}`);
        }
      }
    }
  }

  /**
   * Remove unused RxJS imports
   */
  private removeUnusedRxjsImports(file: SourceFile): void {
    const rxjsImports = file
      .getImportDeclarations()
      .filter((imp) => imp.getModuleSpecifierValue() === "rxjs");

    for (const importDecl of rxjsImports) {
      const namedImports = importDecl.getNamedImports();
      const importsToRemove: { name: string; import: any }[] = [];

      for (const namedImport of namedImports) {
        const importName = namedImport.getName();
        if (importName === "Subject") {
          // Check if Subject is still used in the file
          const subjectUsages = file
            .getDescendantsOfKind(SyntaxKind.Identifier)
            .filter((id) => id.getText() === "Subject" && id !== namedImport.getNameNode());

          if (subjectUsages.length === 0) {
            importsToRemove.push({ name: importName, import: namedImport });
          }
        } else if (importName === "takeUntil") {
          // Check if takeUntil is still used in the file
          const takeUntilUsages = file
            .getDescendantsOfKind(SyntaxKind.Identifier)
            .filter((id) => id.getText() === "takeUntil" && id !== namedImport.getNameNode());

          if (takeUntilUsages.length === 0) {
            importsToRemove.push({ name: importName, import: namedImport });
          }
        }
      }

      // Remove unused imports
      for (const { import: namedImport } of importsToRemove) {
        namedImport.remove();
      }

      // Remove the entire import if no named imports left
      if (importDecl.getNamedImports().length === 0 && !importDecl.getDefaultImport()) {
        importDecl.remove();
      }
    }
  }

  /**
   * Add import to file
   */
  private addImport(file: SourceFile, moduleSpecifier: string, namedImports: string[]): void {
    let importDecl = file.getImportDeclaration(
      (imp) => imp.getModuleSpecifierValue() === moduleSpecifier,
    );

    if (!importDecl) {
      importDecl = file.addImportDeclaration({
        moduleSpecifier,
      });
    }

    const existingImports = importDecl.getNamedImports().map((ni) => ni.getName());
    const missingImports = namedImports.filter((ni) => !existingImports.includes(ni));

    if (missingImports.length > 0) {
      importDecl.addNamedImports(missingImports);
    }
  }

  /**
   * Print migration summary
   */
  private printSummary(): void {
    console.log("\n📊 Migration Summary:");
    console.log(`  📄 Files processed: ${this.stats.filesProcessed}`);
    console.log(`  ✅ Files migrated: ${this.stats.filesMigrated}`);
    console.log(`  🔄 takeUntil calls replaced: ${this.stats.takeUntilCallsReplaced}`);
    console.log(`  ➕ DestroyRef properties added: ${this.stats.destroyRefPropertiesAdded}`);
    console.log(`  ➖ Destroy properties removed: ${this.stats.destroyPropertiesRemoved}`);

    if (this.stats.filesMigrated > 0) {
      console.log("\n🎉 Migration completed successfully!");
      console.log("💡 Don't forget to:");
      console.log("  1. Run your linter/formatter (eslint, prettier)");
      console.log("  2. Run your tests to ensure everything works");
      console.log("  3. Remove OnDestroy imports from @angular/core if no longer needed");
    } else {
      console.log("\n🤷 No files needed migration.");
    }
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const helpFlag = args.includes("--help") || args.includes("-h");

  if (helpFlag) {
    console.log(`
🚀 takeUntil to takeUntilDestroyed Migration Tool

Usage:
  npx ts-node takeuntil-migrator.ts [options]

Options:
  --tsconfig <path>    Path to tsconfig.json (default: ./tsconfig.json)
  --pattern <pattern>  File pattern to match (default: /**/*.+(component|directive|pipe|service).ts)
  --help, -h          Show this help message

Examples:
  npx ts-node takeuntil-migrator.ts
  npx ts-node takeuntil-migrator.ts --tsconfig ./apps/web/tsconfig.json
  npx ts-node takeuntil-migrator.ts --pattern "src/**/*.component.ts"

What this tool does:
  ✅ Converts takeUntil(this._destroy) to takeUntilDestroyed()
  ✅ Converts takeUntil(this.destroy$) to takeUntilDestroyed()
  ✅ Adds DestroyRef injection when needed
  ✅ Removes unused destroy Subject properties
  ✅ Cleans up ngOnDestroy methods when no longer needed
  ✅ Updates imports automatically

Note: Always run this on a clean git repository and test thoroughly!
    `);
    process.exit(0);
  }

  const tsconfigIndex = args.indexOf("--tsconfig");
  const patternIndex = args.indexOf("--pattern");

  const tsConfigPath =
    tsconfigIndex !== -1 && args[tsconfigIndex + 1] ? args[tsconfigIndex + 1] : "./tsconfig.json";

  const pattern =
    patternIndex !== -1 && args[patternIndex + 1]
      ? args[patternIndex + 1]
      : "/**/*.+(component|directive|pipe|service).ts";

  try {
    // Verify tsconfig exists
    readFileSync(resolve(tsConfigPath));

    const migrator = new TakeUntilMigrator(tsConfigPath);
    migrator.migrate(pattern);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.error(`❌ Error: tsconfig.json not found at ${tsConfigPath}`);
      console.error(`   Please provide a valid path with --tsconfig option`);
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error during migration:`, errorMessage);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

export { TakeUntilMigrator, MigrationStats };
