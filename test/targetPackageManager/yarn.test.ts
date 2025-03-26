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
import { YarnTargetManager } from '../../src/targetPackageManager/yarn.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

describe('Yarn Target Package Manager', () => {
  const testDir = path.join(currentDirPath, 'fixtures', 'yarn-test');

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

  it('generates correct install command', () => {
    const manager = new YarnTargetManager(testDir);
    const command = manager.getInstallCommand();
    expect(command).to.equal(`yarn install --cwd ${testDir}`);
  });

  it('generates correct install command with registry parameter', () => {
    const manager = new YarnTargetManager(testDir);
    const registryParam = '--registry=https://registry.npmjs.org/';
    const command = manager.getInstallCommand(registryParam);
    expect(command).to.equal(`yarn install --cwd ${testDir} ${registryParam}`);
  });

  it('generates correct deduplicate command', () => {
    const manager = new YarnTargetManager(testDir);
    const command = manager.getDeduplicateCommand();
    expect(command).to.equal(`yarn dedupe --cwd ${testDir}`);
  });

  it('generates correct build command', () => {
    const manager = new YarnTargetManager(testDir);
    const command = manager.getBuildCommand();
    expect(command).to.equal(`yarn run build --cwd ${testDir}`);
  });

  it('generates correct script command', () => {
    const manager = new YarnTargetManager(testDir);
    const script = 'test';
    const command = manager.getScriptCommand(script);
    expect(command).to.equal(`yarn ${script} --cwd ${testDir}`);
  });

  it('generates correct publish command', () => {
    const manager = new YarnTargetManager(testDir);
    const command = manager.getPublishCommand();
    expect(command).to.equal(`yarn publish --cwd ${testDir}`);
  });

  it('generates correct publish command with registry parameter', () => {
    const manager = new YarnTargetManager(testDir);
    const registryParam = '--registry=https://registry.npmjs.org/';
    const command = manager.getPublishCommand(registryParam);
    expect(command).to.equal(`yarn publish --cwd ${testDir} ${registryParam}`);
  });

  it('generates correct publish command with all options', () => {
    const manager = new YarnTargetManager(testDir);
    const registryParam = '--registry=https://registry.npmjs.org/';
    const command = manager.getPublishCommand(registryParam, 'public', 'latest', true, 'package.tgz');
    expect(command).to.equal(
      `yarn publish --cwd ${testDir} ${registryParam} --access public --tag latest --dry-run package.tgz`
    );
  });
});
