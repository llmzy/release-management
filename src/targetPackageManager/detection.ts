/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NpmTargetManager } from './npm.js';
import { YarnTargetManager } from './yarn.js';
import { TargetPackageManager } from './index.js';

type PackageJson = {
  packageManager?: string;
};

/**
 * Detects the package manager to use for a given project directory
 *
 * @param projectRoot The root directory of the project
 * @returns The appropriate package manager instance
 */
export function detectPackageManager(projectRoot: string): TargetPackageManager {
  // Check for yarn.lock
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    return new YarnTargetManager(projectRoot);
  }

  // Check for package-lock.json
  if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) {
    return new NpmTargetManager(projectRoot);
  }

  // Check package.json for packageManager field
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
      if (packageJson.packageManager) {
        const [manager] = packageJson.packageManager.split('@');
        if (manager === 'yarn') {
          return new YarnTargetManager(projectRoot);
        }
        if (manager === 'npm') {
          return new NpmTargetManager(projectRoot);
        }
      }
    } catch (error) {
      // If we can't parse package.json, continue to default
    }
  }

  // Default to npm
  return new NpmTargetManager(projectRoot);
}
