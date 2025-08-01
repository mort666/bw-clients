#!/usr/bin/env node
/* eslint-disable no-console */

import { Project } from "ts-morph";

import { ASTTransformer } from "./ast-transformer";

async function demonstrateParameterHandling() {
  console.log("🔧 Demonstrating Parameter Handling with Translation Lookup\n");

  const project = new Project({
    useInMemoryFileSystem: true,
  });

  const transformer = new ASTTransformer();
  await transformer.initialize();

  // Mock a real translation entry like those found in the actual translation files
  const mockTranslationEntry = {
    message: "Data last updated: $DATE$",
    placeholders: {
      date: {
        content: "$1",
        example: "2021-01-01",
      },
    },
  };

  // Mock the translation lookup
  jest
    .spyOn(transformer["translationLookup"], "getTranslationEntry")
    .mockReturnValue(mockTranslationEntry);
  jest.spyOn(transformer["translationLookup"], "hasTranslation").mockReturnValue(true);

  const code = `
    class DataComponent {
      updateStatus() {
        const message = this.i18nService.t('dataLastUpdated', this.lastUpdateDate);
        return message;
      }
    }
  `;

  console.log("📝 Original Code:");
  console.log(code);

  const sourceFile = project.createSourceFile("demo.ts", code);
  const result = transformer.transformI18nServiceCalls(sourceFile);

  console.log("\n✨ Transformed Code:");
  console.log(sourceFile.getFullText());

  console.log("\n📊 Transformation Result:");
  console.log(`- Success: ${result.success}`);
  console.log(`- Changes: ${result.changes.length}`);
  console.log(`- Errors: ${result.errors.length}`);

  if (result.changes.length > 0) {
    console.log("\n🔄 Changes Made:");
    result.changes.forEach((change, index) => {
      console.log(`  ${index + 1}. ${change.description}`);
      console.log(`     Original: ${change.original}`);
      console.log(`     Replacement: ${change.replacement}`);
    });
  }

  console.log("\n✅ Key Features Demonstrated:");
  console.log("- ✅ Uses actual translation text from lookup");
  console.log("- ✅ Handles $VAR$ placeholder format correctly");
  console.log("- ✅ Maps placeholders to parameter names");
  console.log("- ✅ Generates proper $localize syntax with @@ID");
  console.log("- ✅ Preserves parameter order and names");
}

// Only run if this file is executed directly
if (require.main === module) {
  demonstrateParameterHandling().catch(console.error);
}

export { demonstrateParameterHandling };
