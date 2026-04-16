import {
  cliPackageJsonPath,
  cliPackageName,
  platformPackageDir,
  platformPackageJsonPath,
  platformPackageName,
  readCargoVersion,
  readDistributionConfig,
  readJson,
  writeJson
} from "./npm-dist.mjs";

const config = readDistributionConfig();
const version = readCargoVersion();

for (const platformPackage of config.platformPackages) {
  const packageJsonPath = platformPackageJsonPath(platformPackage);
  const packageJson = readJson(packageJsonPath);

  packageJson.name = platformPackageName(config, platformPackage);
  packageJson.version = version;
  packageJson.os = platformPackage.os;
  packageJson.cpu = platformPackage.cpu;
  packageJson.files = [platformPackage.binaryFile, "README.md"];
  packageJson.publishConfig = { access: "public" };

  if (platformPackage.libc) {
    packageJson.libc = platformPackage.libc;
  } else {
    delete packageJson.libc;
  }

  writeJson(packageJsonPath, packageJson);
}

const cliPackageJson = readJson(cliPackageJsonPath());
cliPackageJson.name = cliPackageName(config);
cliPackageJson.version = version;
cliPackageJson.bin = {
  trnovel: "bin/trnovel.js",
  trn: "bin/trnovel.js"
};
cliPackageJson.files = ["bin", "README.md"];
cliPackageJson.publishConfig = { access: "public" };
cliPackageJson.optionalDependencies = Object.fromEntries(
  config.platformPackages.map((platformPackage) => [
    platformPackageName(config, platformPackage),
    version
  ])
);

writeJson(cliPackageJsonPath(), cliPackageJson);

console.log(
  `Synchronized npm package manifests to Rust version ${version} in ${platformPackageDir(
    config.platformPackages[0]
  ).replace(/\/[^/]+$/, "")}.`
);
