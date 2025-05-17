const { pathsToModuleNameMapper } = require("ts-jest");

const { compilerOptions } = require("../shared/tsconfig.spec");

const sharedConfig = require("../../libs/shared/jest.config.angular");

/** @type {import('jest').Config} */
module.exports = {
  ...sharedConfig,
  displayName: "libs/string-utils function tests",
  preset: "node",
  moduleNameMapper: pathsToModuleNameMapper(
    ...(compilerOptions?.paths ?? {}),
    {
      prefix: "<rootDir>/",
    },
  ),
};
