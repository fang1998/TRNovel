import fs from "node:fs";
import path from "node:path";

import {
  platformPackageDir,
  readDistributionConfig,
  repoRoot
} from "./npm-dist.mjs";

const binaryRootFlagIndex = process.argv.indexOf("--binary-root");
const binaryRoot =
  binaryRootFlagIndex >= 0 && process.argv[binaryRootFlagIndex + 1]
    ? path.resolve(process.argv[binaryRootFlagIndex + 1])
    : path.join(repoRoot, "dist", "npm-binaries");

const config = readDistributionConfig();

for (const platformPackage of config.platformPackages) {
  const sourceBinaryPath = path.join(
    binaryRoot,
    platformPackage.directory,
    platformPackage.binaryFile
  );
  const destinationBinaryPath = path.join(
    platformPackageDir(platformPackage),
    platformPackage.binaryFile
  );

  if (!fs.existsSync(sourceBinaryPath)) {
    throw new Error(
      `Missing binary for ${platformPackage.directory}: expected ${sourceBinaryPath}`
    );
  }

  fs.mkdirSync(path.dirname(destinationBinaryPath), { recursive: true });
  fs.copyFileSync(sourceBinaryPath, destinationBinaryPath);

  if (!platformPackage.binaryFile.endsWith(".exe")) {
    fs.chmodSync(destinationBinaryPath, 0o755);
  }

  console.log(
    `Staged ${platformPackage.directory} binary -> ${path.relative(
      repoRoot,
      destinationBinaryPath
    )}`
  );
}
