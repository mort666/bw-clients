import { Project } from "ts-morph";

import { TakeUntilMigrator } from "../takeuntil-migrator";

describe("TakeUntilMigrator Unit Tests", () => {
  let project: Project;
  let migrator: TakeUntilMigrator;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // Latest target
        lib: ["es2022"],
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    });

    // Create a mock tsconfig
    project.createSourceFile(
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      }),
    );

    migrator = new TakeUntilMigrator("tsconfig.json");
    // Override the project to use our in-memory one
    (migrator as any).project = project;
  });

  describe("isAngularClass", () => {
    test("should identify Component classes", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {}
      `,
      );

      const clazz = file.getClasses()[0];
      const isAngular = (migrator as any).isAngularClass(clazz);

      expect(isAngular).toBe(true);
    });

    test("should identify Directive classes", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Directive } from '@angular/core';

        @Directive({ selector: '[test]' })
        export class TestDirective {}
      `,
      );

      const clazz = file.getClasses()[0];
      const isAngular = (migrator as any).isAngularClass(clazz);

      expect(isAngular).toBe(true);
    });

    test("should identify Injectable classes", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class TestService {}
      `,
      );

      const clazz = file.getClasses()[0];
      const isAngular = (migrator as any).isAngularClass(clazz);

      expect(isAngular).toBe(true);
    });

    test("should not identify regular classes", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        export class RegularClass {}
      `,
      );

      const clazz = file.getClasses()[0];
      const isAngular = (migrator as any).isAngularClass(clazz);

      expect(isAngular).toBe(false);
    });
  });

  describe("findTakeUntilPatterns", () => {
    test("should find takeUntil patterns with various destroy property names", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();
          private destroy$ = new Subject();
          private _destroy = new Subject();

          ngOnInit() {
            stream1$.pipe(takeUntil(this._destroy$)).subscribe();
            stream2$.pipe(takeUntil(this.destroy$)).subscribe();
            stream3$.pipe(takeUntil(this._destroy)).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(3);
      expect(patterns.map((p: any) => p.destroyProperty)).toEqual([
        "_destroy$",
        "destroy$",
        "_destroy",
      ]);
    });

    test("should detect constructor context", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();

          constructor() {
            stream$.pipe(takeUntil(this._destroy$)).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].withinConstructor).toBe(true);
      expect(patterns[0].withinMethod).toBe(false);
    });

    test("should detect method context", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();

          ngOnInit() {
            stream$.pipe(takeUntil(this._destroy$)).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].withinConstructor).toBe(false);
      expect(patterns[0].withinMethod).toBe(true);
    });

    test("should ignore non-matching takeUntil calls", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          ngOnInit() {
            stream1$.pipe(takeUntil(someOtherStream$)).subscribe();
            stream2$.pipe(takeUntil(this.notADestroyProperty)).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(0);
    });
  });

  describe("hasDestroyRefProperty", () => {
    test("should detect existing destroyRef property", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {
          private destroyRef = inject(DestroyRef);
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const hasDestroyRef = (migrator as any).hasDestroyRefProperty(clazz);

      expect(hasDestroyRef).toBe(true);
    });

    test("should return false when no destroyRef property exists", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {
          private someOtherProperty = 'value';
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const hasDestroyRef = (migrator as any).hasDestroyRefProperty(clazz);

      expect(hasDestroyRef).toBe(false);
    });
  });

  describe("canRemoveDestroyProperty", () => {
    test("should allow removal when only used in takeUntil and ngOnDestroy", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();

          ngOnInit() {
            stream$.pipe(takeUntil(this._destroy$)).subscribe();
          }

          ngOnDestroy() {
            this._destroy$.next();
            this._destroy$.complete();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const canRemove = (migrator as any).canRemoveDestroyProperty(clazz, "_destroy$");

      expect(canRemove).toBe(true);
    });

    test("should prevent removal when used elsewhere", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();

          ngOnInit() {
            stream$.pipe(takeUntil(this._destroy$)).subscribe();
            this.customMethod(this._destroy$);
          }

          customMethod(subject: Subject) {
            // Custom usage
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const canRemove = (migrator as any).canRemoveDestroyProperty(clazz, "_destroy$");

      expect(canRemove).toBe(false);
    });
  });

  describe("Import Management", () => {
    test("should add Angular imports correctly", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {}
      `,
      );

      (migrator as any).addImport(file, "@angular/core", ["inject", "DestroyRef"]);

      const content = file.getFullText();
      expect(content).toContain("inject, DestroyRef");
    });

    test("should add new import declaration when module not imported", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {}
      `,
      );

      (migrator as any).addImport(file, "@angular/core/rxjs-interop", ["takeUntilDestroyed"]);

      const content = file.getFullText();
      expect(content).toContain("@angular/core/rxjs-interop");
      expect(content).toContain("takeUntilDestroyed");
    });

    test("should not duplicate existing imports", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component, inject } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {}
      `,
      );

      (migrator as any).addImport(file, "@angular/core", ["inject", "DestroyRef"]);

      const content = file.getFullText();

      // Should have inject in imports only (no duplication)
      const injectMatches = content.match(/inject/g);
      expect(injectMatches?.length).toBe(1); // Only in import, not duplicated

      // Should have DestroyRef added to imports
      expect(content).toContain("DestroyRef");
      expect(content).toMatch(/import\s*{\s*[^}]*DestroyRef[^}]*}\s*from\s*['"]@angular\/core['"]/);
    });
  });

  describe("DestroyRef Property Addition", () => {
    test("should add destroyRef property with correct syntax", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {
          private existingProperty = 'value';
        }
      `,
      );

      const clazz = file.getClasses()[0];
      (migrator as any).addDestroyRefProperty(clazz);

      const content = file.getFullText();
      expect(content).toContain("private readonly destroyRef = inject(DestroyRef)");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle files without classes", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        export const someConstant = 'value';
        export function someFunction() {}
      `,
      );

      expect(() => {
        (migrator as any).processFile(file);
      }).not.toThrow();
    });

    test("should handle classes without decorators", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        export class RegularClass {
          method() {}
        }
      `,
      );

      expect(() => {
        (migrator as any).processFile(file);
      }).not.toThrow();
    });

    test("should handle empty takeUntil calls", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {
          method() {
            stream$.pipe(takeUntil()).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(0);
    });

    test("should handle takeUntil with multiple arguments", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';

        @Component({ selector: 'test' })
        export class TestComponent {
          method() {
            stream$.pipe(takeUntil(this._destroy$, 'extraArg')).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(0);
    });
  });

  describe("Context Detection Edge Cases", () => {
    test("should handle nested constructor calls", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();

          constructor() {
            this.setupStreams();
          }

          private setupStreams() {
            stream$.pipe(takeUntil(this._destroy$)).subscribe();
          }
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].withinConstructor).toBe(false);
      expect(patterns[0].withinMethod).toBe(true);
    });

    test("should handle property initializers", () => {
      const file = project.createSourceFile(
        "test.ts",
        `
        import { Component } from '@angular/core';
        import { takeUntil } from 'rxjs/operators';

        @Component({ selector: 'test' })
        export class TestComponent {
          private _destroy$ = new Subject();

          private subscription = stream$.pipe(takeUntil(this._destroy$)).subscribe();
        }
      `,
      );

      const clazz = file.getClasses()[0];
      const patterns = (migrator as any).findTakeUntilPatterns(clazz);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].withinConstructor).toBe(false);
      expect(patterns[0].withinMethod).toBe(false);
    });
  });
});
