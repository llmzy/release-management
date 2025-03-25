# @llmzy/release-management

This package is a fork of [@salesforce/plugin-release-management@5.6.60](https://www.npmjs.com/package/@salesforce/plugin-release-management), modified to work with Llmzy's infrastructure for package signing and verification.

[![NPM](https://img.shields.io/npm/v/@llmzy/release-management.svg?label=@llmzy/release-management)](https://www.npmjs.com/package/@llmzy/release-management) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-release-management.svg)](https://npmjs.org/package/@salesforce/plugin-release-management) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-release-management/main/LICENSE.txt)

## Key Changes from Original Package

This fork maintains the core functionality of the original package while
adapting it for Llmzy's infrastructure:

1. **Infrastructure Updates**

   - Changed S3 bucket from `dfc-data-production` to `llmzy-downloads-001` (US
     East/Ohio)
   - Updated base URL from developer.salesforce.com to `sigs.llmzy.tools`
   - Modified security paths to use `signatures/` prefix

2. **Package Signing**

   - Updated package.json to use `signatures` property instead of `sfdx`
   - Maintained the same secure RSA-SHA256 signing process
   - Preserved the ephemeral key pair generation for each signing operation

3. **Security**
   - Kept security-critical values hardcoded for enhanced security
   - Maintained AWS credentials configuration via environment variables
   - Preserved all core security features of the original package

Note that this package does quite a bit more than we currently need for the
Llmzy Release process and eventually we should probably move the few bits we
need into an entirely new system. We currently depend on the following commands:

- `llmzy-release npm package release --sign` - Signs and publishes npm packages with our
  signature infrastructure. The build process uses either yarn or npm depending
  on what is used natively by the package being released.
- `llmzy-release npm package verify` - Verifies package signatures during
  installation, implementing a parallel approach to the release command.

All other commands (CLI release management, channel promotion, artifact
comparison, etc.) are inherited from the original package but are not currently
used in the Llmzy release process.

## Original Package Description

Plugin designed to handle all tasks related to signing, releasing, and testing npm packages.

## Releases

The following steps are automated for package releases

### Version Bump | Prerelease | ChangeLog

This plugin will not bump your package version for you. Use <https://github.com/salesforcecli/github-workflows?tab=readme-ov-file#githubrelease> and conventional commit tags to manage that.

It used to.

### Build

After determining the next version, the plugin builds the package using `yarn build`. This means that you must have a `build` script included in the package.json

### Signing

If you pass the `--sign (-s)` flag into the release command, then the plugin will sign the package and verify that the signature exists in S3.

### Publishing

Once the package has been built and signed it will be published to npm. The command will not exit until the new version is found on the npm registry.

## Install

```bash
npm install -g @llmzy/release-management
```

## Usage

The package maintains all the functionality of the original with updated paths:

```bash
# Sign and release a package
llmzy-release npm package release --sign

# Verify a package
llmzy-release plugins trust verify --npm <package-name>@<version>
```

Signature files will be stored at:

- Public Key: `https://sigs.llmzy.tools/signatures/{packageName}/{version}.crt`
- Signature: `https://sigs.llmzy.tools/signatures/{packageName}/{version}.sig`

## Environment Variables

Required AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-release-management

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev npm
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sfdx cli
sfdx plugins:link .
# To verify
sfdx plugins
```

# Commands

<!-- commands -->

- [`llmzy-release plugins trust verify`](#llmzy-release-plugins-trust-verify)

## `llmzy-release plugins trust verify`

Validate a digital signature.

```
USAGE
  $ llmzy-release plugins trust verify -n <value> [--json] [--flags-dir <value>] [-r <value>]

FLAGS
  -n, --npm=<value>       (required) Specify the npm name. This can include a tag/version.
  -r, --registry=<value>  The registry name. The behavior is the same as npm.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate a digital signature.

  Verifies the digital signature on an npm package matches the signature and key stored at the expected URLs.

EXAMPLES
  $ llmzy-release plugins trust verify --npm @scope/npmName --registry https://npm.pkg.github.com

  $ llmzy-release plugins trust verify --npm @scope/npmName
```

_See code: [@salesforce/plugin-trust](https://github.com/salesforcecli/plugin-trust/blob/v3.7.69/src/commands/plugins/trust/verify.ts)_

<!-- commandsstop -->
