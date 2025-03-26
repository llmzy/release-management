/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestContext } from '@salesforce/core/testSetup';
import { Ux } from '@salesforce/sf-plugins-core';
import { stubMethod, fromStub, stubInterface } from '@salesforce/ts-sinon';
import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';

import Release from '../../src/commands/npm/package/release.js';
import { Package } from '../../src/package.js';
import { PackageRepo } from '../../src/repository.js';
import { NpmTargetManager } from '../../src/targetPackageManager/npm.js';
import { YarnTargetManager } from '../../src/targetPackageManager/yarn.js';

const pkgName = '@salesforce/my-plugin';

describe('npm:package:release', () => {
  const $$ = new TestContext();
  let uxStub: Ux;
  let execStub: sinon.SinonStub;
  let initStub: sinon.SinonStub;
  // @ts-expect-error - Stub is used implicitly through Package.create()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let readPackageJsonStub: sinon.SinonStub;
  let release: Release;
  // @ts-expect-error - Stub is used implicitly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let consoleStubs: { log: sinon.SinonStub; info: sinon.SinonStub; warn: sinon.SinonStub; error: sinon.SinonStub };

  beforeEach(async () => {
    // Stub console methods to suppress output
    consoleStubs = {
      log: $$.SANDBOX.stub(console, 'log'),
      info: $$.SANDBOX.stub(console, 'info'),
      warn: $$.SANDBOX.stub(console, 'warn'),
      error: $$.SANDBOX.stub(console, 'error'),
    };

    uxStub = stubInterface<Ux>($$.SANDBOX, {}) as unknown as Ux;

    execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns('');

    // Stub readPackageJson to return our test values
    readPackageJsonStub = stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').resolves({
      name: pkgName,
      version: '1.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {
        build: 'echo "build"',
        publish: 'echo "publish"',
      },
    });

    // Create a base init stub that sets up the basic properties
    initStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'init').callsFake(async function (this: PackageRepo) {
      this.package = await Package.create();
      this.name = this.package.name;
      this.nextVersion = this.package.packageJson.version;
    });

    // Create a proper Config mock using the standard pattern
    const oclifConfigStub = fromStub(stubInterface<Config>($$.SANDBOX));
    oclifConfigStub.runHook = async () => ({ successes: [], failures: [] });
    (oclifConfigStub as unknown as { ux: Ux }).ux = uxStub;

    class TestRelease extends Release {
      public async runIt() {
        await this.init();
        return this.run();
      }
    }

    // Set required environment variables
    process.env.NPM_TOKEN = 'test-token';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    release = new TestRelease(['--dryrun'], oclifConfigStub);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NPM_TOKEN;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  describe('with npm', () => {
    beforeEach(async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
    });

    it('should use npm for installation and building', async () => {
      const result = await release.run();

      // Check install command
      const installCmd = execStub.getCalls().find((call) => call.args[0].includes('npm install'));
      expect(installCmd).to.not.be.undefined;

      // Check build command
      const buildCmd = execStub.getCalls().find((call) => call.args[0].includes('npm run build'));
      expect(buildCmd).to.not.be.undefined;

      // Check publish command
      const publishCmd = execStub.getCalls().find((call) => call.args[0].includes('npm publish'));
      expect(publishCmd).to.not.be.undefined;

      expect(result).to.deep.equal({
        version: '1.0.0',
        name: pkgName,
      });
    });
  });

  describe('with yarn', () => {
    beforeEach(async () => {
      const yarnManager = new YarnTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = yarnManager;
      });
    });

    it('should use yarn for installation and building', async () => {
      const result = await release.run();

      // Check install command
      const installCmd = execStub.getCalls().find((call) => call.args[0].includes('yarn install'));
      expect(installCmd).to.not.be.undefined;

      // Check build command
      const buildCmd = execStub.getCalls().find((call) => call.args[0].includes('yarn run build'));
      expect(buildCmd).to.not.be.undefined;

      // Check publish command
      const publishCmd = execStub.getCalls().find((call) => call.args[0].includes('yarn publish'));
      expect(publishCmd).to.not.be.undefined;

      expect(result).to.deep.equal({
        version: '1.0.0',
        name: pkgName,
      });
    });
  });
});
