/* eslint-disable @typescript-eslint/no-require-imports, no-console */

const path = require("path");
const { inspect } = require("util");

const { Platform } = require("electron-builder");
const fse = require("fs-extra");

exports.default = run;

async function run(context) {
  console.log("## Before pack");

  const platform = context.packager.platform;
  const targets = context.packager.platformSpecificBuildOptions.target;

  console.log("### Platform: " + platform);
  console.log("### Targets: " + targets);

  const isSnap = platform === Platform.LINUX && targets.includes("snap");

  if (isSnap) {
    console.log("### Copying polkit policy file");
    const policyPath = path.join(__dirname, "../resources/com.bitwarden.desktop.policy");
    const targetDir = path.join(context.appOutDir, "/meta/polkit");
    if (fse.existsSync(policyPath)) {
      if (!fse.existsSync(targetDir)) {
        console.log("### Creating polkit directory " + targetDir);
        fse.mkdirSync(targetDir);
      }
      console.log("### Copying polkit policy file to " + targetDir);
      fse.copySync(policyPath, targetDir);
    } else {
      console.log("### Policy file not found - skipping");
    }
  } else {
    console.log("### Skipping polkit policy file copy because not a snap build");
  }
}
