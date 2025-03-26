/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config } from '@oclif/core';
import { stubMethod, fromStub, stubInterface } from '@salesforce/ts-sinon';
import { expect } from 'chai';
import shelljs from 'shelljs';
import sinon from 'sinon';
import slash from 'slash';
import stripAnsi from 'strip-ansi';

import Prepare from '../../src/commands/cli/tarballs/prepare.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

describe('cli:tarballs:prepare', () => {
  const sandbox = sinon.createSandbox();
  const testDir = path.join(currentDirPath, 'fixtures', 'prepare-test');
  const nodeModulesDir = path.join(testDir, 'node_modules');

  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));
  oclifConfigStub.runHook = async () => ({ successes: [], failures: [] });

  class TestPrepare extends Prepare {
    public output: string[] = [];

    public async runIt() {
      await this.parse(Prepare);
      return this.run();
    }

    // Override log to capture output
    public log(message: string): void {
      this.output.push(message);
    }
  }

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(nodeModulesDir)) {
      fs.mkdirSync(nodeModulesDir, { recursive: true });
    }

    // Create test files and directories
    fs.mkdirSync(path.join(nodeModulesDir, 'JSforceTestSuite'), { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'README.md'), '');
    fs.writeFileSync(path.join(nodeModulesDir, '.gitignore'), '');
    fs.writeFileSync(path.join(nodeModulesDir, '.gitattributes'), '');
    fs.writeFileSync(path.join(nodeModulesDir, '.eslintrc'), '');
    fs.writeFileSync(path.join(nodeModulesDir, 'appveyor.yml'), '');
    fs.writeFileSync(path.join(nodeModulesDir, 'circle.yml'), '');
    // Create test directories under a package name
    // Create the test directory that should be removed
    fs.mkdirSync(path.join(nodeModulesDir, 'test'), { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'test/test.js'), '');
    // Create the nested test directory that should not be removed
    fs.mkdirSync(path.join(nodeModulesDir, 'src/test'), { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'src/test/test.js'), '');
    fs.writeFileSync(path.join(nodeModulesDir, 'test.js.map'), '');
    fs.mkdirSync(path.join(nodeModulesDir, '.nyc_output'), { recursive: true });
    fs.mkdirSync(path.join(nodeModulesDir, 'jsforce/dist'), { recursive: true });
    fs.mkdirSync(path.join(nodeModulesDir, 'jsforce/src'), { recursive: true });
    fs.mkdirSync(path.join(nodeModulesDir, 'jsforce/browser'), { recursive: true });
    fs.writeFileSync(path.join(nodeModulesDir, 'types.d.ts'), '');

    // Stub shelljs.pwd() to return testDir with forward slashes
    stubMethod(sandbox, shelljs, 'pwd').returns({ stdout: slash(testDir) });
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    sandbox.restore();
  });

  it('should remove unwanted files in dryrun mode', async () => {
    const cmd = new TestPrepare(['--dryrun', '--verbose'], oclifConfigStub);
    const rmStub = stubMethod(sandbox, shelljs, 'rm');

    await cmd.runIt();

    // Verify that rm was not called since we're in dryrun mode
    expect(rmStub.called).to.be.false;

    // Get only the removal messages and strip ANSI codes
    const removalMessages = cmd.output.filter((line) => line.includes('[DRYRUN] Removing:')).map(stripAnsi);

    // Verify output contains expected messages
    expect(removalMessages).to.include.members([
      '[DRYRUN] Removing: 1 JSforceTestSuite files',
      '[DRYRUN] Removing: 1 .md files',
      '[DRYRUN] Removing: 1 .gitignore files',
      '[DRYRUN] Removing: 1 .gitattributes files',
      '[DRYRUN] Removing: 1 .eslintrc files',
      '[DRYRUN] Removing: 1 appveyor.yml files',
      '[DRYRUN] Removing: 1 circle.yml files',
      '[DRYRUN] Removing: 1 *.map files',
      '[DRYRUN] Removing: 1 jsforce/dist directory',
      '[DRYRUN] Removing: 1 jsforce/src directory',
      '[DRYRUN] Removing: 1 jsforce/browser directory',
    ]);
  });

  it('should remove unwanted files in normal mode', async () => {
    const cmd = new TestPrepare(['--verbose'], oclifConfigStub);
    const rmStub = stubMethod(sandbox, shelljs, 'rm');

    await cmd.runIt();

    // Verify that rm was called for each type of file/directory
    expect(rmStub.called).to.be.true;
    expect(rmStub.callCount).to.be.greaterThan(0);

    // Get only the removal messages and strip ANSI codes
    const removalMessages = cmd.output
      .filter((line) => line.includes('Removing:') && !line.includes('[DRYRUN]'))
      .map(stripAnsi);

    // Verify output contains expected messages
    expect(removalMessages).to.include.members([
      'Removing: 1 JSforceTestSuite files',
      'Removing: 1 .md files',
      'Removing: 1 .gitignore files',
      'Removing: 1 .gitattributes files',
      'Removing: 1 .eslintrc files',
      'Removing: 1 appveyor.yml files',
      'Removing: 1 circle.yml files',
      'Removing: 1 *.map files',
      'Removing: 1 jsforce/dist directory',
      'Removing: 1 jsforce/src directory',
      'Removing: 1 jsforce/browser directory',
    ]);

    // When comparing paths, use slash to normalize paths
    const rmCalls = rmStub.getCalls().map((call) => slash(call.args[1] as string));

    // Use normalized paths for comparison
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'JSforceTestSuite')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'README.md')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, '.gitignore')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, '.gitattributes')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, '.eslintrc')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'appveyor.yml')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'circle.yml')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'test.js.map')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'jsforce/dist')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'jsforce/src')));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'jsforce/browser')));
  });

  it('should remove type definition files when --types flag is used', async () => {
    const cmd = new TestPrepare(['--types', '--verbose'], oclifConfigStub);
    const rmStub = stubMethod(sandbox, shelljs, 'rm');

    await cmd.runIt();

    // Verify that rm was called for .d.ts files
    expect(rmStub.called).to.be.true;
    const rmCalls = rmStub.getCalls().map((call) => slash(call.args[1] as string));
    expect(rmCalls).to.include(slash(path.join(nodeModulesDir, 'types.d.ts')));

    // Get only the removal messages and strip ANSI codes
    const removalMessages = cmd.output
      .filter((line) => line.includes('Removing:') && !line.includes('[DRYRUN]'))
      .map(stripAnsi);

    // Verify output contains expected messages
    expect(removalMessages).to.include.members([
      'Removing: 1 JSforceTestSuite files',
      'Removing: 1 .md files',
      'Removing: 1 .gitignore files',
      'Removing: 1 .gitattributes files',
      'Removing: 1 .eslintrc files',
      'Removing: 1 appveyor.yml files',
      'Removing: 1 circle.yml files',
      'Removing: 1 *.map files',
      'Removing: 1 jsforce/dist directory',
      'Removing: 1 jsforce/src directory',
      'Removing: 1 jsforce/browser directory',
      'Removing: 1 *.d.ts files',
    ]);
  });

  it('should not remove type definition files when --types flag is not used', async () => {
    const cmd = new TestPrepare(['--verbose'], oclifConfigStub);
    const rmStub = stubMethod(sandbox, shelljs, 'rm');

    await cmd.runIt();

    // Verify that rm was not called for .d.ts files
    const rmCalls = rmStub.getCalls().map((call) => slash(call.args[1] as string));
    expect(rmCalls).to.not.include(slash(path.join(nodeModulesDir, 'types.d.ts')));

    // Get only the removal messages and strip ANSI codes
    const removalMessages = cmd.output
      .filter((line) => line.includes('Removing:') && !line.includes('[DRYRUN]'))
      .map(stripAnsi);

    // Verify output contains expected messages
    expect(removalMessages).to.include.members([
      'Removing: 1 JSforceTestSuite files',
      'Removing: 1 .md files',
      'Removing: 1 .gitignore files',
      'Removing: 1 .gitattributes files',
      'Removing: 1 .eslintrc files',
      'Removing: 1 appveyor.yml files',
      'Removing: 1 circle.yml files',
      'Removing: 1 *.map files',
      'Removing: 1 jsforce/dist directory',
      'Removing: 1 jsforce/src directory',
      'Removing: 1 jsforce/browser directory',
    ]);
    expect(removalMessages).to.not.include('Removing: 1 *.d.ts files');
  });

  it('should not remove files in allowed test directories', async () => {
    // Create test files in allowed directories
    const allowedDirs = [
      'command',
      'commands',
      'lib',
      'dist',
      'salesforce-alm',
      '@salesforce/plugin-templates',
      '@salesforce/plugin-generator',
    ];
    for (const dir of allowedDirs) {
      const allowedTestDir = path.join(nodeModulesDir, dir, 'test');
      fs.mkdirSync(allowedTestDir, { recursive: true });
    }

    const cmd = new TestPrepare(['--verbose'], oclifConfigStub);
    const rmStub = stubMethod(sandbox, shelljs, 'rm');

    await cmd.runIt();

    // Verify that rm was not called for test directories in allowed paths
    const rmCalls = rmStub.getCalls().map((call) => slash(call.args[1] as string));
    for (const dir of allowedDirs) {
      expect(rmCalls).to.not.include(slash(path.join(nodeModulesDir, dir, 'test')));
    }

    // Get only the removal messages and strip ANSI codes
    const removalMessages = cmd.output
      .filter((line) => line.includes('Removing:') && !line.includes('[DRYRUN]'))
      .map(stripAnsi);

    // Verify output contains expected messages
    expect(removalMessages).to.include.members([
      'Removing: 1 JSforceTestSuite files',
      'Removing: 1 .md files',
      'Removing: 1 .gitignore files',
      'Removing: 1 .gitattributes files',
      'Removing: 1 .eslintrc files',
      'Removing: 1 appveyor.yml files',
      'Removing: 1 circle.yml files',
      'Removing: 1 *.map files',
      'Removing: 1 jsforce/dist directory',
      'Removing: 1 jsforce/src directory',
      'Removing: 1 jsforce/browser directory',
    ]);
    // Verify that test directories in allowed paths are not mentioned in output
    for (const dir of allowedDirs) {
      expect(removalMessages).to.not.include(`Removing: ${dir}/test`);
    }
  });
});
