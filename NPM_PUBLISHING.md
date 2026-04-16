# npm Publishing

This repository now includes an npm distribution layer for the Rust CLI. The default package name is `@ir2026/trnovel`, backed by platform-specific optional dependency packages that carry the prebuilt binaries.

The repository also pins Rust `1.88.0` in [rust-toolchain.toml](./rust-toolchain.toml), and the GitHub Actions workflows are aligned to the same toolchain.

## Layout

- `packages/cli`: the public npm package that exposes the `trnovel` and `trn` commands.
- `packages/trnovel-*`: internal platform packages that contain a single prebuilt binary.
- `scripts/sync-npm-version.mjs`: syncs every npm package version to the Rust version in [Cargo.toml](./Cargo.toml).
- `scripts/stage-binaries.mjs`: copies CI build artifacts into the platform packages before publishing.
- `scripts/stage-local-binary.mjs`: copies a locally built release binary into the current platform package for local verification.
- `npm-packages.config.json`: the one place to change your npm scope and supported platform package map.

## Change the npm scope

Edit [npm-packages.config.json](./npm-packages.config.json) and change the `scope` field before your first publish.

```json
{
  "scope": "@your-scope"
}
```

Then run:

```bash
npm run npm:sync-all
```

That updates the package names and versions inside `packages/`, and also refreshes the public-facing README/docs links for your current `origin` GitHub remote.

## Local verification

Build the Rust binary first:

```bash
cargo build --release --bin trnovel
```

Sync package versions and stage the current platform binary:

```bash
npm run npm:sync-all
npm run npm:stage-local
npm run npm:smoke-test
```

Create tarballs:

```bash
npm pack ./packages/cli
npm pack ./packages/trnovel-darwin-arm64
```

Replace the platform package above with the one that matches your machine. On this repository, the supported package directories are:

- `packages/trnovel-darwin-arm64`
- `packages/trnovel-darwin-x64`
- `packages/trnovel-linux-x64-gnu`
- `packages/trnovel-win32-x64-msvc`

For a full install test, install the platform tarball first and the CLI tarball second in a temporary directory or global prefix, then run:

```bash
trnovel -h
```

## CI publish flow

The workflow [npm-publish.yml](./.github/workflows/npm-publish.yml) triggers on `v*` tags and on manual dispatch.

It does the following:

1. Builds `trnovel` for each supported target.
2. Uploads the raw binaries as workflow artifacts.
3. Syncs npm package versions to the Rust version from `Cargo.toml`.
4. Stages each artifact into the matching platform package.
5. Runs a Linux smoke test by installing the packed platform tarball and the CLI tarball together, then executing `trnovel -h`.
6. Publishes the platform packages first.
7. Publishes the public CLI package last.

## GitHub secrets required

Add this repository secret before the first publish:

- `NPM_TOKEN`: an npm automation token with permission to publish your scoped packages.

## Release checklist

1. Update your Rust crate version.
2. Push the commit.
3. Create and push a `vX.Y.Z` tag.
4. Wait for the npm publish workflow to finish.
5. Validate with:

```bash
npx @ir2026/trnovel -h
```
