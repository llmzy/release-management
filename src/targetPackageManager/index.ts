/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Interface for target package managers.
 * This interface defines the common operations that can be performed
 * on a target project's package manager.
 */
export type TargetPackageManager = {
  /**
   * Get the command to install dependencies
   *
   * @param registryParam The registry parameter to use (e.g. --registry=https://registry.npmjs.org/)
   * @returns The install command string
   */
  getInstallCommand(registryParam?: string): string;

  /**
   * Get the command to deduplicate dependencies
   *
   * @returns The deduplicate command string
   */
  getDeduplicateCommand(): string;

  /**
   * Get the command to build the project
   *
   * @returns The build command string
   */
  getBuildCommand(): string;

  /**
   * Get the command to run a specific script
   *
   * @param script The script name to run
   * @returns The script command string
   */
  getScriptCommand(script: string): string;

  /**
   * Get the command to publish a package
   *
   * @param registryParam The registry parameter to use (e.g. --registry=https://registry.npmjs.org/)
   * @param access The access level (public or restricted)
   * @param tag The tag to publish with
   * @param dryrun Whether to do a dry run
   * @param tarball Optional tarball to publish
   * @returns The publish command string
   */
  getPublishCommand(registryParam?: string, access?: string, tag?: string, dryrun?: boolean, tarball?: string): string;
};
