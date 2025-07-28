#!/usr/bin/env node
/* eslint-disable no-console */

import * as fs from "fs";

import * as chalk from "chalk";

import { EnhancedTemplateTransformer } from "./enhanced-template-transformer";

async function testEnhancedTransformer() {
  console.log(chalk.blue("🧪 Testing Enhanced Template Transformer\n"));

  try {
    // Initialize the enhanced transformer
    const transformer = new EnhancedTemplateTransformer();
    await transformer.initialize("./test-combined.json");

    console.log(chalk.green("✅ Initialized with combined translations"));

    // Read the test template
    const templatePath = "./templates/test-enhanced-sample.html";
    const templateContent = fs.readFileSync(templatePath, "utf-8");

    console.log(chalk.blue("\n📄 Original Template:"));
    console.log(templateContent);

    // Transform the template
    const result = transformer.transformTemplate(templateContent, templatePath);

    if (result.success) {
      console.log(
        chalk.green(`\n✅ Transformation successful! ${result.changes.length} changes made`),
      );

      // Apply the transformations
      let transformedContent = templateContent;
      for (const change of result.changes.reverse()) {
        if (change.original && change.replacement) {
          transformedContent = transformedContent.replace(change.original, change.replacement);
        }
      }

      console.log(chalk.blue("\n📄 Transformed Template:"));
      console.log(transformedContent);

      console.log(chalk.blue("\n📋 Changes Made:"));
      result.changes.forEach((change, index) => {
        console.log(`${index + 1}. ${change.description}`);
        console.log(`   Before: ${chalk.red(change.original)}`);
        console.log(`   After:  ${chalk.green(change.replacement)}`);
        console.log();
      });

      if (result.errors.length > 0) {
        console.log(chalk.yellow("\n⚠️  Warnings:"));
        result.errors.forEach((error) => {
          console.log(`   ${error}`);
        });
      }

      // Save the transformed template
      const outputPath = "./templates/test-enhanced-sample-transformed.html";
      fs.writeFileSync(outputPath, transformedContent);
      console.log(chalk.green(`💾 Transformed template saved to: ${outputPath}`));
    } else {
      console.log(chalk.red("\n❌ Transformation failed:"));
      result.errors.forEach((error) => {
        console.log(`   ${error}`);
      });
    }
  } catch (error) {
    console.error(chalk.red("❌ Test failed:"), error);
    process.exit(1);
  }
}

testEnhancedTransformer();
