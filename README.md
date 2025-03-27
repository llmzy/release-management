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

4. **Compatibility with NPM Projects**

   The package now supports both npm and Yarn package managers for target projects:

   - **Automatic Package Manager Detection**

     - Detects package manager based on presence of `yarn.lock` or `package-lock.json`
     - Checks `packageManager` field in package.json
     - Falls back to npm if no clear indicator is found

   - **Package Manager Features**

     - Supports all npm/Yarn commands (install, build, publish, etc.)
     - Handles registry-specific configurations
     - Manages package signing and verification for both managers
     - Preserves lockfile integrity during operations

   - **Registry Support**
     - Works with npm registry
     - Supports GitHub Packages
     - Handles private registries
     - Maintains authentication for both package managers

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

Please report any issues at <https://github.com/forcedotcom/cli/issues>

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
Agreement. You can do so by going to <https://cla.salesforce.com/sign-cla>.

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

- [`llmzy-release channel promote`](#llmzy-release-channel-promote)
- [`llmzy-release cli artifacts compare`](#llmzy-release-cli-artifacts-compare)
- [`llmzy-release cli install jit test`](#llmzy-release-cli-install-jit-test)
- [`llmzy-release cli install test`](#llmzy-release-cli-install-test)
- [`llmzy-release cli release automerge`](#llmzy-release-cli-release-automerge)
- [`llmzy-release cli release build`](#llmzy-release-cli-release-build)
- [`llmzy-release cli releasenotes`](#llmzy-release-cli-releasenotes)
- [`llmzy-release cli tarballs prepare`](#llmzy-release-cli-tarballs-prepare)
- [`llmzy-release cli tarballs smoke`](#llmzy-release-cli-tarballs-smoke)
- [`llmzy-release cli tarballs verify`](#llmzy-release-cli-tarballs-verify)
- [`llmzy-release cli versions inspect`](#llmzy-release-cli-versions-inspect)
- [`llmzy-release dependabot automerge`](#llmzy-release-dependabot-automerge)
- [`llmzy-release github check closed`](#llmzy-release-github-check-closed)
- [`llmzy-release npm dependencies pin`](#llmzy-release-npm-dependencies-pin)
- [`llmzy-release npm package release`](#llmzy-release-npm-package-release)
- [`llmzy-release npm package verify`](#llmzy-release-npm-package-verify)
- [`llmzy-release repositories`](#llmzy-release-repositories)

## `llmzy-release channel promote`

promote a s3 channel

```
USAGE
  $ llmzy-release channel promote -t <value> -c sf|sfdx [--json] [--flags-dir <value>] [-d] [-C <value>] [-p
    win|macos|deb...] [-s <value>] [-m <value>] [-i] [-x] [-T linux-x64|linux-arm|win32-x64|win32-x86|darwin-x64...] [-v
    <value>]

FLAGS
  -C, --promote-from-channel=<value>     the channel name that you want to promote
  -T, --architecture-target=<option>...  comma-separated targets to promote (e.g.: linux-arm,win32-x64)
                                         <options: linux-x64|linux-arm|win32-x64|win32-x86|darwin-x64>
  -c, --cli=<option>                     (required) the cli name to promote
                                         <options: sf|sfdx>
  -d, --dryrun                           If true, only show what would happen
  -i, --[no-]indexes                     append the promoted urls into the index files
  -m, --max-age=<value>                  [default: 300] cache control max-age in seconds
  -p, --platform=<option>...             the platform to promote
                                         <options: win|macos|deb>
  -s, --sha=<value>                      the short sha to promote
  -t, --promote-to-channel=<value>       (required) [default: stable] the channel name that you are promoting to
  -v, --version=<value>                  the version of the candidate to be promoted, which must exist already in s3.
                                         Used to fetch the correct sha
  -x, --[no-]xz                          also upload xz

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  promote a s3 channel

  promote a s3 channel

EXAMPLES
  $ llmzy-release channel promote --candidate latest-rc --target latest --platform win --platform mac
```

_See code: [src/commands/channel/promote.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/channel/promote.ts)_

## `llmzy-release cli artifacts compare`

Look for breaking changes in artifacts (schemas and snapshots) from plugins. Must be run in CLI directory.

```
USAGE
  $ llmzy-release cli artifacts compare [--json] [--flags-dir <value>] [-p <value>...] [-r <value>] [-c <value>]

FLAGS
  -c, --current=<value>    Current CLI version to compare against. Defaults to the version on the CLI in the current
                           directory.
  -p, --plugin=<value>...  List of plugins to check for breaking changes.
  -r, --previous=<value>   Previous CLI version to compare against. Defaults to the last published version.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

EXAMPLES
  $ llmzy-release cli artifacts compare
```

_See code: [src/commands/cli/artifacts/compare.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/artifacts/compare.ts)_

## `llmzy-release cli install jit test`

Test that all JIT plugins can be successfully installed.

```
USAGE
  $ llmzy-release cli install jit test [--json] [--flags-dir <value>] [-j <value>...]

FLAGS
  -j, --jit-plugin=<value>...  JIT plugin(s) to test, example: @salesforce/plugin-community

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

EXAMPLES
  $ llmzy-release cli install jit test
```

_See code: [src/commands/cli/install/jit/test.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/install/jit/test.ts)_

## `llmzy-release cli install test`

install sf or sfdx

```
USAGE
  $ llmzy-release cli install test -c sf|sfdx -m installer|npm|tarball [--json] [--flags-dir <value>] [--channel
    legacy|stable|stable-rc|latest|latest-rc] [--output-file <value>]

FLAGS
  -c, --cli=<option>         (required) the cli to install
                             <options: sf|sfdx>
  -m, --method=<option>      (required) the installation method to use
                             <options: installer|npm|tarball>
      --channel=<option>     [default: stable] the channel to install from
                             <options: legacy|stable|stable-rc|latest|latest-rc>
      --output-file=<value>  [default: test-results.json] the file to write the JSON results to (must be .json)

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  install sf or sfdx

  install sf or sfdx

EXAMPLES
  $ llmzy-release cli install test --cli sfdx --method installer

  $ llmzy-release cli install test --cli sfdx --method npm

  $ llmzy-release cli install test --cli sfdx --method tarball

  $ llmzy-release cli install test --cli sf --method tarball

  $ llmzy-release cli install test --cli sf --method tarball --channel stable-rc
```

_See code: [src/commands/cli/install/test.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/install/test.ts)_

## `llmzy-release cli release automerge`

Attempt to automerge nightly PR

```
USAGE
  $ llmzy-release cli release automerge (--owner <value> --repo <value>) --pull-number <value> [--json] [--flags-dir
    <value>] [-d] [--verbose]

FLAGS
  -d, --dry-run              Run all checks, but do not merge PR
      --owner=<value>        (required) Github owner (org), example: salesforcecli
      --pull-number=<value>  (required) Github pull request number to merge
      --repo=<value>         (required) Github repo, example: sfdx-cli
      --verbose              Show additional debug output

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Attempt to automerge nightly PR

  Attempt to automerge nightly PR

EXAMPLES
  $ llmzy-release cli release automerge --owner salesforcecli --repo sfdx-cli --pul-number 1049
```

_See code: [src/commands/cli/release/automerge.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/release/automerge.ts)_

## `llmzy-release cli release build`

builds a new release from a designated starting point and optionally creates PR in Github

```
USAGE
  $ llmzy-release cli release build -c <value> [--json] [--flags-dir <value>] [-d <value>] [-g <value>] [--build-only]
    [--resolutions] [--only <value>...] [--pinned-deps] [--jit] [--label <value>...] [--patch] [--empty]
    [--pr-base-branch <value>]

FLAGS
  -c, --release-channel=<value>          (required) the channel intended for this release, examples: nightly, latest-rc,
                                         latest, dev, beta, etc...
  -d, --start-from-npm-dist-tag=<value>  the npm dist-tag to start the release from, examples: nightly, latest-rc
  -g, --start-from-github-ref=<value>    a Github ref to start the release from, examples: main, 7.144.0, f476e8e
      --build-only                       only build the release, do not git add/commit/push
      --empty                            create an empty release PR for pushing changes to later (version will still be
                                         bumped)
      --[no-]jit                         bump the versions of the packages listed in the jitPlugins (just-in-time)
                                         section
      --label=<value>...                 add one or more labels to the Github PR
      --only=<value>...                  only bump the version of the packages passed in, uses latest if version is not
                                         provided
      --patch                            bump the release as a patch of an existing version, not a new minor version
      --[no-]pinned-deps                 bump the versions of the packages listed in the pinnedDependencies section
      --pr-base-branch=<value>           base branch to create the PR against; if not specified, the build determines
                                         the branch for you
      --[no-]resolutions                 bump the versions of packages listed in the resolutions section

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  builds a new release from a designated starting point and optionally creates PR in Github

  builds a new release from a designated starting point and optionally creates PR in Github

ALIASES
  $ llmzy-release cli latestrc build

EXAMPLES
  $ llmzy-release cli release build

  $ llmzy-release cli release build --patch

  $ llmzy-release cli release build --start-from-npm-dist-tag latest-rc --patch

  $ llmzy-release cli release build --start-from-github-ref 7.144.0

  $ llmzy-release cli release build --start-from-github-ref main

  $ llmzy-release cli release build --start-from-github-ref f476e8e

  $ llmzy-release cli release build --start-from-github-ref main --prerelease beta

  $ llmzy-release cli release build --build-only

  $ llmzy-release cli release build --only @salesforce/plugin-source,@salesforce/plugin-info@1.2.3
```

_See code: [src/commands/cli/release/build.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/release/build.ts)_

## `llmzy-release cli releasenotes`

pull all relevant information for writing release notes.

```
USAGE
  $ llmzy-release cli releasenotes -c sf|sfdx [--json] [--flags-dir <value>] [-s <value>] [-m]

FLAGS
  -c, --cli=<option>   (required) the cli to pull information for
                       <options: sf|sfdx>
  -m, --markdown       format the output in markdown
  -s, --since=<value>  the version number of the previous release. Defaults to the latest-rc version on npm

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  pull all relevant information for writing release notes.
  Requires the GH_TOKEN to be set in the environment.

  pull all relevant information for writing release notes.
  Requires the GH_TOKEN to be set in the environment.

EXAMPLES
  $ llmzy-release cli releasenotes --cli sf

  $ llmzy-release cli releasenotes --cli sfdx

  $ llmzy-release cli releasenotes --cli sf --since 1.0.0

  $ llmzy-release cli releasenotes --cli sfdx --since 7.19.0

  $ llmzy-release cli releasenotes --cli sf > changes.txt

  $ llmzy-release cli releasenotes --cli sf --markdown > changes.md
```

_See code: [src/commands/cli/releasenotes.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/releasenotes.ts)_

## `llmzy-release cli tarballs prepare`

remove unnecessary files from node_modules

```
USAGE
  $ llmzy-release cli tarballs prepare [--json] [--flags-dir <value>] [-d] [-t] [--verbose]

FLAGS
  -d, --dryrun   only show what would be removed from node_modules
  -t, --types    remove all types (.d.ts) files from node_modules
      --verbose  show all files paths being removed

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  remove unnecessary files from node_modules

  remove unnecessary files from node_modules

EXAMPLES
  $ llmzy-release cli tarballs prepare
```

_See code: [src/commands/cli/tarballs/prepare.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/tarballs/prepare.ts)_

## `llmzy-release cli tarballs smoke`

smoke tests for the sf CLI

```
USAGE
  $ llmzy-release cli tarballs smoke [--json] [--flags-dir <value>] [--verbose]

FLAGS
  --verbose  show the --help output for each command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  smoke tests for the sf CLI
  Tests that the CLI and every command can be initialized.

  smoke tests for the sf CLI
  Tests that the CLI and every command can be initialized.

EXAMPLES
  $ llmzy-release cli tarballs smoke

  $ llmzy-release cli tarballs smoke
```

_See code: [src/commands/cli/tarballs/smoke.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/tarballs/smoke.ts)_

## `llmzy-release cli tarballs verify`

verify that tarballs are ready to be uploaded

```
USAGE
  $ llmzy-release cli tarballs verify [--json] [--flags-dir <value>] [-c sf|sfdx] [-w <value>]

FLAGS
  -c, --cli=<option>                     [default: sfdx] the cli to verify
                                         <options: sf|sfdx>
  -w, --windows-username-buffer=<value>  [default: 41] the number of characters to allow for windows usernames

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  verify that tarballs are ready to be uploaded

  verify that tarballs are ready to be uploaded

EXAMPLES
  $ llmzy-release cli tarballs verify

  $ llmzy-release cli tarballs verify --cli sfdx

  $ llmzy-release cli tarballs verify --cli sf
```

_See code: [src/commands/cli/tarballs/verify.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/tarballs/verify.ts)_

## `llmzy-release cli versions inspect`

inspect the CLI version across all install paths

```
USAGE
  $ llmzy-release cli versions inspect -c stable|stable-rc|latest|latest-rc|nightly... -l archive|npm... [--json]
    [--flags-dir <value>] [-d <value>...] [-s] [--ignore-missing]

FLAGS
  -c, --channels=<option>...     (required) the channel you want to inspect (for achives, latest and latest-rc are
                                 translated to stable and stable-rc. And vice-versa for npm)
                                 <options: stable|stable-rc|latest|latest-rc|nightly>
  -d, --dependencies=<value>...  glob pattern of dependencies you want to see the version of
  -l, --locations=<option>...    (required) the location you want to inspect
                                 <options: archive|npm>
  -s, --salesforce               show versions of salesforce owned dependencies
      --ignore-missing           skip missing archives. Useful when supporting new architectures in oclif

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  inspect the CLI version across all install paths

  inspect the CLI version across all install paths

EXAMPLES
  $ llmzy-release cli versions inspect -l archive -c stable

  $ llmzy-release cli versions inspect -l archive -c stable-rc

  $ llmzy-release cli versions inspect -l archive npm -c stable

  $ llmzy-release cli versions inspect -l archive npm -c latest

  $ llmzy-release cli versions inspect -l archive npm -c latest latest-rc

  $ llmzy-release cli versions inspect -l archive npm -c stable stable-rc

  $ llmzy-release cli versions inspect -l npm -c latest --salesforce

  $ llmzy-release cli versions inspect -l npm -c latest -d @salesforce/core

  $ llmzy-release cli versions inspect -l npm -c latest -d @salesforce/\*\*/ salesforce-alm

  $ llmzy-release cli versions inspect -l npm -c latest -d chalk -s
```

_See code: [src/commands/cli/versions/inspect.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/cli/versions/inspect.ts)_

## `llmzy-release dependabot automerge`

automatically merge one green, mergeable PR up to the specified maximum bump type

```
USAGE
  $ llmzy-release dependabot automerge -m major|minor|patch [--json] [--flags-dir <value>] [-o <value> -r <value>] [-d]
    [-s] [--merge-method merge|squash|rebase]

FLAGS
  -d, --dryrun                     only show what would happen if you consolidated dependabot PRs
  -m, --max-version-bump=<option>  (required) [default: minor] the maximum version bump you want to be included
                                   <options: major|minor|patch>
  -o, --owner=<value>              the organization that the repository belongs to. This defaults to the owner specified
                                   in the package.json
  -r, --repo=<value>               the repository you want to consolidate PRs on. This defaults to the repository
                                   specified in the package.json
  -s, --skip-ci                    add [skip ci] to the merge commit title
      --merge-method=<option>      [default: merge] merge method to use
                                   <options: merge|squash|rebase>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  automatically merge one green, mergeable PR up to the specified maximum bump type

  automatically merge one green, mergeable PR up to the specified maximum bump type

EXAMPLES
  $ llmzy-release dependabot automerge --max-version-bump patch

  $ llmzy-release dependabot automerge --max-version-bump minor

  $ llmzy-release dependabot automerge --max-version-bump major
```

_See code: [src/commands/dependabot/automerge.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/dependabot/automerge.ts)_

## `llmzy-release github check closed`

Show open Github issues with GUS WI

```
USAGE
  $ llmzy-release github check closed -o <value> --github-token <value> [--json] [--flags-dir <value>]

FLAGS
  -o, --gus=<value>           (required) Username/alias of your GUS org connection
      --github-token=<value>  (required) Github token--store this in the environment as GITHUB_TOKEN

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Show open Github issues with GUS WI

  Description of a command.

EXAMPLES
  $ llmzy-release github check closed -o me@gus.com
```

_See code: [src/commands/github/check/closed.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/github/check/closed.ts)_

## `llmzy-release npm dependencies pin`

lock a list of dependencies to a target tag or default to 'latest', place these entries in 'pinnedDependencies' entry in the package.json

```
USAGE
  $ llmzy-release npm dependencies pin [--json] [--flags-dir <value>] [-d] [-t <value>]

FLAGS
  -d, --dryrun       If true, will not make any changes to the package.json
  -t, --tag=<value>  [default: latest] The name of the tag you want, e.g. 'latest-rc', or 'latest'

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  lock a list of dependencies to a target tag or default to 'latest', place these entries in 'pinnedDependencies' entry
  in the package.json

  lock a list of dependencies to a target tag or default to 'latest', place these entries in 'pinnedDependencies' entry
  in the package.json
```

_See code: [src/commands/npm/dependencies/pin.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/npm/dependencies/pin.ts)_

## `llmzy-release npm package release`

publish npm package

```
USAGE
  $ llmzy-release npm package release [--json] [--flags-dir <value>] [-d] [-s] [-t <value>] [-a <value>] [--install]
    [--prerelease <value>] [--verify] [--githubtag <value>]

FLAGS
  -a, --npmaccess=<value>   [default: public] access level to use when publishing to npm
  -d, --dryrun              If true, will not commit changes to repo or push any tags
  -s, --sign                If true, then the package will be signed and the signature will be uploaded to S3
  -t, --npmtag=<value>      [default: latest] tag to use when publishing to npm
      --githubtag=<value>   given a github tag, release the version specified in the package.json as is. Useful when
                            you've already done a release and only need npm publish features
      --[no-]install        run yarn install and build on repository
      --prerelease=<value>  determine the next version as <version>-<prerelease>.0 if version is not manually set
      --[no-]verify         verify npm registry has new version after publish and digital signature

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  publish npm package

  publish npm package

EXAMPLES
  $ llmzy-release npm package release

  $ llmzy-release npm package release --dryrun

  $ llmzy-release npm package release --sign
```

_See code: [src/commands/npm/package/release.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/npm/package/release.ts)_

## `llmzy-release npm package verify`

Verify the digital signature of an npm package.

```
USAGE
  $ llmzy-release npm package verify -n <value> [--json] [--flags-dir <value>] [-r <value>]

FLAGS
  -n, --npm=<value>       (required) The npm package name and version to verify (e.g., package-name@1.0.0 or
                          @scope/package-name@1.0.0)
  -r, --registry=<value>  The npm registry URL to use (default: https://registry.npmjs.org/)

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Verify the digital signature of an npm package.

  Verify the digital signature of an npm package.

EXAMPLES
  $ llmzy-release npm package verify --npm package-name@1.0.0

  $ llmzy-release npm package verify --npm @scope/package-name@1.0.0

  $ llmzy-release npm package verify --npm package-name@1.0.0 --registry https://registry.npmjs.org/
```

_See code: [src/commands/npm/package/verify.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/npm/package/verify.ts)_

## `llmzy-release repositories`

list repositories owned and supported by Salesforce CLI

```
USAGE
  $ llmzy-release repositories [--json] [--flags-dir <value>] [--columns <value> | -x] [--filter <value>]
    [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -x, --extended         Show extra columns.
      --columns=<value>  Only show provided columns (comma-separated).
      --csv              Output is csv format.
      --filter=<value>   Filter property by partial string matching, ex: name=foo.
      --no-header        Hide table header from output.
      --no-truncate      Do not truncate output to fit screen.
      --output=<option>  Output in a more machine friendly format.
                         <options: csv|json|yaml>
      --sort=<value>     Property to sort by (prepend '-' for descending).

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  list repositories owned and supported by Salesforce CLI
  For more information on the list of repositories, visit https://github.com/salesforcecli/status.

  list repositories owned and supported by Salesforce CLI
  For more information on the list of repositories, visit https://github.com/salesforcecli/status.

EXAMPLES
  $ llmzy-release repositories --columns=url --filter='Name=sfdx-core' --no-header | xargs open

  $ llmzy-release repositories --json | jq -r '.result[] | select(.name=="sfdx-core") | .packages[] | .url
```

_See code: [src/commands/repositories/index.ts](https://github.com/llmzy/release-management/blob/1.1.3/src/commands/repositories/index.ts)_

<!-- commandsstop -->
