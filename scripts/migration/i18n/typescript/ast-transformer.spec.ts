import { Project, SourceFile } from "ts-morph";

import { ASTTransformer } from "./ast-transformer";

describe("ASTTransformer", () => {
  let project: Project;
  let transformer: ASTTransformer;
  let sourceFile: SourceFile;

  beforeEach(async () => {
    project = new Project({
      useInMemoryFileSystem: true,
    });
    transformer = new ASTTransformer();

    // Initialize with mock translations for testing
    await transformer.initialize();

    // Mock the translation lookup to return predictable results for tests
    const mockTranslationEntries: Record<string, any> = {
      loginWithDevice: { message: "loginWithDevice" },
      itemsCount: {
        message: "itemsCount $COUNT$",
        placeholders: {
          count: { content: "$1" },
        },
      },
      testMessage: { message: "testMessage" },
      simpleMessage: { message: "simpleMessage" },
      itemCount: {
        message: "itemCount $COUNT$",
        placeholders: {
          count: { content: "$1" },
        },
      },
      message1: { message: "message1" },
      message2: {
        message: "message2 $PARAM$",
        placeholders: {
          param: { content: "$1" },
        },
      },
    };

    jest
      .spyOn(transformer["translationLookup"], "getTranslation")
      .mockImplementation((key: string) => {
        return mockTranslationEntries[key]?.message || null;
      });

    jest
      .spyOn(transformer["translationLookup"], "getTranslationEntry")
      .mockImplementation((key: string) => {
        return mockTranslationEntries[key] || null;
      });

    jest
      .spyOn(transformer["translationLookup"], "hasTranslation")
      .mockImplementation((key: string) => {
        return key in mockTranslationEntries;
      });
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
          const message = $localize\`:@@loginWithDevice:loginWithDevice\`;
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
          const message = $localize\`:@@itemsCount:itemsCount \${count.toString()}:count:\`;
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
          const message = $localize\`:@@loginWithDevice:loginWithDevice\`;
        }
      }
    `;

    sourceFile = project.createSourceFile("test.ts", code);
    transformer.transformI18nServiceCalls(sourceFile);

    expect(sourceFile.getFullText().trim()).toBe(expected.trim());
  });

  it("should handle complex transformation scenarios", () => {
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
          return $localize\`:@@simpleMessage:simpleMessage\`;
        }

        getParameterizedMessage(count: number) {
          return $localize\`:@@itemCount:itemCount \${count.toString()}:count:\`;
        }

        getMultipleMessages() {
          const msg1 = $localize\`:@@message1:message1\`;
          const msg2 = $localize\`:@@message2:message2 \${'param'}:param:\`;
          return [msg1, msg2];
        }
      }
    `;

    sourceFile = project.createSourceFile("complex-test.ts", code);
    transformer.transformI18nServiceCalls(sourceFile);

    expect(sourceFile.getFullText().trim()).toBe(expected.trim());
  });

  it("should remove import when only method calls are used (no constructor)", () => {
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
          const message = $localize\`:@@testMessage:testMessage\`;
        }
      }
    `;

    sourceFile = project.createSourceFile("no-constructor-test.ts", code);
    transformer.transformI18nServiceCalls(sourceFile);

    expect(sourceFile.getFullText().trim()).toBe(expected.trim());
  });

  it("should use translation lookup to generate proper $localize calls with actual text", () => {
    const code = `
      class TestComponent {
        test() {
          const message = this.i18nService.t('loginWithDevice');
        }
      }
    `;

    const expected = `
      class TestComponent {
        test() {
          const message = $localize\`:@@loginWithDevice:loginWithDevice\`;
        }
      }
    `;

    sourceFile = project.createSourceFile("translation-lookup-test.ts", code);
    transformer.transformI18nServiceCalls(sourceFile);

    expect(sourceFile.getFullText().trim()).toBe(expected.trim());
  });

  it("should handle parameter substitution with translation lookup", () => {
    // Mock translation with parameter placeholder in $VAR$ format
    const mockTranslationEntry = {
      message: "Items: $COUNT$",
      placeholders: {
        count: { content: "$1" },
      },
    };
    jest
      .spyOn(transformer["translationLookup"], "getTranslationEntry")
      .mockReturnValue(mockTranslationEntry);
    jest.spyOn(transformer["translationLookup"], "hasTranslation").mockReturnValue(true);

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
          const message = $localize\`:@@itemsCount:Items: \${count.toString()}:count:\`;
        }
      }
    `;

    sourceFile = project.createSourceFile("param-translation-test.ts", code);
    transformer.transformI18nServiceCalls(sourceFile);

    expect(sourceFile.getFullText().trim()).toBe(expected.trim());
  });

  it("should fallback to key when translation is not found", () => {
    const code = `
      class TestComponent {
        test() {
          const message = this.i18nService.t('unknownKey');
        }
      }
    `;

    const expected = `
      class TestComponent {
        test() {
          const message = $localize\`:@@unknownKey:unknownKey\`;
        }
      }
    `;

    sourceFile = project.createSourceFile("fallback-test.ts", code);
    const result = transformer.transformI18nServiceCalls(sourceFile);

    expect(sourceFile.getFullText().trim()).toBe(expected.trim());
    expect(result.errors).toContain("Warning: No translation found for key 'unknownKey' at line 4");
  });
});
