import { Project, SourceFile } from "ts-morph";
import { ASTTransformer } from "../typescript/ast-transformer";
import { MigrationConfig } from "../shared/types";

describe("TypeScript Migration Tools", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
  });

  describe("ASTTransformer", () => {
    let transformer: ASTTransformer;
    let sourceFile: SourceFile;

    beforeEach(() => {
      transformer = new ASTTransformer();
    });

    it("should find I18nService.t() calls", () => {
      const code = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

        class TestComponent {
          constructor(private i18nService: I18nService) {}

          test() {
            const message = this.i18nService.t('loginWithDevice');
            const countMessage = this.i18nService.t('itemsCount', count.toString());
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      const usages = transformer.findI18nServiceCalls(sourceFile);

      expect(usages).toHaveLength(2);
      expect(usages[0].key).toBe("loginWithDevice");
      expect(usages[0].method).toBe("t");
      expect(usages[1].key).toBe("itemsCount");
      expect(usages[1].parameters).toEqual(["count.toString()"]);
    });

    it("should transform I18nService.t() to $localize but keep import due to constructor usage", () => {
      const code = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

        class TestComponent {
          constructor(private i18nService: I18nService) {}

          test() {
            const message = this.i18nService.t('loginWithDevice');
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      const result = transformer.transformI18nServiceCalls(sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1); // Only transformation, import kept due to constructor usage
      expect(result.changes[0].replacement).toBe("$localize`loginWithDevice`");
      expect(sourceFile.getFullText()).toContain("$localize`loginWithDevice`");
      expect(sourceFile.getFullText()).toContain("I18nService"); // Import should still be there
    });

    it("should handle parameters in I18nService.t() calls", () => {
      const code = `
        class TestComponent {
          test() {
            const message = this.i18nService.t('itemsCount', count.toString());
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      const result = transformer.transformI18nServiceCalls(sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes[0].replacement).toBe(
        "$localize`itemsCount\${count.toString()}:param0:`",
      );
    });

    it("should handle files without I18nService usage", () => {
      const code = `
        import { Component } from '@angular/core';

        @Component({})
        class TestComponent {
          test() {
            console.log('no i18n here');
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      const result = transformer.transformI18nServiceCalls(sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(0);
    });

    it("should remove I18nService import when no longer used", () => {
      const code = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';
        import { Component } from '@angular/core';

        @Component({})
        class TestComponent {
          test() {
            const message = this.i18nService.t('loginWithDevice');
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      const result = transformer.transformI18nServiceCalls(sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(2); // One for transformation, one for import removal
      expect(sourceFile.getFullText()).not.toContain("I18nService");
    });
  });

  describe("Integration Tests", () => {
    it("should handle complex transformation scenarios", () => {
      const transformer = new ASTTransformer();
      const code = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';
        import { Component } from '@angular/core';

        @Component({})
        class TestComponent {
          constructor(private i18nService: I18nService) {}

          getMessage() {
            return this.i18nService.t('simpleMessage');
          }

          getParameterizedMessage(count: number) {
            return this.i18nService.t('itemCount', count.toString());
          }

          getMultipleMessages() {
            const msg1 = this.i18nService.t('message1');
            const msg2 = this.i18nService.t('message2', 'param');
            return [msg1, msg2];
          }
        }
      `;

      const sourceFile = project.createSourceFile("complex-test.ts", code);
      const result = transformer.transformI18nServiceCalls(sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBe(4); // 4 transformations, no import removal due to constructor

      const transformedCode = sourceFile.getFullText();
      expect(transformedCode).toContain("$localize`simpleMessage`");
      expect(transformedCode).toContain("$localize`itemCount\${count.toString()}:param0:`");
      expect(transformedCode).toContain("$localize`message1`");
      expect(transformedCode).toContain("$localize`message2\${'param'}:param0:`");

      // Should keep the I18nService import due to constructor usage
      expect(transformedCode).toContain("I18nService");
    });

    it("should remove import when only method calls are used (no constructor)", () => {
      const transformer = new ASTTransformer();
      const code = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

        class TestComponent {
          test() {
            const message = this.i18nService.t('testMessage');
          }
        }
      `;

      const sourceFile = project.createSourceFile("no-constructor-test.ts", code);
      const result = transformer.transformI18nServiceCalls(sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBe(2); // 1 transformation + 1 import removal

      const transformedCode = sourceFile.getFullText();
      expect(transformedCode).toContain("$localize`testMessage`");
      expect(transformedCode).not.toContain("I18nService");
    });
  });
});
