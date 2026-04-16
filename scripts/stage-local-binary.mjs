import fs from "node:fs";
import path from "node:path";

import {
  currentPlatformPackage,
  platformPackageDir,
  readDistributionConfig,
  repoRoot
} from "./npm-dist.mjs";

const config = readDistributionConfig();
const platformPackage = currentPlatformPackage(config);

if (!platformPackage) {
  throw new Error(
    `Current platform ${process.platform}/${process.arch} is not configured for npm distribution.`
  );
}

const sourceBinaryPath = path.join(
  repoRoot,
  "target",
  "release",
  platformPackage.binaryFile
);
const destinationBinaryPath = path.join(
  platformPackageDir(platformPackage),
  platformPackage.binaryFile
);

if (!fs.existsSync(sourceBinaryPath)) {
  throw new Error(
    `Expected a local release binary at ${sourceBinaryPath}. Run "cargo build --release --bin trnovel" first.`
  );
}

fs.copyFileSync(sourceBinaryPath, destinationBinaryPath);

if (!platformPackage.binaryFile.endsWith(".exe")) {
  fs.chmodSync(destinationBinaryPath, 0o755);
}

console.log(
  `Staged local ${platformPackage.directory} binary -> ${path.relative(
    repoRoot,
    destinationBinaryPath
  )}`
);
