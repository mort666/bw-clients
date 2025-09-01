const { buildConfig } = require("./webpack.base");

module.exports = buildConfig({
  popup: {
    entry: "./src/popup/main.ts",
    entryModule: "src/popup/app.module#AppModule",
  },
  background: {
    entry: "./src/platform/background.ts",
  },
  tsConfig: "tsconfig.json",
});
