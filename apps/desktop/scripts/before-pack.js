/* eslint-disable @typescript-eslint/no-require-imports, no-console */
require("dotenv").config();
const path = require("path");

const fs = require("fs");
const path = require("path");

exports.default = run;

async function run(context) {
  const platform = context.packager.platform;
  const targets = context.packager.targetNames;
  const isSnap = platform === "linux" && targets.includes("snap");

  if (isSnap) {
    console.log("### Copying polkit policy file");
    const policyPath = path.join(__dirname, "../resources/com.bitwarden.desktop.policy");
    const targetDir = path.join(context.appOutDir, "/meta/polkit");
    if (fs.existsSync(policyPath)) {
      if (!fse.existsSync(targetDir)) {
        console.log("### Creating polkit directory " + targetDir);
        fse.mkdirSync(targetDir);
      }
      console.log("### Copying polkit policy file to " + targetDir);
      fse.copySync(policyPath, targetDir);
    } else {
      console.log("### Policy file not found - skipping");
    }
  }
}
