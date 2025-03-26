/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TargetPackageManager } from './index.js';

/**
 * Implementation of TargetPackageManager for Yarn
 */
export class YarnTargetManager implements TargetPackageManager {
  public constructor(private readonly projectRoot: string) {}

  /**
   * Get the yarn install command
   *
   * @param registryParam The registry parameter to use (e.g. --registry=https://registry.npmjs.org/)
   * @returns The yarn install command string
   */
  public getInstallCommand(registryParam?: string): string {
    const registryArg = registryParam ? ` ${registryParam}` : '';
    return `yarn install --cwd ${this.projectRoot}${registryArg}`;
  }

  /**
   * Get the yarn dedupe command
   *
   * @returns The yarn dedupe command string
   */
  public getDeduplicateCommand(): string {
    return `yarn dedupe --cwd ${this.projectRoot}`;
  }

  /**
   * Get the yarn build command
   *
   * @returns The yarn build command string
   */
  public getBuildCommand(): string {
    return `yarn run build --cwd ${this.projectRoot}`;
  }

  /**
   * Get the yarn script command
   *
   * @param script The script name to run
   * @returns The yarn script command string
   */
  public getScriptCommand(script: string): string {
    return `yarn ${script} --cwd ${this.projectRoot}`;
  }

  /**
   * Get the yarn publish command
   *
   * @param registryParam The registry parameter to use (e.g. --registry=https://registry.npmjs.org/)
   * @param access The access level (public or restricted)
   * @param tag The tag to publish with
   * @param dryrun Whether to do a dry run
   * @param tarball Optional tarball to publish
   * @returns The yarn publish command string
   */
  public getPublishCommand(
    registryParam?: string,
    access?: string,
    tag?: string,
    dryrun?: boolean,
    tarball?: string
  ): string {
    let cmd = `yarn publish --cwd ${this.projectRoot}`;
    if (registryParam) cmd += ` ${registryParam}`;
    if (access) cmd += ` --access ${access}`;
    if (tag) cmd += ` --tag ${tag}`;
    if (dryrun) cmd += ' --dry-run';
    if (tarball) cmd += ` ${tarball}`;
    return cmd;
  }
}
