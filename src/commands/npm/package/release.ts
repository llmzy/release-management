/*
 * Copyright (c) 2020, salesforce.com, inc.
 * Modifications Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import os from 'node:os';

import { Messages, SfError } from '@salesforce/core';
import { Flags, SfCommand, Ux } from '@salesforce/sf-plugins-core';
import { isString } from '@salesforce/ts-types';
import chalk from 'chalk';

import { SigningResponse } from '../../../codeSigning/SimplifiedSigning.js';
import { verifyDependencies } from '../../../dependencies.js';
import { PackageInfo } from '../../../repository.js';
import { Access, PackageRepo } from '../../../repository.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@llmzy/release-management', 'npm.package.release');

export type ReleaseResult = {
  version: string;
  name: string;
};

export default class Release extends SfCommand<ReleaseResult> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    dryrun: Flags.boolean({
      char: 'd',
      default: false,
      summary: messages.getMessage('flags.dryrun.summary'),
    }),
    sign: Flags.boolean({
      char: 's',
      default: false,
      summary: messages.getMessage('flags.sign.summary'),
    }),
    npmtag: Flags.string({
      char: 't',
      default: 'latest',
      summary: messages.getMessage('flags.npmtag.summary'),
    }),
    npmaccess: Flags.string({
      char: 'a',
      default: 'public',
      summary: messages.getMessage('flags.npmaccess.summary'),
    }),
    install: Flags.boolean({
      default: true,
      summary: messages.getMessage('flags.install.summary'),
      allowNo: true,
    }),
    prerelease: Flags.string({
      summary: messages.getMessage('flags.prerelease.summary'),
    }),
    verify: Flags.boolean({
      summary: messages.getMessage('flags.verify.summary'),
      default: true,
      allowNo: true,
    }),
    githubtag: Flags.string({
      summary: messages.getMessage('flags.githubtag.summary'),
    }),
  };

  public async run(): Promise<ReleaseResult> {
    const { flags } = await this.parse(Release);
    const deps = verifyDependencies(flags);
    if (deps.failures > 0) {
      const errType = 'MissingDependencies';
      const missing = deps.results
        .filter((d) => d.passed === false)
        .map((d) => d.message)
        .filter(isString);
      throw new SfError(messages.getMessage(errType), errType, missing);
    }

    const pkg = await PackageRepo.create({
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
      useprerelease: flags.prerelease,
    });

    await pkg.writeNpmToken();

    if (flags.githubtag) {
      this.log(`Using Version: ${pkg.nextVersion}`);
    }

    if (flags.install) {
      pkg.printStage('Install');
      pkg.install();

      pkg.printStage('Build');
      pkg.build();
    }

    let signature: SigningResponse | undefined;
    if (flags.sign && !flags.dryrun) {
      pkg.printStage('Sign and Upload Security Files');
      signature = await pkg.sign();
    }

    pkg.printStage('Publish');
    try {
      await pkg.publish({
        ...(signature ? { signatures: [signature] } : {}),
        access: flags.npmaccess as Access,
        tag: flags.npmtag,
        dryrun: flags.dryrun,
      });
    } catch (err) {
      if (!(err instanceof Error) || typeof err !== 'string') {
        throw err;
      }
      this.error(err, { code: 'NPM_PUBLISH_FAILED', exit: 1 });
    }

    if (!flags.dryrun && flags.verify) {
      pkg.printStage('Waiting For Availability');
      const found = await pkg.waitForAvailability();
      if (!found) {
        this.warn(`Exceeded timeout waiting for ${pkg.name}@${pkg.nextVersion} to become available`);
      }
    }

    if (flags.sign && flags.verify && !flags.dryrun) {
      pkg.printStage('Verify Signed Packaged');
      await this.verifySign(pkg.getPkgInfo());
    }

    this.log(pkg.getSuccessMessage());

    return {
      version: pkg.nextVersion,
      name: pkg.name,
    };
  }

  protected async verifySign(pkgInfo: PackageInfo): Promise<void> {
    const cmd = 'npm:package:verify';
    const argv = ['--npm', `${pkgInfo.name}@${pkgInfo.nextVersion}`];

    // Split registry parameter into separate flag and value
    if (pkgInfo.registryParam) {
      const [flag, value] = pkgInfo.registryParam.split(/\s+/);
      argv.push(flag, value);
    }

    this.log(chalk.dim(`llmzy-release ${cmd} ${argv.join(' ')}`) + os.EOL);
    try {
      await this.config.runCommand(cmd, argv);
    } catch (err) {
      if (!(err instanceof Error) || typeof err !== 'string') {
        throw err;
      }
      throw new SfError(err, 'FailedCommandExecution');
    }
  }
}
