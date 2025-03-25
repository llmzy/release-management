/*
 * Copyright (c) 2020, salesforce.com, inc.
 * Modifications Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import os from 'node:os';
import shelljs from 'shelljs';
import chalk from 'chalk';
import { AsyncOptionalCreatable, Env, sleep } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { SfError } from '@salesforce/core';
import { Registry } from './registry.js';
import { TargetPackageManager } from './targetPackageManager/index.js';
import { detectPackageManager } from './targetPackageManager/detection.js';
import { api as packAndSignApi } from './codeSigning/packAndSign.js';
import { SigningResponse } from './codeSigning/SimplifiedSigning.js';
import { Package } from './package.js';

export type Access = 'public' | 'restricted';

type PublishOpts = {
  dryrun?: boolean;
  signatures?: SigningResponse[];
  tag?: string;
  access?: Access;
};

export type PackageInfo = {
  name: string;
  nextVersion: string;
  registryParam: string;
};

type PollFunction = () => boolean;

export type RepositoryOptions = {
  ux?: Ux;
  useprerelease?: string;
};

abstract class Repository extends AsyncOptionalCreatable<RepositoryOptions> {
  protected options?: RepositoryOptions;
  protected ux: Ux;
  protected env: Env;
  protected registry: Registry;
  protected packageManager!: TargetPackageManager;
  private stepCounter = 1;

  public constructor(options: RepositoryOptions | undefined) {
    super(options);
    this.options = options;
    this.ux = options?.ux ?? new Ux();
    this.env = new Env();
    this.registry = new Registry();
  }

  public printStage(stage: string): void {
    this.ux.log(`${chalk.cyan.bold(`[${this.stepCounter++}/${this.stepCounter}]`)} ${stage}`);
  }

  public install(silent = false): void {
    this.execCommand(this.packageManager.getInstallCommand(this.registry.getRegistryParameter()), silent);
  }

  public deduplicate(silent = false): void {
    this.execCommand(this.packageManager.getDeduplicateCommand(), silent);
  }

  public run(script: string, location?: string, silent = false): void {
    if (location) {
      this.execCommand(`(cd ${location} && ${this.packageManager.getScriptCommand(script)})`, silent);
    } else {
      this.execCommand(this.packageManager.getScriptCommand(script), silent);
    }
  }

  public test(): void {
    this.execCommand(this.packageManager.getScriptCommand('test'));
  }

  protected async init(): Promise<void> {
    this.packageManager = detectPackageManager(process.cwd());
    return Promise.resolve();
  }

  protected execCommand(cmd: string, silent?: boolean): shelljs.ShellString {
    if (!silent) this.ux.log(`${chalk.dim(cmd)}${os.EOL}`);
    const result = shelljs.exec(cmd, { silent });
    if (result.code !== 0) {
      throw new SfError(result.stderr, 'FailedCommandExecution');
    } else {
      return result;
    }
  }

  protected async poll(checkFn: PollFunction): Promise<boolean> {
    const isNonTTY = this.env.getBoolean('CI') || this.env.getBoolean('CIRCLECI');
    let found = false;
    let attempts = 0;
    const maxAttempts = 300;
    const start = isNonTTY
      ? (msg: string): void => this.ux.log(msg)
      : (msg: string): void => this.ux.spinner.start(msg);
    const update = isNonTTY
      ? (msg: string): void => this.ux.log(msg)
      : (msg: string): string => (this.ux.spinner.status = msg);
    const stop = isNonTTY ? (msg: string): void => this.ux.log(msg) : (msg: string): void => this.ux.spinner.stop(msg);

    start('Polling for new version(s) to become available on npm');
    while (attempts < maxAttempts && !found) {
      attempts += 1;
      update(`attempt: ${attempts} of ${maxAttempts}`);
      found = checkFn();
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
    }
    stop(attempts >= maxAttempts ? 'failed' : 'done');
    return found;
  }

  public abstract getSuccessMessage(): string;
  public abstract getPkgInfo(packageNames?: string[]): PackageInfo | PackageInfo[];
  public abstract publish(options: PublishOpts): Promise<void>;
  public abstract sign(packageNames?: string[]): Promise<SigningResponse | SigningResponse[]>;
  public abstract waitForAvailability(): Promise<boolean>;
}

export class PackageRepo extends Repository {
  // all props are set in init(), so ! is safe
  public name!: string;
  public nextVersion!: string;
  public package!: Package;
  private useprerelease?: string;

  public constructor(options: RepositoryOptions | undefined) {
    super(options);
    this.useprerelease = options?.useprerelease;
  }

  public getSuccessMessage(): string {
    return chalk.green.bold(`Successfully released ${this.name}@${this.nextVersion}`);
  }

  public getPkgInfo(): PackageInfo {
    return {
      name: this.name,
      nextVersion: this.nextVersion,
      registryParam: this.registry.getRegistryParameter(),
    };
  }

  public async writeNpmToken(): Promise<void> {
    const token = this.env.getString('NPM_TOKEN');
    if (!token) {
      throw new SfError('NPM_TOKEN environment variable is not set');
    }
    await this.registry.setNpmAuth(this.package.location);
  }

  public async publish(opts: PublishOpts = {}): Promise<void> {
    const { dryrun, signatures, access, tag } = opts;
    if (!dryrun) await this.writeNpmToken();
    const cmd = this.packageManager.getPublishCommand(
      this.registry.getRegistryParameter(),
      access,
      tag,
      dryrun,
      signatures?.[0]?.fileTarPath
    );
    this.execCommand(cmd);
  }

  public async sign(): Promise<SigningResponse> {
    packAndSignApi.setUx(this.ux);
    return packAndSignApi.packSignVerifyModifyPackageJSON(this.package.location);
  }

  public async waitForAvailability(): Promise<boolean> {
    return this.poll(() => this.package.nextVersionIsAvailable(this.nextVersion));
  }

  // eslint-disable-next-line class-methods-use-this
  public async revertChanges(): Promise<void> {
    return packAndSignApi.revertPackageJsonIfExists();
  }

  public build(silent = false): void {
    // Check if build script exists in package.json
    if (!this.package.packageJson.scripts?.build) {
      this.ux.log('No build script found in package.json, skipping build step');
      return;
    }
    this.execCommand(this.packageManager.getBuildCommand(), silent);
  }

  protected async init(): Promise<void> {
    await super.init();
    this.package = await Package.create();
    this.name = this.package.name;

    // If the version in package.json doesn't exist in the registry, use it directly
    if (this.package.nextVersionIsHardcoded()) {
      this.nextVersion = this.package.packageJson.version;
    } else {
      // Use standard-version to determine the next version
      const prereleaseArg = this.useprerelease ? ` --prerelease ${this.useprerelease}` : '';
      const cmd = `standard-version --dryrun --skip.tag --skip.changelog --skip.commit${prereleaseArg}`;
      const result = this.execCommand(this.packageManager.getScriptCommand(cmd), true);
      const match = result.stdout.match(/bumping version in .* from .* to (.*)/);
      if (match) {
        this.nextVersion = match[1];
      } else {
        // Fallback to determineNextVersion if standard-version output doesn't match expected format
        this.nextVersion = this.package.determineNextVersion(false, this.useprerelease);
      }
    }
  }
}
