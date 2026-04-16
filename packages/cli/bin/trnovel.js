#!/usr/bin/env node

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function readOwnPackageJson() {
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function currentPackageSuffix() {
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "darwin-arm64";
  }

  if (process.platform === "darwin" && process.arch === "x64") {
    return "darwin-x64";
  }

  if (process.platform === "linux" && process.arch === "x64") {
    return "linux-x64-gnu";
  }

  if (process.platform === "win32" && process.arch === "x64") {
    return "win32-x64-msvc";
  }

  return null;
}

function resolveBinaryPath() {
  const suffix = currentPackageSuffix();

  if (!suffix) {
    throw new Error(
      `Unsupported platform: ${process.platform} ${process.arch}.`
    );
  }

  const packageJson = readOwnPackageJson();
  const optionalDependencies = Object.keys(
    packageJson.optionalDependencies ?? {}
  );
  const packageName = optionalDependencies.find((name) =>
    name.endsWith(`-${suffix}`)
  );

  if (!packageName) {
    throw new Error(
      `No optional dependency is configured for ${suffix}. Check packages/cli/package.json.`
    );
  }

  const binaryFile = process.platform === "win32" ? "trnovel.exe" : "trnovel";

  try {
    return require.resolve(`${packageName}/${binaryFile}`);
  } catch (error) {
    throw new Error(
      `Failed to resolve ${packageName}. Reinstall the package without --omit=optional and make sure your platform is supported.\n${error.message}`
    );
  }
}

function main() {
  const binaryPath = resolveBinaryPath();
  const child = spawn(binaryPath, process.argv.slice(2), {
    stdio: "inherit"
  });
  const signalExitCodes = {
    SIGHUP: 129,
    SIGINT: 130,
    SIGTERM: 143
  };

  const forwardSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const signal of forwardSignals) {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  }

  child.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(signalExitCodes[signal] ?? 1);
      return;
    }

    process.exit(code ?? 1);
  });
}

main();
