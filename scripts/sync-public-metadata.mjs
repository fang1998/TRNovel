import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  cliPackageName,
  platformPackageName,
  readCargoVersion,
  readDistributionConfig,
  repoRoot
} from "./npm-dist.mjs";

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function writeFile(relativePath, content) {
  fs.writeFileSync(path.join(repoRoot, relativePath), content);
}

function getOriginUrl() {
  return execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function normalizeGitHubUrl(remoteUrl) {
  if (remoteUrl.startsWith("git@github.com:")) {
    return `https://github.com/${remoteUrl
      .slice("git@github.com:".length)
      .replace(/\.git$/, "")}`;
  }

  if (remoteUrl.startsWith("https://github.com/")) {
    return remoteUrl.replace(/\.git$/, "");
  }

  throw new Error(
    `Unsupported origin remote format: ${remoteUrl}. Only GitHub remotes are supported by sync-public-metadata.`
  );
}

function parseGitHubRepository(githubUrl) {
  const match = githubUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);

  if (!match) {
    throw new Error(`Could not parse GitHub repository from ${githubUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2]
  };
}

function npmBadgeVersionUrl(packageName) {
  return `https://img.shields.io/npm/v/${packageName}`;
}

function npmPackageUrl(packageName) {
  return `https://www.npmjs.com/package/${packageName}`;
}

function npmDownloadsBadgeUrl(packageName) {
  return `https://img.shields.io/npm/d18m/${encodeURIComponent(
    packageName
  )}?label=npm%20downloads`;
}

function replaceOrThrow(content, pattern, replacement, fileLabel) {
  if (!pattern.test(content)) {
    throw new Error(`Could not find a match for ${pattern} in ${fileLabel}`);
  }

  return content.replace(pattern, replacement);
}

const config = readDistributionConfig();
const version = readCargoVersion();
const packageName = cliPackageName(config);
const remoteUrl = getOriginUrl();
const githubUrl = normalizeGitHubUrl(remoteUrl);
const repository = parseGitHubRepository(githubUrl);
const githubPagesUrl = `https://${repository.owner}.github.io/${repository.repo}`;
const releaseBaseUrl = `${githubUrl}/releases/download/v${version}`;

let readme = readFile("README.md");
readme = replaceOrThrow(
  readme,
  /\[!\[NPM Version\]\([^)]+\)\]\([^)]+\) !\[NPM Downloads\]\([^)]+\)/,
  `[![NPM Version](${npmBadgeVersionUrl(packageName)})](${npmPackageUrl(
    packageName
  )}) ![NPM Downloads](${npmDownloadsBadgeUrl(packageName)})`,
  "README.md"
);
readme = replaceOrThrow(
  readme,
  /## \[使用文档\]\([^)]+\)/,
  `## [使用文档](${githubPagesUrl})`,
  "README.md"
);
writeFile("README.md", readme);

let cargoToml = readFile("Cargo.toml");
cargoToml = replaceOrThrow(
  cargoToml,
  /^repository = "https:\/\/github\.com\/[^"]+"$/m,
  `repository = "${githubUrl}"`,
  "Cargo.toml"
);
writeFile("Cargo.toml", cargoToml);

let docsInstall = readFile("docs/src/content/docs/guides/install.mdx");
docsInstall = replaceOrThrow(
  docsInstall,
  /pnpm add -g [^\n]+/,
  `pnpm add -g ${packageName}`,
  "docs/src/content/docs/guides/install.mdx"
);
docsInstall = replaceOrThrow(
  docsInstall,
  /npm i -g [^\n]+/,
  `npm i -g ${packageName}`,
  "docs/src/content/docs/guides/install.mdx"
);
docsInstall = replaceOrThrow(
  docsInstall,
  /https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v[^/]+\/trnovel-v[^/]+-windows-x86_64\.tar\.gz/,
  `${releaseBaseUrl}/trnovel-v${version}-windows-x86_64.tar.gz`,
  "docs/src/content/docs/guides/install.mdx"
);
docsInstall = replaceOrThrow(
  docsInstall,
  /https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v[^/]+\/trnovel-v[^/]+-macos-arm64\.tar\.gz/,
  `${releaseBaseUrl}/trnovel-v${version}-macos-arm64.tar.gz`,
  "docs/src/content/docs/guides/install.mdx"
);
docsInstall = replaceOrThrow(
  docsInstall,
  /https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v[^/]+\/trnovel-v[^/]+-linux-x86_64\.tar\.gz/,
  `${releaseBaseUrl}/trnovel-v${version}-linux-x86_64.tar.gz`,
  "docs/src/content/docs/guides/install.mdx"
);
docsInstall = replaceOrThrow(
  docsInstall,
  /https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v[^/]+\/trnovel-v[^/]+-macos-x86_64\.tar\.gz/,
  `${releaseBaseUrl}/trnovel-v${version}-macos-x86_64.tar.gz`,
  "docs/src/content/docs/guides/install.mdx"
);
writeFile("docs/src/content/docs/guides/install.mdx", docsInstall);

let docsIndex = readFile("docs/src/content/docs/index.mdx");
docsIndex = replaceOrThrow(
  docsIndex,
  /link: https:\/\/github\.com\/[^/]+\/[^/\n]+/,
  `link: ${githubUrl}`,
  "docs/src/content/docs/index.mdx"
);
writeFile("docs/src/content/docs/index.mdx", docsIndex);

let faq = readFile("docs/src/content/docs/reference/question.md");
faq = replaceOrThrow(
  faq,
  /\[TRNovel GitHub Issues\]\([^)]+\)/,
  `[TRNovel GitHub Issues](${githubUrl}/issues)`,
  "docs/src/content/docs/reference/question.md"
);
faq = replaceOrThrow(
  faq,
  /\[TRNovel 讨论区\]\([^)]+\)/,
  `[TRNovel 讨论区](${githubUrl}/discussions)`,
  "docs/src/content/docs/reference/question.md"
);
writeFile("docs/src/content/docs/reference/question.md", faq);

let astroConfig = readFile("docs/astro.config.mjs");
astroConfig = replaceOrThrow(
  astroConfig,
  /href: "https:\/\/github\.com\/[^/]+\/[^"]+"/,
  `href: "${githubUrl}"`,
  "docs/astro.config.mjs"
);
writeFile("docs/astro.config.mjs", astroConfig);

let cliSource = readFile("src/lib.rs");
cliSource = replaceOrThrow(
  cliSource,
  /GitHub: https:\/\/github\.com\/[^\s"]+/,
  `GitHub: ${githubUrl}`,
  "src/lib.rs"
);
writeFile("src/lib.rs", cliSource);

let cliReadme = readFile("packages/cli/README.md");
cliReadme = replaceOrThrow(
  cliReadme,
  /^# [^\n]+/m,
  `# ${packageName}`,
  "packages/cli/README.md"
);
cliReadme = replaceOrThrow(
  cliReadme,
  /`[^`]+` is the npm-distributed CLI wrapper for TRNovel\./,
  `\`${packageName}\` is the npm-distributed CLI wrapper for TRNovel.`,
  "packages/cli/README.md"
);
cliReadme = replaceOrThrow(
  cliReadme,
  /npm install -g [^\n]+/,
  `npm install -g ${packageName}`,
  "packages/cli/README.md"
);
cliReadme = replaceOrThrow(
  cliReadme,
  /npx [^\n]+ -h/,
  `npx ${packageName} -h`,
  "packages/cli/README.md"
);
writeFile("packages/cli/README.md", cliReadme);

for (const platformPackage of config.platformPackages) {
  const platformReadmePath = `packages/${platformPackage.directory}/README.md`;
  let platformReadme = readFile(platformReadmePath);
  platformReadme = replaceOrThrow(
    platformReadme,
    /^# [^\n]+/m,
    `# ${platformPackageName(config, platformPackage)}`,
    platformReadmePath
  );
  platformReadme = replaceOrThrow(
    platformReadme,
    /Internal platform package for `[^`]+`\./,
    `Internal platform package for \`${packageName}\`.`,
    platformReadmePath
  );
  writeFile(platformReadmePath, platformReadme);
}

let publishingGuide = readFile("NPM_PUBLISHING.md");
publishingGuide = replaceOrThrow(
  publishingGuide,
  /The default package name is `[^`]+`/,
  `The default package name is \`${packageName}\``,
  "NPM_PUBLISHING.md"
);
publishingGuide = replaceOrThrow(
  publishingGuide,
  /npx [^\s`]+ -h/,
  `npx ${packageName} -h`,
  "NPM_PUBLISHING.md"
);
writeFile("NPM_PUBLISHING.md", publishingGuide);

console.log(`Synchronized public metadata for ${packageName}`);
console.log(`Repository: ${githubUrl}`);
console.log(`Docs URL: ${githubPagesUrl}`);
