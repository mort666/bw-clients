/* eslint-disable @typescript-eslint/no-var-requires */
const child_process = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const process = require("process");

// Map of the Node arch equivalents for the rust target triplets, used to move the file to the correct location
const rustTargetsMap = {
    "i686-pc-windows-msvc":       { nodeArch: 'ia32',  platform: 'win32'  },
    "x86_64-pc-windows-msvc":     { nodeArch: 'x64',   platform: 'win32'  },
    "aarch64-pc-windows-msvc":    { nodeArch: 'arm64', platform: 'win32'  },
    "x86_64-apple-darwin":        { nodeArch: 'x64',   platform: 'darwin' },
    "aarch64-apple-darwin":       { nodeArch: 'arm64', platform: 'darwin' },
    'x86_64-unknown-linux-musl':  { nodeArch: 'x64',   platform: 'linux'  },
    'aarch64-unknown-linux-musl': { nodeArch: 'arm64', platform: 'linux'  },
}

// Ensure the dist directory exists
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });

const args = process.argv.slice(2); // Get arguments passed to the script
const mode = args.includes("--release") ? "release" : "debug";
const targetArg = args.find(arg => arg.startsWith("--target="));
const target = targetArg ? targetArg.split("=")[1] : null;

let crossPlatform = process.argv.length > 2 && process.argv[2] === "cross-platform";

function computeProxyBinExt(target) {
    // Determine extension from target or current platform
    if (target) {
        const entry = rustTargetsMap[target];
        if (entry && entry.platform === 'win32') return '.exe';
        return '';
    }
    return process.platform === 'win32' ? '.exe' : '';
}

function computeProxyBinPath(target, release = true) {
    const targetFolder = release ? "release" : "debug";
    const ext = computeProxyBinExt(target);
    if (target) {
        return path.join(__dirname, "target", target, targetFolder, `desktop_proxy${ext}`);
    }
    return path.join(__dirname, "target", targetFolder, `desktop_proxy${ext}`);
}

function sha256File(filePath) {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
}

function buildNapiModule(target, release = true, envExtra = {}) {
    const targetArg = target ? `--target ${target}` : "";
    const releaseArg = release ? "--release" : "";
    child_process.execSync(`npm run build -- ${releaseArg} ${targetArg}`, { stdio: 'inherit', cwd: path.join(__dirname, "napi"), env: { ...process.env, ...envExtra } });
}

function buildProxyBin(target, release = true) {
    const targetArg = target ? `--target ${target}` : "";
    const releaseArg = release ? "--release" : "";
    child_process.execSync(`cargo build --bin desktop_proxy ${releaseArg} ${targetArg}`, {stdio: 'inherit', cwd: path.join(__dirname, "proxy")});

    if (target) {
        // Copy the resulting binary to the dist folder
        const targetFolder = release ? "release" : "debug";
        const ext = computeProxyBinExt(target);
        const nodeArch = rustTargetsMap[target].nodeArch;
        fs.copyFileSync(path.join(__dirname, "target", target, targetFolder, `desktop_proxy${ext}`), path.join(__dirname, "dist", `desktop_proxy.${process.platform}-${nodeArch}${ext}`));
    }

    // Return the path to the built binary so callers can hash it
    return computeProxyBinPath(target, release);
}

function buildProcessIsolation() {
    if (process.platform !== "linux") {
        return;
    }

    child_process.execSync(`cargo build --release`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, "process_isolation")
    });

    console.log("Copying process isolation library to dist folder");
    fs.copyFileSync(path.join(__dirname, "target", "release", "libprocess_isolation.so"), path.join(__dirname, "dist", `libprocess_isolation.so`));
}

function installTarget(target) {
    child_process.execSync(`rustup target add ${target}`, { stdio: 'inherit', cwd: __dirname });
}

if (!crossPlatform && !target) {
    console.log(`Building native modules in ${mode} mode for the native architecture`);
    // Build proxy first so we can hash and pass it to the N-API build
    const binPath = buildProxyBin(false, mode === "release");
    const proxyHash = sha256File(binPath);
    buildNapiModule(false, mode === "release", { PROXY_BIN_PATH: binPath, PROXY_HASH: proxyHash });
    buildProcessIsolation();
    return;
}

if (target) {
    console.log(`Building for target: ${target} in ${mode} mode`);
    installTarget(target);
    // Build proxy first so we can hash and pass it to the N-API build
    const binPath = buildProxyBin(target, mode === "release");
    const proxyHash = sha256File(binPath);
    buildNapiModule(target, mode === "release", { PROXY_BIN_PATH: binPath, PROXY_HASH: proxyHash, PROXY_TARGET: target });
    buildProcessIsolation();
    return;
}

// Filter the targets based on the current platform, and build for each of them
let platformTargets = Object.entries(rustTargetsMap).filter(([_, { platform: p }]) => p === process.platform);
console.log("Cross building native modules for the targets: ", platformTargets.map(([target, _]) => target).join(", "));

// When building for Linux, we need to set some environment variables to allow cross-compilation
if (process.platform === "linux") {
    process.env["PKG_CONFIG_ALLOW_CROSS"] = "1";
    process.env["PKG_CONFIG_ALL_STATIC"] = "1";
}

platformTargets.forEach(([target, _]) => {
    installTarget(target);
    const binPath = buildProxyBin(target);
    const proxyHash = sha256File(binPath);
    buildNapiModule(target, true, { PROXY_BIN_PATH: binPath, PROXY_HASH: proxyHash, PROXY_TARGET: target });
    buildProcessIsolation();
});
