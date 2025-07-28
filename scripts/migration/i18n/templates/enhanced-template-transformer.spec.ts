import { TranslationLookup } from "../shared/translation-lookup";

import { EnhancedTemplateTransformer } from "./enhanced-template-transformer";

describe("EnhancedTemplateTransformer", () => {
  let transformer: EnhancedTemplateTransformer;
  let mockTranslationLookup: jest.Mocked<TranslationLookup>;

  beforeEach(() => {
    // Create mock translation lookup
    mockTranslationLookup = {
      loadTranslations: jest.fn(),
      getTranslation: jest.fn(),
      getTranslationOrKey: jest.fn(),
      hasTranslation: jest.fn(),
      getAllKeys: jest.fn(),
      getStats: jest.fn(),
      search: jest.fn(),
      validateKeys: jest.fn(),
      getSuggestions: jest.fn(),
    } as any;

    transformer = new EnhancedTemplateTransformer(mockTranslationLookup);
  });

  describe("transformTemplate with real translations", () => {
    beforeEach(() => {
      // Setup mock translations
      mockTranslationLookup.getTranslation.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          welcome: "Welcome to Bitwarden",
          login: "Log in",
          password: "Password",
          clickMe: "Click me",
          buttonText: "Submit",
          appTitle: "Bitwarden Password Manager",
          description: "Secure your digital life",
        };
        return translations[key] || null;
      });

      mockTranslationLookup.hasTranslation.mockImplementation((key: string) => {
        return [
          "welcome",
          "login",
          "password",
          "clickMe",
          "buttonText",
          "appTitle",
          "description",
        ].includes(key);
      });
    });

    it("should transform interpolation with real translation values", () => {
      const template = `<h1>{{ 'welcome' | i18n }}</h1>`;
      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);

      // Apply the transformation
      let transformedContent = template;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      expect(transformedContent).toBe(
        `<h1><span i18n="@@welcome">Welcome to Bitwarden</span></h1>`,
      );
    });

    it("should transform attribute binding with real translation values", () => {
      const template = `<button [title]="'clickMe' | i18n">Click</button>`;
      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);

      // Apply the transformation
      let transformedContent = template;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      expect(transformedContent).toBe(
        `<button [title]="Click me" i18n-title="@@click-me">Click</button>`,
      );
    });

    it("should handle missing translations gracefully", () => {
      const template = `<h1>{{ 'missingKey' | i18n }}</h1>`;
      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Translation not found for key: missingKey");

      // Apply the transformation
      let transformedContent = template;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      // Should fall back to using the key as display text
      expect(transformedContent).toBe(`<h1><span i18n="@@missing-key">missingKey</span></h1>`);
    });

    it("should transform complex template with multiple translations", () => {
      const template = `
        <div>
          <h1>{{ 'appTitle' | i18n }}</h1>
          <p>{{ 'description' | i18n }}</p>
          <button [title]="'clickMe' | i18n">{{ 'buttonText' | i18n }}</button>
        </div>
      `;
      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);

      // Apply the transformations
      let transformedContent = template;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      expect(transformedContent).toContain(
        '<span i18n="@@app-title">Bitwarden Password Manager</span>',
      );
      expect(transformedContent).toContain(
        '<span i18n="@@description">Secure your digital life</span>',
      );
      expect(transformedContent).toContain('[title]="Click me" i18n-title="@@click-me"');
      expect(transformedContent).toContain('<span i18n="@@button-text">Submit</span>');
    });

    it("should generate enhanced replacement descriptions", () => {
      const template = `<h1>{{ 'welcome' | i18n }}</h1>`;
      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].description).toContain("with real translation");
    });
  });

  describe("generateMissingTranslationsReport", () => {
    beforeEach(() => {
      // Mock file system for testing
      const fs = require("fs");
      jest.spyOn(fs, "readFileSync").mockImplementation((filePath: any) => {
        if (filePath.includes("template1.html")) {
          return `<h1>{{ 'welcome' | i18n }}</h1><p>{{ 'missingKey1' | i18n }}</p>`;
        }
        if (filePath.includes("template2.html")) {
          return `<button [title]="'login' | i18n">{{ 'missingKey2' | i18n }}</button>`;
        }
        return "";
      });

      mockTranslationLookup.hasTranslation.mockImplementation((key: string) => {
        return ["welcome", "login"].includes(key);
      });

      mockTranslationLookup.getTranslation.mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          welcome: "Welcome",
          login: "Log in",
        };
        return translations[key] || null;
      });

      mockTranslationLookup.getSuggestions.mockImplementation((key: string) => {
        if (key === "missingKey1") {
          return [{ key: "welcome", message: "Welcome", similarity: 0.5 }];
        }
        return [];
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should generate report of missing translations", () => {
      const templateFiles = ["template1.html", "template2.html"];
      const report = transformer.generateMissingTranslationsReport(templateFiles);

      expect(report).toContain("Missing Translations Report");
      expect(report).toContain("**Total unique keys found**: 4");
      expect(report).toContain("**Keys with translations**: 2");
      expect(report).toContain("**Missing translations**: 2");
      expect(report).toContain("**Coverage**: 50.0%");
      expect(report).toContain("Missing Translation Keys");
      expect(report).toContain("Keys with Translations");
      expect(report).toContain("missingKey1");
      expect(report).toContain("missingKey2");
      expect(report).toContain("Suggestions");
    });
  });

  describe("initialization", () => {
    it("should initialize with translation data", async () => {
      await transformer.initialize("./combined-translations.json");

      expect(mockTranslationLookup.loadTranslations).toHaveBeenCalledWith(
        "./combined-translations.json",
      );
    });

    it("should initialize without specific path", async () => {
      await transformer.initialize();

      expect(mockTranslationLookup.loadTranslations).toHaveBeenCalledWith(undefined);
    });
  });

  describe("validation", () => {
    it("should validate transformations correctly", () => {
      const original = `<h1>{{ 'test' | i18n }}</h1>`;
      const validTransformed = `<h1><span i18n="@@test">Test Message</span></h1>`;
      const invalidTransformed = `<h1><span i18n="invalid">Test Message</span></h1>`;

      expect(transformer.validateTransformation(original, validTransformed)).toBe(true);
      expect(transformer.validateTransformation(original, invalidTransformed)).toBe(false);
    });
  });

  describe("getTranslationLookup", () => {
    it("should return the translation lookup service", () => {
      const lookup = transformer.getTranslationLookup();
      expect(lookup).toBe(mockTranslationLookup);
    });
  });
});
