import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(scriptDir, "..");
export const packagesRoot = path.join(repoRoot, "packages");
export const cliPackageDir = path.join(packagesRoot, "cli");
const configPath = path.join(repoRoot, "npm-packages.config.json");
const cargoTomlPath = path.join(repoRoot, "Cargo.toml");

export function readDistributionConfig() {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function readCargoVersion() {
  const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  const packageSection = cargoToml.match(/\[package\]([\s\S]*?)(?:\n\[|$)/);

  if (!packageSection) {
    throw new Error("Could not find the [package] section in Cargo.toml.");
  }

  const versionMatch = packageSection[1].match(/^\s*version\s*=\s*"([^"]+)"/m);

  if (!versionMatch) {
    throw new Error("Could not find the Rust package version in Cargo.toml.");
  }

  return versionMatch[1];
}

export function cliPackageName(config) {
  return `${config.scope}/${config.cliPackageName}`;
}

export function platformPackageName(config, platformPackage) {
  return `${config.scope}/${platformPackage.directory}`;
}

export function platformPackageDir(platformPackage) {
  return path.join(packagesRoot, platformPackage.directory);
}

export function platformPackageJsonPath(platformPackage) {
  return path.join(platformPackageDir(platformPackage), "package.json");
}

export function cliPackageJsonPath() {
  return path.join(cliPackageDir, "package.json");
}

export function currentPlatformPackage(config) {
  return config.platformPackages.find((platformPackage) => {
    const osMatches = platformPackage.os.includes(process.platform);
    const cpuMatches = platformPackage.cpu.includes(process.arch);
    return osMatches && cpuMatches;
  });
}

export function ensureFileExists(filePath, hint) {
  if (!fs.existsSync(filePath)) {
    throw new Error(hint ?? `Missing required file: ${filePath}`);
  }
}
