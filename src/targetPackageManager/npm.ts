/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TargetPackageManager } from './index.js';

/**
 * Implementation of TargetPackageManager for npm
 */
export class NpmTargetManager implements TargetPackageManager {
  public constructor(private readonly projectRoot: string) {}

  /**
   * Get the npm install command
   *
   * @param registryParam The registry parameter to use (e.g. --registry=https://registry.npmjs.org/)
   * @returns The npm install command string
   */
  public getInstallCommand(registryParam?: string): string {
    const registryArg = registryParam ? ` ${registryParam}` : '';
    return `npm install --prefix ${this.projectRoot}${registryArg}`;
  }

  /**
   * Get the npm dedupe command
   *
   * @returns The npm dedupe command string
   */
  public getDeduplicateCommand(): string {
    return `npm dedupe --prefix ${this.projectRoot}`;
  }

  /**
   * Get the npm build command
   *
   * @returns The npm build command string
   */
  public getBuildCommand(): string {
    return `npm run build --prefix ${this.projectRoot}`;
  }

  /**
   * Get the npm script command
   *
   * @param script The script name to run
   * @returns The npm script command string
   */
  public getScriptCommand(script: string): string {
    return `npm run ${script} --prefix ${this.projectRoot}`;
  }

  /**
   * Get the npm publish command
   *
   * @param registryParam The registry parameter to use (e.g. --registry=https://registry.npmjs.org/)
   * @param access The access level (public or restricted)
   * @param tag The tag to publish with
   * @param dryrun Whether to do a dry run
   * @param tarball Optional tarball to publish
   * @returns The npm publish command string
   */
  public getPublishCommand(
    registryParam?: string,
    access?: string,
    tag?: string,
    dryrun?: boolean,
    tarball?: string
  ): string {
    let cmd = `npm publish --prefix ${this.projectRoot}`;
    if (registryParam) cmd += ` ${registryParam}`;
    if (access) cmd += ` --access ${access}`;
    if (tag) cmd += ` --tag ${tag}`;
    if (dryrun) cmd += ' --dry-run';
    if (tarball) cmd += ` ${tarball}`;
    return cmd;
  }
}
