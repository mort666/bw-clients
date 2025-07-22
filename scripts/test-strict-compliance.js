#!/usr/bin/env node

/**
 * Automated testing script for TypeScript strict mode compliance
 *
 * This script tests strict mode compliance across different parts of the codebase
 * and provides detailed reporting for the migration process.
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const StrictModeUtils = require("./strict-mode-utils");

class StrictComplianceTester {
  constructor() {
    this.rootDir = path.resolve(__dirname, "..");
    this.utils = new StrictModeUtils();
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
    };
  }

  /**
   * Get all TypeScript configuration files in the project
   */
  getTsConfigFiles() {
    const tsConfigs = [];

    // Find all tsconfig.json files
    const findTsConfigs = (
      dir,
      excludeDirs = ["node_modules", "dist", "coverage", ".git", ".angular"],
    ) => {
      try {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
              findTsConfigs(filePath, excludeDirs);
            }
          } else if (file === "tsconfig.json") {
            const relativePath = path.relative(this.rootDir, filePath);
            // Skip shared directory as mentioned in test-types.js
            if (!relativePath.includes("libs/shared/")) {
              tsConfigs.push({
                path: relativePath,
                fullPath: filePath,
                directory: path.dirname(relativePath),
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
      }
    };

    findTsConfigs(this.rootDir);
    return tsConfigs;
  }

  /**
   * Test strict mode compliance for a specific TypeScript configuration
   */
  async testProjectStrictCompliance(tsConfigInfo) {
    const { path: configPath, directory } = tsConfigInfo;

    console.log(`\n🧪 Testing ${directory}...`);

    try {
      // Create a temporary strict tsconfig for testing
      const originalConfig = JSON.parse(fs.readFileSync(tsConfigInfo.fullPath, "utf8"));
      const testConfig = {
        ...originalConfig,
        compilerOptions: {
          ...originalConfig.compilerOptions,
          strict: true,
          // Enable all strict flags explicitly
          noImplicitAny: true,
          strictNullChecks: true,
          strictFunctionTypes: true,
          strictBindCallApply: true,
          strictPropertyInitialization: true,
          noImplicitReturns: true,
          noImplicitThis: true,
        },
      };

      // Remove typescript-strict-plugin if present
      if (testConfig.compilerOptions.plugins) {
        testConfig.compilerOptions.plugins = testConfig.compilerOptions.plugins.filter(
          (plugin) => plugin.name !== "typescript-strict-plugin",
        );
      }

      const tempConfigPath = path.join(
        path.dirname(tsConfigInfo.fullPath),
        "tsconfig.strict-test.json",
      );
      fs.writeFileSync(tempConfigPath, JSON.stringify(testConfig, null, 2));

      try {
        const command = `npx tsc --noEmit --project ${tempConfigPath}`;
        const output = execSync(command, {
          cwd: this.rootDir,
          encoding: "utf8",
          stdio: "pipe",
        });

        console.log(`   ✅ ${directory} - PASSED`);
        this.results.passed.push({
          project: directory,
          configPath,
          output: output.trim(),
        });

        return { success: true, project: directory, output };
      } finally {
        // Clean up temporary config file
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${directory} - FAILED`);

      const errorOutput = error.stdout || error.stderr || error.message;
      this.results.failed.push({
        project: directory,
        configPath,
        error: errorOutput,
      });

      return { success: false, project: directory, error: errorOutput };
    }
  }

  /**
   * Test strict mode compliance for all projects
   */
  async testAllProjects() {
    console.log("🚀 Starting comprehensive strict mode compliance testing...\n");

    const tsConfigs = this.getTsConfigFiles();
    console.log(`Found ${tsConfigs.length} TypeScript configuration files to test.\n`);

    // Test each project
    for (const tsConfig of tsConfigs) {
      await this.testProjectStrictCompliance(tsConfig);
    }

    this.generateTestReport();
    return this.results;
  }

  /**
   * Test specific projects by pattern
   */
  async testProjectsByPattern(pattern) {
    console.log(`🎯 Testing projects matching pattern: ${pattern}\n`);

    const tsConfigs = this.getTsConfigFiles();
    const matchingConfigs = tsConfigs.filter((config) => config.directory.includes(pattern));

    if (matchingConfigs.length === 0) {
      console.log(`No projects found matching pattern: ${pattern}`);
      return this.results;
    }

    console.log(`Found ${matchingConfigs.length} matching projects:\n`);
    matchingConfigs.forEach((config) => console.log(`  - ${config.directory}`));
    console.log();

    for (const tsConfig of matchingConfigs) {
      await this.testProjectStrictCompliance(tsConfig);
    }

    this.generateTestReport();
    return this.results;
  }

  /**
   * Generate a detailed test report
   */
  generateTestReport() {
    console.log("\n📊 STRICT MODE COMPLIANCE TEST REPORT");
    console.log("=====================================\n");

    const total =
      this.results.passed.length + this.results.failed.length + this.results.skipped.length;
    const passRate = total > 0 ? ((this.results.passed.length / total) * 100).toFixed(1) : 0;

    console.log(`Total Projects Tested: ${total}`);
    console.log(`Passed: ${this.results.passed.length} (${passRate}%)`);
    console.log(`Failed: ${this.results.failed.length}`);
    console.log(`Skipped: ${this.results.skipped.length}\n`);

    if (this.results.passed.length > 0) {
      console.log("✅ PASSED PROJECTS:");
      console.log("-------------------");
      this.results.passed.forEach((result) => {
        console.log(`  ${result.project}`);
      });
      console.log();
    }

    if (this.results.failed.length > 0) {
      console.log("❌ FAILED PROJECTS:");
      console.log("-------------------");
      this.results.failed.forEach((result) => {
        console.log(`  ${result.project}`);
        // Show first few lines of error for context
        const errorLines = result.error.split("\n").slice(0, 3);
        errorLines.forEach((line) => {
          if (line.trim()) {
            console.log(`    ${line.trim()}`);
          }
        });
        console.log();
      });
    }

    // Save detailed report to file
    const reportPath = path.join(this.rootDir, "strict-compliance-report.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          summary: {
            total,
            passed: this.results.passed.length,
            failed: this.results.failed.length,
            skipped: this.results.skipped.length,
            passRate: parseFloat(passRate),
          },
          results: this.results,
        },
        null,
        2,
      ),
    );

    console.log(`📄 Detailed report saved to: ${reportPath}\n`);

    if (this.results.failed.length === 0) {
      console.log("🎉 All projects are strict mode compliant!");
    } else {
      console.log(
        `⚠️  ${this.results.failed.length} projects need attention before enabling strict mode.`,
      );
    }
  }

  /**
   * Test current typescript-strict-plugin functionality
   */
  testStrictPlugin() {
    console.log("🔌 Testing typescript-strict-plugin functionality...\n");

    try {
      const command = "npx tsc-strict";
      console.log(`Running: ${command}`);

      const output = execSync(command, {
        cwd: this.rootDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      console.log("✅ typescript-strict-plugin test passed!");
      if (output.trim()) {
        console.log("Output:", output);
      }

      return { success: true, output };
    } catch (error) {
      console.log("❌ typescript-strict-plugin test failed!");
      console.log("Error:", error.stdout || error.message);

      return { success: false, error: error.stdout || error.message };
    }
  }
}

// CLI interface
if (require.main === module) {
  const tester = new StrictComplianceTester();
  const command = process.argv[2];
  const pattern = process.argv[3];

  async function main() {
    switch (command) {
      case "all":
        await tester.testAllProjects();
        break;

      case "pattern":
        if (!pattern) {
          console.error("Error: Pattern required for pattern command");
          console.log("Usage: node scripts/test-strict-compliance.js pattern <pattern>");
          process.exit(1);
        }
        await tester.testProjectsByPattern(pattern);
        break;

      case "plugin":
        tester.testStrictPlugin();
        break;

      default:
        console.log("TypeScript Strict Mode Compliance Tester");
        console.log("========================================");
        console.log("");
        console.log("Usage: node scripts/test-strict-compliance.js <command> [options]");
        console.log("");
        console.log("Commands:");
        console.log("  all       - Test all projects for strict mode compliance");
        console.log("  pattern   - Test projects matching a specific pattern");
        console.log("  plugin    - Test current typescript-strict-plugin functionality");
        console.log("");
        console.log("Examples:");
        console.log("  node scripts/test-strict-compliance.js all");
        console.log("  node scripts/test-strict-compliance.js pattern libs/platform");
        console.log("  node scripts/test-strict-compliance.js pattern apps/");
        console.log("  node scripts/test-strict-compliance.js plugin");
        break;
    }
  }

  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

module.exports = StrictComplianceTester;
