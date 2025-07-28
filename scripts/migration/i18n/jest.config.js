const { createCjsPreset } = require("jest-preset-angular/presets");

const presetConfig = createCjsPreset({
  tsconfig: "<rootDir>/tsconfig.spec.json",
  astTransformers: {
    before: ["<rootDir>/../../../libs/shared/es2020-transformer.ts"],
  },
  diagnostics: {
    ignoreCodes: ["TS151001"],
  },
});

module.exports = {
  ...presetConfig,
  displayName: "i18n-migration-tools",
  preset: "../../../jest.preset.js",
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../../coverage/scripts/migration/i18n",
  testMatch: ["<rootDir>/**/*.spec.ts"],
  collectCoverageFrom: [
    "typescript/**/*.ts",
    "templates/**/*.ts",
    "shared/**/*.ts",
    "!**/*.d.ts",
    "!**/*.spec.ts",
  ],
};
