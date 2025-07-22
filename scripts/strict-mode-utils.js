#!/usr/bin/env node

/**
 * Utility scripts for TypeScript strict mode migration
 *
 * This script provides utilities to:
 * 1. Identify files with @ts-strict-ignore comments
 * 2. Test strict mode compliance
 * 3. Track migration progress
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class StrictModeUtils {
  constructor() {
    this.rootDir = path.resolve(__dirname, "..");
    this.tsStrictIgnorePattern = /@ts-strict-ignore/;
  }

  /**
   * Recursively find all TypeScript files in a directory
   */
  findTsFiles(dir, excludeDirs = ["node_modules", "dist", "coverage", ".git", ".angular"]) {
    const results = [];

    try {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          if (!excludeDirs.includes(file)) {
            results.push(...this.findTsFiles(filePath, excludeDirs));
          }
        } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
          results.push(filePath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
    }

    return results;
  }

  /**
   * Find all files with @ts-strict-ignore comments
   */
  findFilesWithStrictIgnore() {
    console.log("🔍 Scanning for files with @ts-strict-ignore comments...\n");

    const tsFiles = this.findTsFiles(this.rootDir);
    const filesWithIgnore = [];

    for (const filePath of tsFiles) {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        if (this.tsStrictIgnorePattern.test(content)) {
          const relativePath = path.relative(this.rootDir, filePath);
          filesWithIgnore.push({
            path: relativePath,
            fullPath: filePath,
          });
        }
      } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
      }
    }

    return filesWithIgnore;
  }

  /**
   * Generate a report of files with @ts-strict-ignore comments
   */
  generateIgnoreReport() {
    const filesWithIgnore = this.findFilesWithStrictIgnore();

    console.log(`📊 Found ${filesWithIgnore.length} files with @ts-strict-ignore comments:\n`);

    // Group by directory for better organization
    const byDirectory = {};
    filesWithIgnore.forEach((file) => {
      const dir = path.dirname(file.path);
      if (!byDirectory[dir]) {
        byDirectory[dir] = [];
      }
      byDirectory[dir].push(file.path);
    });

    // Sort directories and display
    const sortedDirs = Object.keys(byDirectory).sort();
    for (const dir of sortedDirs) {
      console.log(`📁 ${dir}/`);
      byDirectory[dir].forEach((file) => {
        const fileName = path.basename(file);
        console.log(`   - ${fileName}`);
      });
      console.log();
    }

    return filesWithIgnore;
  }

  /**
   * Test strict mode compliance for a specific project
   */
  testStrictCompliance(projectPath = null) {
    console.log("🧪 Testing TypeScript strict mode compliance...\n");

    try {
      let command;
      if (projectPath) {
        const tsConfigPath = path.join(projectPath, "tsconfig.json");
        if (!fs.existsSync(tsConfigPath)) {
          throw new Error(`tsconfig.json not found at ${tsConfigPath}`);
        }
        command = `npx tsc --noEmit --strict --project ${tsConfigPath}`;
        console.log(`Testing project: ${projectPath}`);
      } else {
        command = "npx tsc --noEmit --strict";
        console.log("Testing entire codebase with strict mode...");
      }

      console.log(`Running: ${command}\n`);

      const output = execSync(command, {
        cwd: this.rootDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      console.log("✅ Strict mode compliance test passed!");
      if (output.trim()) {
        console.log("Output:", output);
      }

      return { success: true, output };
    } catch (error) {
      console.log("❌ Strict mode compliance test failed!");
      console.log("Error output:");
      console.log(error.stdout || error.message);

      return { success: false, error: error.stdout || error.message };
    }
  }

  /**
   * Check if typescript-strict-plugin is being used
   */
  checkStrictPlugin() {
    console.log("🔌 Checking typescript-strict-plugin usage...\n");

    try {
      // Check if plugin is in package.json
      const packageJsonPath = path.join(this.rootDir, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const hasPlugin =
        packageJson.devDependencies && packageJson.devDependencies["typescript-strict-plugin"];

      // Check if plugin is configured in tsconfig
      const tsConfigPath = path.join(this.rootDir, "tsconfig.base.json");
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, "utf8"));
      const hasPluginConfig =
        tsConfig.compilerOptions &&
        tsConfig.compilerOptions.plugins &&
        tsConfig.compilerOptions.plugins.some((p) => p.name === "typescript-strict-plugin");

      console.log(`Plugin in package.json: ${hasPlugin ? "✅" : "❌"}`);
      console.log(`Plugin in tsconfig: ${hasPluginConfig ? "✅" : "❌"}`);

      if (hasPlugin) {
        console.log(`Plugin version: ${packageJson.devDependencies["typescript-strict-plugin"]}`);
      }

      return { hasPlugin, hasPluginConfig };
    } catch (error) {
      console.error("Error checking plugin status:", error.message);
      return { hasPlugin: false, hasPluginConfig: false };
    }
  }

  /**
   * Generate migration progress report
   */
  generateProgressReport() {
    console.log("📈 Generating migration progress report...\n");

    const filesWithIgnore = this.findFilesWithStrictIgnore();
    const pluginStatus = this.checkStrictPlugin();

    // Count files by category
    const categories = {
      "libs/platform": 0,
      "libs/common": 0,
      "libs/auth": 0,
      "libs/vault": 0,
      "libs/key-management": 0,
      "libs/admin-console": 0,
      "libs/billing": 0,
      "libs/tools": 0,
      "libs/components": 0,
      "libs/angular": 0,
      "apps/cli": 0,
      "apps/browser": 0,
      "apps/desktop": 0,
      "apps/web": 0,
      bitwarden_license: 0,
      other: 0,
    };

    filesWithIgnore.forEach((file) => {
      let categorized = false;
      for (const category of Object.keys(categories)) {
        if (file.path.startsWith(category)) {
          categories[category]++;
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        categories.other++;
      }
    });

    console.log("Migration Progress by Category:");
    console.log("================================");

    for (const [category, count] of Object.entries(categories)) {
      if (count > 0) {
        console.log(`${category.padEnd(25)} ${count.toString().padStart(3)} files`);
      }
    }

    console.log(`\nTotal files with @ts-strict-ignore: ${filesWithIgnore.length}`);
    console.log(`TypeScript strict plugin active: ${pluginStatus.hasPlugin ? "Yes" : "No"}`);

    return {
      totalFiles: filesWithIgnore.length,
      categories,
      pluginActive: pluginStatus.hasPlugin,
    };
  }
}

// CLI interface
if (require.main === module) {
  const utils = new StrictModeUtils();
  const command = process.argv[2];

  switch (command) {
    case "find":
      utils.generateIgnoreReport();
      break;

    case "test":
      const projectPath = process.argv[3];
      utils.testStrictCompliance(projectPath);
      break;

    case "progress":
      utils.generateProgressReport();
      break;

    case "plugin":
      utils.checkStrictPlugin();
      break;

    default:
      console.log("TypeScript Strict Mode Migration Utilities");
      console.log("==========================================");
      console.log("");
      console.log("Usage: node scripts/strict-mode-utils.js <command>");
      console.log("");
      console.log("Commands:");
      console.log("  find      - Find all files with @ts-strict-ignore comments");
      console.log("  test      - Test strict mode compliance (optionally for specific project)");
      console.log("  progress  - Generate migration progress report");
      console.log("  plugin    - Check typescript-strict-plugin status");
      console.log("");
      console.log("Examples:");
      console.log("  node scripts/strict-mode-utils.js find");
      console.log("  node scripts/strict-mode-utils.js test");
      console.log("  node scripts/strict-mode-utils.js test libs/platform");
      console.log("  node scripts/strict-mode-utils.js progress");
      break;
  }
}

module.exports = StrictModeUtils;
