import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

describe("Template Migration CLI", () => {
  const testDir = path.join(__dirname, "test-cli");
  const sampleTemplate = `<div>
  <h1>{{ 'title' | i18n }}</h1>
  <p>{{ 'description' | i18n }}</p>
  <button [title]="'buttonTitle' | i18n">{{ 'buttonText' | i18n }}</button>
</div>`;

  beforeEach(() => {
    // Create test directory and sample file
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, "test.html"), sampleTemplate);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it("should analyze template files and generate report", () => {
    const result = execSync(`npm run template-analyze -- --pattern "templates/test-cli/*.html"`, {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });

    expect(result).toContain("Template i18n Pipe Usage Analysis Report");
    expect(result).toContain("Total pipe usage count: 4");
    expect(result).toContain("Template files affected: 1");
    expect(result).toContain("Unique translation keys: 4");
  });

  it("should perform dry-run migration without modifying files", () => {
    const originalContent = fs.readFileSync(path.join(testDir, "test.html"), "utf-8");

    const result = execSync(
      `npm run template-migrate -- --pattern "templates/test-cli/*.html" --dry-run`,
      { cwd: path.join(__dirname, ".."), encoding: "utf-8" },
    );

    expect(result).toContain("Migration completed successfully");
    expect(result).toContain("1 files processed, 1 files modified");

    // File should not be modified in dry-run
    const currentContent = fs.readFileSync(path.join(testDir, "test.html"), "utf-8");
    expect(currentContent).toBe(originalContent);
  });

  it("should migrate template files and apply transformations", () => {
    const result = execSync(`npm run template-migrate -- --pattern "templates/test-cli/*.html"`, {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });

    expect(result).toContain("Migration completed successfully");

    // Check that file was modified
    const migratedContent = fs.readFileSync(path.join(testDir, "test.html"), "utf-8");
    expect(migratedContent).toContain('i18n="@@title"');
    expect(migratedContent).toContain('i18n="@@description"');
    expect(migratedContent).toContain('i18n-title="@@button-title"');
    expect(migratedContent).toContain('i18n="@@button-text"');
    expect(migratedContent).not.toContain("| i18n");
  });

  it("should validate migration results", () => {
    // First migrate the file
    execSync(`npm run template-migrate -- --pattern "templates/test-cli/*.html"`, {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });

    // Then validate
    const result = execSync(`npm run template-validate -- --pattern "templates/test-cli/*.html"`, {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });

    expect(result).toContain("No remaining i18n pipe usage found");
  });

  it("should detect remaining i18n pipes in validation", () => {
    // Don't migrate, just validate original file
    try {
      execSync(`npm run template-validate -- --pattern "templates/test-cli/*.html"`, {
        cwd: path.join(__dirname, ".."),
        encoding: "utf-8",
      });
      fail("Should have failed validation");
    } catch (error: any) {
      expect(error.stdout.toString()).toContain("Found 4 remaining i18n pipe usages");
    }
  });

  it("should generate comparison report for a single file", () => {
    const result = execSync(`npm run template-compare -- --file templates/test-cli/test.html`, {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
    });

    expect(result).toContain("Template Migration Comparison");
    expect(result).toContain("**Changes:** 4");
    expect(result).toContain("## Before");
    expect(result).toContain("## After");
    expect(result).toContain("## Changes");
  });
});
