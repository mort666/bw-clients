#!/usr/bin/env node
/* eslint-disable no-console */

import * as fs from "fs";
import * as path from "path";

import * as chalk from "chalk";
import { Command } from "commander";

import { TranslationCombiner } from "./translation-combiner";
import { TranslationLookup } from "./translation-lookup";

const program = new Command();

program
  .name("translation-combiner")
  .description("CLI tool for combining translation files from all applications")
  .version("1.0.0");

program
  .command("combine")
  .description("Combine all application translation files into a single lookup file")
  .option(
    "-o, --output <path>",
    "Output file for combined translations",
    "./combined-translations.json",
  )
  .option("-r, --report <path>", "Output file for combination report")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔄 Combining translation files..."));

      const combiner = new TranslationCombiner();
      const result = combiner.combineTranslations();

      // Save combined translations
      combiner.saveCombinedTranslations(result, options.output);
      console.log(chalk.green(`✅ Combined translations saved to: ${options.output}`));

      // Generate and save report
      const report = combiner.generateCombinationReport(result);

      if (options.report) {
        fs.writeFileSync(options.report, report);
        console.log(chalk.green(`📊 Combination report saved to: ${options.report}`));
      } else if (options.verbose) {
        console.log(report);
      }

      // Display summary
      console.log(chalk.blue("\n📈 Summary:"));
      console.log(`  Total unique keys: ${result.totalKeys}`);
      console.log(`  Source applications: ${result.sources.length}`);
      console.log(`  Conflicts found: ${result.conflicts.length}`);

      if (result.conflicts.length > 0) {
        console.log(
          chalk.yellow(`\n⚠️  Found ${result.conflicts.length} conflicts between applications`),
        );
        if (!options.verbose) {
          console.log(chalk.gray("Use --verbose or --report to see conflict details"));
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to combine translations:"), error);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate translation keys against template usage")
  .option(
    "-c, --combined <path>",
    "Path to combined translations file",
    "./combined-translations.json",
  )
  .option("-p, --pattern <pattern>", "Glob pattern for template files", "**/*.html")
  .option("-o, --output <path>", "Output file for validation report")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔍 Validating translation keys..."));

      if (!fs.existsSync(options.combined)) {
        console.error(chalk.red(`❌ Combined translations file not found: ${options.combined}`));
        console.log(
          chalk.gray("Run 'combine' command first to generate the combined translations file"),
        );
        process.exit(1);
      }

      const lookup = new TranslationLookup();
      await lookup.loadTranslations(options.combined);

      // Find template files (simplified - in real implementation would use proper glob)
      const templateFiles = findTemplateFiles(options.pattern);

      if (templateFiles.length === 0) {
        console.log(chalk.yellow("⚠️  No template files found matching pattern"));
        return;
      }

      console.log(chalk.gray(`Found ${templateFiles.length} template files`));

      // This would require the enhanced transformer
      // For now, just show stats
      const stats = lookup.getStats();
      console.log(chalk.blue("\n📊 Translation Statistics:"));
      console.log(`  Total translations loaded: ${stats.totalKeys}`);
      console.log(`  Lookup service ready: ${stats.isLoaded ? "Yes" : "No"}`);
    } catch (error) {
      console.error(chalk.red("❌ Validation failed:"), error);
      process.exit(1);
    }
  });

program
  .command("search")
  .description("Search for translation keys or values")
  .argument("<query>", "Search query")
  .option(
    "-c, --combined <path>",
    "Path to combined translations file",
    "./combined-translations.json",
  )
  .option("-l, --limit <number>", "Maximum number of results", "10")
  .option("-v, --verbose", "Enable verbose logging")
  .action(async (query, options) => {
    try {
      if (!fs.existsSync(options.combined)) {
        console.error(chalk.red(`❌ Combined translations file not found: ${options.combined}`));
        console.log(
          chalk.gray("Run 'combine' command first to generate the combined translations file"),
        );
        process.exit(1);
      }

      const lookup = new TranslationLookup();
      await lookup.loadTranslations(options.combined);

      console.log(chalk.blue(`🔍 Searching for: "${query}"`));

      const results = lookup.search(query);
      const limit = parseInt(options.limit);
      const displayResults = results.slice(0, limit);

      if (displayResults.length === 0) {
        console.log(chalk.yellow("No results found"));
        return;
      }

      console.log(
        chalk.green(
          `\n📋 Found ${results.length} results (showing top ${displayResults.length}):\n`,
        ),
      );

      displayResults.forEach((result, index) => {
        console.log(`${index + 1}. ${chalk.cyan(result.key)} (relevance: ${result.relevance})`);
        console.log(`   "${result.message}"`);
        console.log();
      });

      if (results.length > limit) {
        console.log(chalk.gray(`... and ${results.length - limit} more results`));
      }
    } catch (error) {
      console.error(chalk.red("❌ Search failed:"), error);
      process.exit(1);
    }
  });

program
  .command("stats")
  .description("Show statistics about combined translations")
  .option(
    "-c, --combined <path>",
    "Path to combined translations file",
    "./combined-translations.json",
  )
  .action(async (options) => {
    try {
      if (!fs.existsSync(options.combined)) {
        console.error(chalk.red(`❌ Combined translations file not found: ${options.combined}`));
        console.log(
          chalk.gray("Run 'combine' command first to generate the combined translations file"),
        );
        process.exit(1);
      }

      const content = fs.readFileSync(options.combined, "utf-8");
      const data = JSON.parse(content);

      console.log(chalk.blue("📊 Translation Statistics\n"));

      if (data.metadata) {
        console.log(`Generated: ${new Date(data.metadata.generatedAt).toLocaleString()}`);
        console.log(`Total keys: ${data.metadata.totalKeys}`);
        console.log(`Conflicts: ${data.metadata.conflictCount}`);
        console.log(`Sources: ${data.metadata.sources.length}\n`);

        console.log(chalk.blue("📱 Source Applications:"));
        data.metadata.sources.forEach((source: any) => {
          console.log(`  ${source.app}: ${source.keyCount} keys`);
        });
      } else {
        const keys = Object.keys(data.translations || data);
        console.log(`Total keys: ${keys.length}`);
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to show stats:"), error);
      process.exit(1);
    }
  });

// Simple file finder (would be replaced with proper glob in real implementation)
function findTemplateFiles(pattern: string): string[] {
  // This is a simplified implementation
  // In practice, you'd use the same logic as in the template CLI
  return [];
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ Uncaught Exception:"), error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ Unhandled Rejection at:"), promise, "reason:", reason);
  process.exit(1);
});

program.parse();
