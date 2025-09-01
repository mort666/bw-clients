const { AngularWebpackPlugin } = require("@ngtools/webpack");

const webpackConfig = require("../../apps/browser/webpack.config");

const mainConfig = webpackConfig[0];
const backgroundConfig = webpackConfig[1];

mainConfig.entry["app/main"] = "../../bitwarden_license/bit-browser/src/popup/main.ts";
mainConfig.plugins[mainConfig.plugins.length - 1] = new AngularWebpackPlugin({
  tsconfig: "../../bitwarden_license/bit-browser/tsconfig.json",
  entryModule: "bitwarden_license/bit-browser/src/popup/app.module#AppModule",
  sourceMap: true,
});

backgroundConfig.entry = "./src/platform/background.ts";

module.exports = webpackConfig;
