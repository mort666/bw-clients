import { Project, SourceFile } from "ts-morph";

import { ASTTransformer } from "../typescript/ast-transformer";

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

      const expected = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';

        class TestComponent {
          constructor(private i18nService: I18nService) {}

          test() {
            const message = $localize\`loginWithDevice\`;
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      transformer.transformI18nServiceCalls(sourceFile);

      expect(sourceFile.getFullText().trim()).toBe(expected.trim());
    });

    it("should handle parameters in I18nService.t() calls", () => {
      const code = `
        class TestComponent {
          test() {
            const message = this.i18nService.t('itemsCount', count.toString());
          }
        }
      `;

      const expected = `
        class TestComponent {
          test() {
            const message = $localize\`itemsCount\${count.toString()}:param0:\`;
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      transformer.transformI18nServiceCalls(sourceFile);

      expect(sourceFile.getFullText().trim()).toBe(expected.trim());
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

      const expected = `
        import { Component } from '@angular/core';

        @Component({})
        class TestComponent {
          test() {
            console.log('no i18n here');
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      transformer.transformI18nServiceCalls(sourceFile);

      expect(sourceFile.getFullText().trim()).toBe(expected.trim());
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

      const expected = `
        import { Component } from '@angular/core';

        @Component({})
        class TestComponent {
          test() {
            const message = $localize\`loginWithDevice\`;
          }
        }
      `;

      sourceFile = project.createSourceFile("test.ts", code);
      transformer.transformI18nServiceCalls(sourceFile);

      expect(sourceFile.getFullText().trim()).toBe(expected.trim());
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

      const expected = `
        import { I18nService } from '@bitwarden/common/platform/services/i18n.service';
        import { Component } from '@angular/core';

        @Component({})
        class TestComponent {
          constructor(private i18nService: I18nService) {}

          getMessage() {
            return $localize\`simpleMessage\`;
          }

          getParameterizedMessage(count: number) {
            return $localize\`itemCount\${count.toString()}:param0:\`;
          }

          getMultipleMessages() {
            const msg1 = $localize\`message1\`;
            const msg2 = $localize\`message2\${'param'}:param0:\`;
            return [msg1, msg2];
          }
        }
      `;

      const sourceFile = project.createSourceFile("complex-test.ts", code);
      transformer.transformI18nServiceCalls(sourceFile);

      expect(sourceFile.getFullText().trim()).toBe(expected.trim());
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

      const expected = `
        class TestComponent {
          test() {
            const message = $localize\`testMessage\`;
          }
        }
      `;

      const sourceFile = project.createSourceFile("no-constructor-test.ts", code);
      transformer.transformI18nServiceCalls(sourceFile);

      expect(sourceFile.getFullText().trim()).toBe(expected.trim());
    });
  });
});
