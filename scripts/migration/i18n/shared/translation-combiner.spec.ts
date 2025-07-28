import * as fs from "fs";
import * as path from "path";

import { TranslationCombiner } from "./translation-combiner";

describe("TranslationCombiner", () => {
  let combiner: TranslationCombiner;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(__dirname, "test-translations");
    combiner = new TranslationCombiner(testDir);

    // Create test directory structure
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create mock translation files
    createMockTranslationFiles();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  function createMockTranslationFiles() {
    // Browser translations
    const browserDir = path.join(testDir, "apps/browser/src/_locales/en");
    fs.mkdirSync(browserDir, { recursive: true });
    fs.writeFileSync(
      path.join(browserDir, "messages.json"),
      JSON.stringify(
        {
          appName: { message: "Bitwarden" },
          login: { message: "Log in" },
          password: { message: "Password" },
          browserSpecific: { message: "Browser Extension" },
        },
        null,
        2,
      ),
    );

    // Desktop translations
    const desktopDir = path.join(testDir, "apps/desktop/src/locales/en");
    fs.mkdirSync(desktopDir, { recursive: true });
    fs.writeFileSync(
      path.join(desktopDir, "messages.json"),
      JSON.stringify(
        {
          appName: { message: "Bitwarden" }, // Same as browser
          login: { message: "Sign in" }, // Different from browser (conflict)
          vault: { message: "Vault" },
          desktopSpecific: { message: "Desktop Application" },
        },
        null,
        2,
      ),
    );

    // Web translations
    const webDir = path.join(testDir, "apps/web/src/locales/en");
    fs.mkdirSync(webDir, { recursive: true });
    fs.writeFileSync(
      path.join(webDir, "messages.json"),
      JSON.stringify(
        {
          dashboard: { message: "Dashboard" },
          settings: { message: "Settings" },
          webSpecific: { message: "Web Vault" },
        },
        null,
        2,
      ),
    );

    // CLI translations
    const cliDir = path.join(testDir, "apps/cli/src/locales/en");
    fs.mkdirSync(cliDir, { recursive: true });
    fs.writeFileSync(
      path.join(cliDir, "messages.json"),
      JSON.stringify(
        {
          version: { message: "Version" },
          help: { message: "Help" },
          cliSpecific: { message: "Command Line Interface" },
        },
        null,
        2,
      ),
    );
  }

  describe("combineTranslations", () => {
    it("should combine translations from all applications", () => {
      const result = combiner.combineTranslations();

      expect(result.totalKeys).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(4); // browser, desktop, web, cli
      expect(result.translations).toHaveProperty("appName");
      expect(result.translations).toHaveProperty("browserSpecific");
      expect(result.translations).toHaveProperty("desktopSpecific");
      expect(result.translations).toHaveProperty("webSpecific");
      expect(result.translations).toHaveProperty("cliSpecific");
    });

    it("should detect conflicts between applications", () => {
      const result = combiner.combineTranslations();

      expect(result.conflicts.length).toBeGreaterThan(0);

      // Should detect the login conflict between browser and desktop
      const loginConflict = result.conflicts.find((c) => c.key === "login");
      expect(loginConflict).toBeDefined();
      expect(loginConflict?.values).toContain("Log in");
      expect(loginConflict?.values).toContain("Sign in");
    });

    it("should preserve first occurrence for conflicting keys", () => {
      const result = combiner.combineTranslations();

      // Browser is processed first, so its value should be preserved
      expect(result.translations.appName.message).toBe("Bitwarden");
      expect(result.translations.login.message).toBe("Log in"); // Browser version
    });

    it("should track source information", () => {
      const result = combiner.combineTranslations();

      const browserSource = result.sources.find((s) => s.app === "browser");
      const desktopSource = result.sources.find((s) => s.app === "desktop");
      const webSource = result.sources.find((s) => s.app === "web");
      const cliSource = result.sources.find((s) => s.app === "cli");

      expect(browserSource).toBeDefined();
      expect(desktopSource).toBeDefined();
      expect(webSource).toBeDefined();
      expect(cliSource).toBeDefined();

      expect(browserSource?.keyCount).toBe(4);
      expect(desktopSource?.keyCount).toBe(4);
      expect(webSource?.keyCount).toBe(3);
      expect(cliSource?.keyCount).toBe(3);
    });
  });

  describe("saveCombinedTranslations", () => {
    it("should save combined translations with metadata", () => {
      const result = combiner.combineTranslations();
      const outputPath = path.join(testDir, "combined.json");

      combiner.saveCombinedTranslations(result, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      expect(saved).toHaveProperty("metadata");
      expect(saved).toHaveProperty("translations");
      expect(saved.metadata).toHaveProperty("generatedAt");
      expect(saved.metadata).toHaveProperty("sources");
      expect(saved.metadata).toHaveProperty("totalKeys");
      expect(saved.metadata).toHaveProperty("conflictCount");
    });
  });

  describe("generateCombinationReport", () => {
    it("should generate a comprehensive report", () => {
      const result = combiner.combineTranslations();
      const report = combiner.generateCombinationReport(result);

      expect(report).toContain("Translation Combination Report");
      expect(report).toContain("Summary");
      expect(report).toContain("Sources");
      expect(report).toContain("Key Distribution");

      if (result.conflicts.length > 0) {
        expect(report).toContain("Conflicts");
      }
    });
  });

  describe("utility methods", () => {
    it("should get translation message for existing key", () => {
      const result = combiner.combineTranslations();
      const message = combiner.getTranslationMessage(result.translations, "appName");

      expect(message).toBe("Bitwarden");
    });

    it("should return null for non-existing key", () => {
      const result = combiner.combineTranslations();
      const message = combiner.getTranslationMessage(result.translations, "nonExistentKey");

      expect(message).toBeNull();
    });

    it("should check if translation exists", () => {
      const result = combiner.combineTranslations();

      expect(combiner.hasTranslation(result.translations, "appName")).toBe(true);
      expect(combiner.hasTranslation(result.translations, "nonExistentKey")).toBe(false);
    });

    it("should get all keys sorted", () => {
      const result = combiner.combineTranslations();
      const keys = combiner.getAllKeys(result.translations);

      expect(keys).toBeInstanceOf(Array);
      expect(keys.length).toBe(result.totalKeys);

      // Should be sorted
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });

    it("should search keys and messages", () => {
      const result = combiner.combineTranslations();
      const searchResults = combiner.searchKeys(result.translations, "app");

      expect(searchResults).toBeInstanceOf(Array);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults).toContain("appName");
    });
  });

  describe("error handling", () => {
    it("should handle missing translation files gracefully", () => {
      const emptyCombiner = new TranslationCombiner("/non/existent/path");
      const result = emptyCombiner.combineTranslations();

      expect(result.totalKeys).toBe(0);
      expect(result.sources).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it("should handle malformed JSON files", () => {
      // Overwrite one of the existing files with malformed JSON
      const badPath = path.join(testDir, "apps/browser/src/_locales/en/messages.json");
      fs.writeFileSync(badPath, "{ invalid json }");

      // Should not throw, but should log error
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = combiner.combineTranslations();

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
