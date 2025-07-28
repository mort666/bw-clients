import { TemplateParser } from "../templates/template-parser";
import { TemplateTransformer } from "../templates/template-transformer";

describe("Template Migration Tools", () => {
  describe("TemplateParser", () => {
    let parser: TemplateParser;

    beforeEach(() => {
      parser = new TemplateParser();
    });

    it("should find i18n pipe usage in interpolations", () => {
      const template = `
        <div>
          <h1>{{ 'welcome' | i18n }}</h1>
          <p>{{ 'itemCount' | i18n:count }}</p>
        </div>
      `;

      const usages = parser.findI18nPipeUsage(template, "test.html");

      expect(usages).toHaveLength(2);
      expect(usages[0].key).toBe("welcome");
      expect(usages[0].method).toBe("pipe");
      expect(usages[1].key).toBe("itemCount");
      expect(usages[1].parameters).toEqual(["count"]);
    });

    it("should find i18n pipe usage in attributes", () => {
      const template = `
        <button [title]="'clickMe' | i18n">
          Click
        </button>
        <input placeholder="{{ 'enterText' | i18n }}">
      `;

      const usages = parser.findI18nPipeUsage(template, "test.html");

      expect(usages).toHaveLength(2);
      expect(usages[0].key).toBe("clickMe");
      expect(usages[1].key).toBe("enterText");
    });

    it("should handle templates without i18n pipe usage", () => {
      const template = `
        <div>
          <h1>Static Text</h1>
          <p>{{ someVariable }}</p>
        </div>
      `;

      const usages = parser.findI18nPipeUsage(template, "test.html");

      expect(usages).toHaveLength(0);
    });

    it("should handle malformed templates gracefully", () => {
      const template = `
        <div>
          <h1>{{ 'test' | i18n
          <p>Incomplete template
      `;

      // Should not throw an error
      const usages = parser.findI18nPipeUsage(template, "test.html");

      // May or may not find usages depending on parser robustness
      expect(Array.isArray(usages)).toBe(true);
    });
  });

  describe("TemplateTransformer", () => {
    let transformer: TemplateTransformer;

    beforeEach(() => {
      transformer = new TemplateTransformer();
    });

    it("should transform simple interpolation to i18n attribute", () => {
      const template = `<h1>{{ 'welcome' | i18n }}</h1>`;

      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].replacement).toContain('i18n="@@welcome"');
      expect(result.changes[0].replacement).toContain("<span");
    });

    it("should transform attribute with i18n pipe", () => {
      const template = `<button [title]="'clickMe' | i18n">Click</button>`;

      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].replacement).toContain('i18n-title="@@click-me"');
    });

    it("should handle multiple i18n pipe usages", () => {
      const template = `
        <div>
          <h1>{{ 'title' | i18n }}</h1>
          <p>{{ 'description' | i18n }}</p>
          <button [title]="'buttonTitle' | i18n">{{ 'buttonText' | i18n }}</button>
        </div>
      `;

      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it("should generate proper i18n IDs from keys", () => {
      const template = `{{ 'camelCaseKey' | i18n }}`;

      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes[0].replacement).toContain("@@camel-case-key");
    });

    it("should handle templates without i18n pipes", () => {
      const template = `
        <div>
          <h1>Static Title</h1>
          <p>{{ someVariable }}</p>
        </div>
      `;

      const result = transformer.transformTemplate(template, "test.html");

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(0);
    });

    it("should validate transformations", () => {
      const original = `<h1>{{ 'test' | i18n }}</h1>`;
      const validTransformed = `<h1><span i18n="@@test">test</span></h1>`;
      const invalidTransformed = `<h1><span i18n="invalid">test</span></h1>`;

      expect(transformer.validateTransformation(original, validTransformed)).toBe(true);
      expect(transformer.validateTransformation(original, invalidTransformed)).toBe(false);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complex template transformation", () => {
      const transformer = new TemplateTransformer();
      const template = `
        <div class="container">
          <header>
            <h1>{{ 'appTitle' | i18n }}</h1>
            <nav>
              <a [title]="'homeLink' | i18n" href="/">{{ 'home' | i18n }}</a>
              <a [title]="'aboutLink' | i18n" href="/about">{{ 'about' | i18n }}</a>
            </nav>
          </header>
          <main>
            <p>{{ 'welcomeMessage' | i18n }}</p>
            <button [disabled]="loading" [title]="'submitButton' | i18n">
              {{ 'submit' | i18n }}
            </button>
          </main>
        </div>
      `;

      const result = transformer.transformTemplate(template, "complex-test.html");

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);

      // Verify that all i18n pipes were found and transformed
      const originalPipeCount = (template.match(/\|\s*i18n/g) || []).length;
      expect(result.changes.length).toBe(originalPipeCount);
    });

    it("should preserve template structure during transformation", () => {
      const transformer = new TemplateTransformer();
      const template = `
        <div>
          <p>Before: {{ 'message' | i18n }}</p>
          <span>Static content</span>
          <p>After: {{ 'anotherMessage' | i18n }}</p>
        </div>
      `;

      const result = transformer.transformTemplate(template, "structure-test.html");

      expect(result.success).toBe(true);

      // Apply transformations to see the result
      let transformedContent = template;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      // Verify structure is preserved
      expect(transformedContent).toContain("<div>");
      expect(transformedContent).toContain("</div>");
      expect(transformedContent).toContain("Static content");
      expect(transformedContent).toContain("Before:");
      expect(transformedContent).toContain("After:");
    });
  });
});
