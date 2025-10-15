const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const nodeExternals = require("webpack-node-externals");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const config = require("./config/config");

module.exports.getEnv = function getEnv() {
  const ENV = process.env.NODE_ENV == null ? "development" : process.env.NODE_ENV;
  return { ENV };
};

const DEFAULT_PARAMS = {
  localesPath: "./src/locales",
  modulesPath: [path.resolve("../../node_modules")],
  externalsModulesDir: "../../node_modules",
  outputPath: path.resolve(__dirname, "build"),
  watch: false,
};

/**
 *
 * @param {{
 *  configName: string;
 *  entry: string;
 *  tsConfig: string;
 *  outputPath?: string;
 *  mode?: string;
 *  env?: string;
 *  modulesPath?: string[];
 *  localesPath?: string;
 *  externalsModulesDir?: string;
 *  watch?: boolean;
 *  importAliases?: import("webpack").ResolveOptions["alias"];
 * }} params
 */
module.exports.buildConfig = function buildConfig(params) {
  params = { ...DEFAULT_PARAMS, ...params };
  const ENV = params.env || module.exports.getEnv().ENV;

  const envConfig = config.load(ENV);
  config.log(`Building CLI - ${params.configName} version`);
  config.log(envConfig);

  const moduleRules = [
    {
      test: /\.ts$/,
      use: "ts-loader",
      exclude: path.resolve(__dirname, "node_modules"),
    },
  ];

  const plugins = [
    new CopyWebpackPlugin({
      patterns: [{ from: params.localesPath, to: "locales" }],
    }),
    new webpack.DefinePlugin({
      "process.env.BWCLI_ENV": JSON.stringify(ENV),
    }),
    new webpack.BannerPlugin({
      banner: "#!/usr/bin/env node",
      raw: true,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^encoding$/,
      contextRegExp: /node-fetch/,
    }),
    new webpack.EnvironmentPlugin({
      ENV: ENV,
      BWCLI_ENV: ENV,
      FLAGS: envConfig.flags,
      DEV_FLAGS: envConfig.devFlags,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /canvas/,
      contextRegExp: /jsdom$/,
    }),
  ];

  const webpackConfig = {
    mode: params.mode || ENV,
    target: "node",
    devtool: ENV === "development" ? "eval-source-map" : "source-map",
    node: {
      __dirname: false,
      __filename: false,
    },
    entry: {
      bw: params.entry,
    },
    optimization: {
      minimize: false,
    },
    resolve: {
      extensions: [".ts", ".js"],
      symlinks: false,
      modules: params.modulesPath,
      plugins: [new TsconfigPathsPlugin({ configFile: params.tsConfig })],
      alias: params.importAliases,
    },
    output: {
      filename: "[name].js",
      path: path.resolve(params.outputPath),
      clean: true,
    },
    module: { rules: moduleRules },
    plugins: plugins,
    externals: [
      nodeExternals({
        modulesDir: params.externalsModulesDir,
        allowlist: [/@bitwarden/],
      }),
    ],
    experiments: {
      asyncWebAssembly: true,
    },
  };
  if (params.watch) {
    webpackConfig.watch = true;
    webpackConfig.watchOptions = {
      ignored: /node_modules/,
      poll: 1000,
    };
  }
  return webpackConfig;
};
