/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { detectPackageManager } from '../../src/targetPackageManager/detection.js';
import { NpmTargetManager } from '../../src/targetPackageManager/npm.js';
import { YarnTargetManager } from '../../src/targetPackageManager/yarn.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

describe('Package Manager Detection', () => {
  const testDir = path.join(currentDirPath, 'fixtures');

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('returns YarnTargetManager when yarn.lock is present', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, 'yarn.lock'), '');
    fs.writeFileSync(path.join(testDir, 'package.json'), '{}');

    const result = detectPackageManager(testDir);
    expect(result).to.be.instanceOf(YarnTargetManager);
    expect(result.getInstallCommand()).to.equal(`yarn install --cwd ${testDir}`);
  });

  it('returns NpmTargetManager when package-lock.json is present', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, 'package-lock.json'), '{}');
    fs.writeFileSync(path.join(testDir, 'package.json'), '{}');

    const result = detectPackageManager(testDir);
    expect(result).to.be.instanceOf(NpmTargetManager);
    expect(result.getInstallCommand()).to.equal(`npm install --prefix ${testDir}`);
  });

  it('returns YarnTargetManager when packageManager field in package.json specifies yarn', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ packageManager: 'yarn@1.22.19' }));

    const result = detectPackageManager(testDir);
    expect(result).to.be.instanceOf(YarnTargetManager);
    expect(result.getInstallCommand()).to.equal(`yarn install --cwd ${testDir}`);
  });

  it('returns NpmTargetManager when packageManager field in package.json specifies npm', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ packageManager: 'npm@9.8.1' }));

    const result = detectPackageManager(testDir);
    expect(result).to.be.instanceOf(NpmTargetManager);
    expect(result.getInstallCommand()).to.equal(`npm install --prefix ${testDir}`);
  });

  it('returns NpmTargetManager when no clear indicator is found', () => {
    // Create only package.json without any lock files or packageManager field
    fs.writeFileSync(path.join(testDir, 'package.json'), '{}');

    const result = detectPackageManager(testDir);
    expect(result).to.be.instanceOf(NpmTargetManager);
    expect(result.getInstallCommand()).to.equal(`npm install --prefix ${testDir}`);
  });

  it('returns NpmTargetManager when package.json is not present', () => {
    const result = detectPackageManager(testDir);
    expect(result).to.be.instanceOf(NpmTargetManager);
    expect(result.getInstallCommand()).to.equal(`npm install --prefix ${testDir}`);
  });
});
