import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import {
  cliPackageDir,
  currentPlatformPackage,
  platformPackageDir,
  readDistributionConfig,
  repoRoot
} from "./npm-dist.mjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--platform-package") {
      result.platformPackage = args[index + 1];
      index += 1;
    } else if (arg === "--pack-destination") {
      result.packDestination = args[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}\n${result.stderr ?? ""}`
    );
  }

  return result;
}

function npmPack(packageDir, packDestination) {
  const result = run(
    "npm",
    ["pack", packageDir, "--pack-destination", packDestination],
    { stdio: "pipe" }
  );

  return result.stdout.trim().split("\n").at(-1);
}

const options = parseArgs();
const config = readDistributionConfig();
const platformPackage =
  config.platformPackages.find(
    (item) => item.directory === options.platformPackage
  ) ?? currentPlatformPackage(config);

if (!platformPackage) {
  throw new Error(
    "Could not determine a platform package. Pass --platform-package explicitly."
  );
}

const binaryPath = path.join(
  platformPackageDir(platformPackage),
  platformPackage.binaryFile
);

if (!fs.existsSync(binaryPath)) {
  throw new Error(
    `Missing staged binary at ${binaryPath}. Run npm:stage-local or npm:stage-binaries first.`
  );
}

const packDestination = path.resolve(
  options.packDestination ?? path.join(repoRoot, "dist", "npm-smoke")
);
fs.mkdirSync(packDestination, { recursive: true });

const platformTarball = npmPack(platformPackageDir(platformPackage), packDestination);
const cliTarball = npmPack(cliPackageDir, packDestination);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trnovel-npm-smoke-"));

run("npm", ["init", "-y"], { stdio: "ignore", cwd: tempDir });

execFileSync(
  "npm",
  [
    "install",
    path.join(packDestination, platformTarball),
    path.join(packDestination, cliTarball)
  ],
  {
    cwd: tempDir,
    stdio: "inherit"
  }
);

execFileSync(path.join(tempDir, "node_modules", ".bin", "trnovel"), ["-h"], {
  cwd: tempDir,
  stdio: "inherit"
});

console.log(
  `Smoke test passed for ${platformPackage.directory} using ${path.relative(
    repoRoot,
    packDestination
  )}`
);
