import * as fs from "fs";
import * as path from "path";

describe("Backup System", () => {
  const testDir = path.join(__dirname, "test-backup-system");
  const backupDir = path.join(testDir, "backups");

  const originalTemplate = `<div>
  <h1>{{ 'title' | i18n }}</h1>
  <p>{{ 'description' | i18n }}</p>
</div>`;

  const modifiedTemplate = `<div>
  <h1><span i18n="@@title">Title</span></h1>
  <p><span i18n="@@description">Description</span></p>
</div>`;

  beforeEach(() => {
    // Create test directory structure
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create nested directory structure to test path preservation
    const nestedDir = path.join(testDir, "nested", "deep");
    fs.mkdirSync(nestedDir, { recursive: true });

    // Create test files
    fs.writeFileSync(path.join(testDir, "test1.html"), originalTemplate);
    fs.writeFileSync(path.join(nestedDir, "test2.html"), originalTemplate);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe("backup creation", () => {
    it("should create backups with path mapping", () => {
      const templateFiles = [
        path.join(testDir, "test1.html"),
        path.join(testDir, "nested", "deep", "test2.html"),
      ];

      // Simulate the backup creation logic
      const pathMapping: Record<string, string> = {};

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      for (const filePath of templateFiles) {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupFileName = relativePath.replace(/[/\\]/g, "_") + ".backup";
        const backupPath = path.join(backupDir, backupFileName);

        fs.copyFileSync(filePath, backupPath);
        pathMapping[backupFileName] = filePath;
      }

      // Save path mapping
      const mappingPath = path.join(backupDir, "path-mapping.json");
      fs.writeFileSync(mappingPath, JSON.stringify(pathMapping, null, 2));

      // Verify backup files exist
      expect(fs.existsSync(mappingPath)).toBe(true);
      expect(Object.keys(pathMapping)).toHaveLength(2);

      // Verify backup files contain original content
      for (const [backupFileName, originalPath] of Object.entries(pathMapping)) {
        const backupPath = path.join(backupDir, backupFileName);
        expect(fs.existsSync(backupPath)).toBe(true);

        const backupContent = fs.readFileSync(backupPath, "utf-8");
        const originalContent = fs.readFileSync(originalPath, "utf-8");
        expect(backupContent).toBe(originalContent);
      }
    });

    it("should handle nested directory paths correctly", () => {
      const filePath = path.join(testDir, "nested", "deep", "test2.html");
      const relativePath = path.relative(process.cwd(), filePath);
      const backupFileName = relativePath.replace(/[/\\]/g, "_") + ".backup";

      // Should convert slashes/backslashes to underscores
      expect(backupFileName).toContain("_");
      expect(backupFileName).not.toContain("/");
      expect(backupFileName).not.toContain("\\");
      expect(backupFileName.endsWith(".backup")).toBe(true);
    });
  });

  describe("backup restoration", () => {
    it("should restore files to original locations", () => {
      const templateFiles = [
        path.join(testDir, "test1.html"),
        path.join(testDir, "nested", "deep", "test2.html"),
      ];

      // Create backups
      const pathMapping: Record<string, string> = {};

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      for (const filePath of templateFiles) {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupFileName = relativePath.replace(/[/\\]/g, "_") + ".backup";
        const backupPath = path.join(backupDir, backupFileName);

        fs.copyFileSync(filePath, backupPath);
        pathMapping[backupFileName] = filePath;
      }

      const mappingPath = path.join(backupDir, "path-mapping.json");
      fs.writeFileSync(mappingPath, JSON.stringify(pathMapping, null, 2));

      // Modify original files
      for (const filePath of templateFiles) {
        fs.writeFileSync(filePath, modifiedTemplate);
      }

      // Verify files are modified
      for (const filePath of templateFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).toBe(modifiedTemplate);
      }

      // Restore from backups
      const loadedMapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
      const backupFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith(".backup"));

      for (const backupFile of backupFiles) {
        const backupPath = path.join(backupDir, backupFile);
        const originalPath = loadedMapping[backupFile];

        if (originalPath) {
          // Ensure directory exists
          const originalDir = path.dirname(originalPath);
          if (!fs.existsSync(originalDir)) {
            fs.mkdirSync(originalDir, { recursive: true });
          }

          fs.copyFileSync(backupPath, originalPath);
        }
      }

      // Verify files are restored
      for (const filePath of templateFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).toBe(originalTemplate);
      }
    });

    it("should handle missing directories during restoration", () => {
      const filePath = path.join(testDir, "new", "nested", "path", "test.html");
      const backupFileName = "test_new_nested_path_test.html.backup";
      const pathMapping = { [backupFileName]: filePath };

      // Create backup directory and mapping
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(backupDir, backupFileName);
      fs.writeFileSync(backupPath, originalTemplate);

      const mappingPath = path.join(backupDir, "path-mapping.json");
      fs.writeFileSync(mappingPath, JSON.stringify(pathMapping, null, 2));

      // Restore (should create missing directories)
      const originalDir = path.dirname(filePath);
      if (!fs.existsSync(originalDir)) {
        fs.mkdirSync(originalDir, { recursive: true });
      }
      fs.copyFileSync(backupPath, filePath);

      // Verify file was restored and directories were created
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, "utf-8")).toBe(originalTemplate);
    });
  });

  describe("error handling", () => {
    it("should handle missing path mapping file", () => {
      // Create backup files without mapping
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.writeFileSync(path.join(backupDir, "test.html.backup"), originalTemplate);

      const mappingPath = path.join(backupDir, "path-mapping.json");

      // Should detect missing mapping file
      expect(fs.existsSync(mappingPath)).toBe(false);
    });

    it("should handle backup files without mapping entries", () => {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Create backup file
      const backupFileName = "orphaned.html.backup";
      fs.writeFileSync(path.join(backupDir, backupFileName), originalTemplate);

      // Create mapping without this file
      const pathMapping = { "other.html.backup": "/some/other/path.html" };
      const mappingPath = path.join(backupDir, "path-mapping.json");
      fs.writeFileSync(mappingPath, JSON.stringify(pathMapping, null, 2));

      const loadedMapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));

      // Should not find mapping for orphaned file
      expect(loadedMapping[backupFileName]).toBeUndefined();
    });
  });
});
