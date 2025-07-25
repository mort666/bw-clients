import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

import { TakeUntilMigrator } from "../takeuntil-migrator";

describe("TakeUntilMigrator Integration Tests", () => {
  const fixturesDir = join(__dirname, "fixtures");
  const tempDir = join(__dirname, "temp");
  const tsConfigPath = join(fixturesDir, "tsconfig.json");

  beforeEach(() => {
    // Create temp directory for test files
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });

    // Copy fixtures to temp directory for testing
    copyFixturesToTemp();
  });

  afterEach(() => {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function copyFixturesToTemp() {
    const srcDir = join(fixturesDir, "src");
    const tempSrcDir = join(tempDir, "src");
    mkdirSync(tempSrcDir, { recursive: true });

    // Copy all fixture files
    const fixtureFiles = [
      "basic.component.ts",
      "multiple-takeuntil.component.ts",
      "example.directive.ts",
      "data.service.ts",
      "complex-ondestroy.component.ts",
      "mixed-usage.component.ts",
      "regular-class.ts",
      "already-migrated.component.ts",
    ];

    fixtureFiles.forEach((file) => {
      const srcPath = join(srcDir, file);
      const destPath = join(tempSrcDir, file);
      if (existsSync(srcPath)) {
        writeFileSync(destPath, readFileSync(srcPath, "utf8"));
      }
    });

    // Copy tsconfig
    writeFileSync(
      join(tempDir, "tsconfig.json"),
      readFileSync(tsConfigPath, "utf8")
        .replace(/\.\/src/g, "./src")
        .replace(/"baseUrl": "\."/, `"baseUrl": "${tempDir}"`),
    );
  }

  function readTempFile(fileName: string): string {
    return readFileSync(join(tempDir, "src", fileName), "utf8");
  }

  describe("Basic Migration Scenarios", () => {
    test("should migrate basic takeUntil pattern", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/basic.component.ts");

      expect(stats.filesProcessed).toBe(1);
      expect(stats.filesMigrated).toBe(1);
      expect(stats.takeUntilCallsReplaced).toBe(1);
      expect(stats.destroyPropertiesRemoved).toBe(1);

      const migratedContent = readTempFile("basic.component.ts");

      // Should add imports
      expect(migratedContent).toContain("inject, DestroyRef");
      expect(migratedContent).toContain("import { takeUntilDestroyed }");

      // Should add destroyRef property
      expect(migratedContent).toContain("private readonly destroyRef = inject(DestroyRef)");

      // Should replace takeUntil call
      expect(migratedContent).toContain("takeUntilDestroyed(this.destroyRef)");

      // Should remove destroy property
      expect(migratedContent).not.toContain("_destroy$ = new Subject<void>()");

      // Should remove ngOnDestroy
      expect(migratedContent).not.toContain("ngOnDestroy");
      expect(migratedContent).not.toContain("OnDestroy");
    });

    test("should handle multiple takeUntil patterns in one class", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/multiple-takeuntil.component.ts");

      expect(stats.filesProcessed).toBe(1);
      expect(stats.filesMigrated).toBe(1);
      expect(stats.takeUntilCallsReplaced).toBe(4);
      expect(stats.destroyPropertiesRemoved).toBe(2);

      const migratedContent = readTempFile("multiple-takeuntil.component.ts");

      // Constructor usage should be takeUntilDestroyed()
      expect(migratedContent).toContain("this.stream1$.pipe(takeUntilDestroyed()).subscribe()");

      // Method usage should be takeUntilDestroyed(this.destroyRef)
      expect(migratedContent).toContain(
        "this.stream2$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe()",
      );
      expect(migratedContent).toContain(
        "this.stream3$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe()",
      );
      expect(migratedContent).toContain(
        "this.stream4$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe()",
      );

      // Should remove both destroy properties
      expect(migratedContent).not.toContain("destroy$ = new Subject<void>()");
      expect(migratedContent).not.toContain("_destroy = new Subject<void>()");
    });

    test("should migrate directives", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/example.directive.ts");

      expect(stats.filesMigrated).toBe(1);

      const migratedContent = readTempFile("example.directive.ts");
      expect(migratedContent).toContain("takeUntilDestroyed(this.destroyRef)");
      expect(migratedContent).toContain("private readonly destroyRef = inject(DestroyRef)");
    });

    test("should migrate services", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/data.service.ts");

      expect(stats.filesMigrated).toBe(1);

      const migratedContent = readTempFile("data.service.ts");
      expect(migratedContent).toContain("takeUntilDestroyed(this.destroyRef)"); // Method needs explicit destroyRef
      expect(migratedContent).not.toContain("destroy$ = new Subject<void>()");
    });
  });

  describe("Complex Scenarios", () => {
    test("should preserve complex ngOnDestroy logic", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/complex-ondestroy.component.ts");

      expect(stats.filesMigrated).toBe(1);

      const migratedContent = readTempFile("complex-ondestroy.component.ts");

      // Should migrate takeUntil
      expect(migratedContent).toContain("takeUntilDestroyed(this.destroyRef)");

      // Should remove destroy property since it's only used for takeUntil
      expect(migratedContent).not.toContain("_destroy$ = new Subject<void>()");

      // Should preserve ngOnDestroy because it has other logic
      expect(migratedContent).toContain("ngOnDestroy");
      expect(migratedContent).toContain("cleanupResources()");
      expect(migratedContent).toContain("saveState()");

      // Should remove only the destroy subject calls
      expect(migratedContent).not.toContain("this._destroy$.next()");
      expect(migratedContent).not.toContain("this._destroy$.complete()");
    });

    test("should preserve destroy properties used elsewhere", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/mixed-usage.component.ts");

      expect(stats.filesMigrated).toBe(1);
      expect(stats.destroyPropertiesRemoved).toBe(0); // Should not remove the property

      const migratedContent = readTempFile("mixed-usage.component.ts");

      // Should migrate takeUntil calls
      expect(migratedContent).toContain("takeUntilDestroyed(this.destroyRef)");

      // Should preserve destroy property because it's used elsewhere
      expect(migratedContent).toContain("_destroy$ = new Subject<void>()");

      // Should preserve ngOnDestroy
      expect(migratedContent).toContain("ngOnDestroy");
    });

    test("should not migrate non-Angular classes", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/regular-class.ts");

      expect(stats.filesMigrated).toBe(0);
      expect(stats.takeUntilCallsReplaced).toBe(0);

      const content = readTempFile("regular-class.ts");

      // Should remain unchanged
      expect(content).toContain("takeUntil(this._destroy$)");
      expect(content).toContain("_destroy$ = new Subject<void>()");
      expect(content).not.toContain("takeUntilDestroyed");
    });

    test("should not modify already migrated files", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const originalContent = readTempFile("already-migrated.component.ts");

      const stats = migrator.migrate("**/already-migrated.component.ts");

      expect(stats.filesMigrated).toBe(0);

      const content = readTempFile("already-migrated.component.ts");
      expect(content).toBe(originalContent);
    });
  });

  describe("Import Management", () => {
    test("should add required imports", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      migrator.migrate("**/basic.component.ts");

      const migratedContent = readTempFile("basic.component.ts");

      expect(migratedContent).toContain("inject, DestroyRef");
      expect(migratedContent).toContain('from "@angular/core"');
      expect(migratedContent).toContain("takeUntilDestroyed");
      expect(migratedContent).toContain('from "@angular/core/rxjs-interop"');
    });

    test("should remove unused RxJS imports", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      migrator.migrate("**/basic.component.ts");

      const migratedContent = readTempFile("basic.component.ts");

      // Should remove Subject import since it's no longer used
      expect(migratedContent).not.toContain("Subject");
      expect(migratedContent).not.toContain('from "rxjs"');
    });

    test("should preserve RxJS imports when still needed", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      migrator.migrate("**/mixed-usage.component.ts");

      const migratedContent = readTempFile("mixed-usage.component.ts");

      // Should keep Subject import because it's still used
      expect(migratedContent).toContain("Subject");
      expect(migratedContent).toContain('from "rxjs"');
    });
  });

  describe("Pattern Matching", () => {
    test("should process files matching pattern", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/**/*.component.ts");

      expect(stats.filesProcessed).toBeGreaterThan(0);
      expect(stats.filesMigrated).toBeGreaterThan(0);
    });

    test("should handle custom file patterns", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/**/*.service.ts");

      expect(stats.filesProcessed).toBe(1); // Only data.service.ts
      expect(stats.filesMigrated).toBe(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid tsconfig path", () => {
      expect(() => {
        new TakeUntilMigrator("/non/existent/tsconfig.json");
      }).toThrow();
    });

    test("should handle files with syntax errors gracefully", () => {
      // Create a file with syntax errors
      const invalidFile = join(tempDir, "src", "invalid.component.ts");
      writeFileSync(
        invalidFile,
        `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-invalid'
        })
        export class InvalidComponent {
          // Missing closing brace
      `,
      );

      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));

      // Should not throw, but gracefully handle the error
      expect(() => {
        migrator.migrate("**/invalid.component.ts");
      }).not.toThrow();
    });
  });

  describe("Statistics Reporting", () => {
    test("should provide accurate migration statistics", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      const stats = migrator.migrate("**/**/*.ts");

      expect(stats.filesProcessed).toBeGreaterThan(0);
      expect(stats.filesMigrated).toBeGreaterThan(0);
      expect(stats.takeUntilCallsReplaced).toBeGreaterThan(0);
      expect(stats.destroyPropertiesRemoved).toBeGreaterThan(0);
      expect(stats.destroyRefPropertiesAdded).toBeGreaterThan(0);

      // Validate that stats make logical sense
      expect(stats.filesMigrated).toBeLessThanOrEqual(stats.filesProcessed);
      expect(stats.takeUntilCallsReplaced).toBeGreaterThanOrEqual(stats.filesMigrated);
    });
  });

  describe("File System Integration", () => {
    test("should save files correctly", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));
      migrator.migrate("**/basic.component.ts");

      // File should exist and be readable
      const filePath = join(tempDir, "src", "basic.component.ts");
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, "utf8");
      expect(content).toContain("takeUntilDestroyed");
    });

    test("should handle file permissions correctly", () => {
      const migrator = new TakeUntilMigrator(join(tempDir, "tsconfig.json"));

      // This should not throw even if there are permission issues
      expect(() => {
        migrator.migrate("**/basic.component.ts");
      }).not.toThrow();
    });
  });
});
