/*
 * Copyright (c) 2020, salesforce.com, inc.
 * Modifications Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestContext } from '@salesforce/core/testSetup';
import { Ux } from '@salesforce/sf-plugins-core';
import { stubMethod, stubInterface } from '@salesforce/ts-sinon';
import { expect } from 'chai';
import sinon from 'sinon';

import { Package } from '../src/package.js';
import { PackageRepo } from '../src/repository.js';
import { NpmTargetManager } from '../src/targetPackageManager/npm.js';
import { YarnTargetManager } from '../src/targetPackageManager/yarn.js';

const pkgName = '@salesforce/my-plugin';

describe('PackageRepo', () => {
  const $$ = new TestContext();
  let uxStub: Ux;
  let execStub: sinon.SinonStub;

  beforeEach(async () => {
    uxStub = stubInterface<Ux>($$.SANDBOX, {}) as unknown as Ux;
  });

  describe('determineNextVersion', () => {
    beforeEach(async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'retrieveNpmPackage').returns({
        name: pkgName,
        version: '1.0.0',
        versions: ['1.0.0'],
      });
    });

    it('should use the version in package.json if that version does not exist in the registry', async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '2.0.0' })
      );
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns('');
      const repo = await PackageRepo.create({ ux: uxStub });
      expect(repo.nextVersion).to.equal('2.0.0');
    });

    it('should use standard-version to determine the next version if the version in the package.json already exists', async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '1.0.0' })
      );
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns({
        stdout: 'bumping version in package.json from 1.0.0 to 1.1.0',
        stderr: '',
        code: 0,
      });
      const repo = await PackageRepo.create({ ux: uxStub });
      expect(repo.nextVersion).to.equal('1.1.0');
    });

    it('should use standard-version to determine a prerelease version', async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '1.0.0' })
      );
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns({
        stdout: 'bumping version in package.json from 1.0.0 to 1.1.0-0',
        stderr: '',
        code: 0,
      });
      const repo = await PackageRepo.create({ ux: uxStub, useprerelease: '' });
      expect(repo.nextVersion).to.equal('1.1.0-0');
    });

    it('should use standard-version to determine a specific prerelease version', async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '1.0.0' })
      );
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns({
        stdout: 'bumping version in package.json from 1.0.0 to 1.1.0-beta.0',
        stderr: '',
        code: 0,
      });
      const repo = await PackageRepo.create({ ux: uxStub, useprerelease: 'beta' });
      expect(repo.nextVersion).to.equal('1.1.0-beta.0');
    });
  });

  describe('publish', () => {
    let repo: PackageRepo;

    beforeEach(async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '1.1.0' })
      );
      stubMethod($$.SANDBOX, Package.prototype, 'retrieveNpmPackage').returns({
        name: pkgName,
        version: '1.0.0',
        versions: ['1.0.0'],
      });
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns('');
      process.env.NPM_TOKEN = 'FOOBARBAZ';
      repo = await PackageRepo.create({ ux: uxStub });
    });

    afterEach(() => {
      delete process.env.NPM_TOKEN;
    });

    it('should use the --dry-run flag when the dryrun option is provided', async () => {
      await repo.publish({ dryrun: true });
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.include('--dry-run');
    });

    it('should not use the --dry-run flag when the dryrun option is not provided', async () => {
      await repo.publish();
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.not.include('--dry-run');
    });

    it('should publish the tarfile when a signature is provided in the options', async () => {
      await repo.publish({
        dryrun: true,
        signatures: [
          {
            fileTarPath: 'tarfile.tar',
            packageVersion: '1.1.0',
            packageName: pkgName,
            publicKeyContents: 'blah',
            signatureContents: 'blah',
            packageJsonSignatures: {
              publicKeyUrl: 'blah',
              signatureUrl: 'blah',
            },
          },
        ],
      });
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.include('tarfile.tar');
    });

    it('should publish the package with the specified tag', async () => {
      await repo.publish({
        dryrun: true,
        tag: 'test',
      });
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.include('--tag test');
    });

    it('should publish the package with the specified access level', async () => {
      await repo.publish({
        dryrun: true,
        access: 'restricted',
      });
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.include('--access restricted');
    });
  });

  describe('install', () => {
    let repo: PackageRepo;
    let initStub: sinon.SinonStub;

    beforeEach(async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '1.1.0' })
      );
      stubMethod($$.SANDBOX, Package.prototype, 'retrieveNpmPackage').returns({
        name: pkgName,
        version: '1.0.0',
        versions: ['1.0.0'],
      });
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns('');

      // Create a base init stub that sets up the basic properties
      initStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'init').callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
      });

      repo = await PackageRepo.create({ ux: uxStub });
    });

    it('should use npm to install dependencies with registry parameter', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.install();
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^npm install --prefix/);
      expect(cmd).to.include('--registry ');
    });

    it('should use yarn to install dependencies with registry parameter', async () => {
      const yarnManager = new YarnTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = yarnManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.install();
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^yarn install --cwd/);
      expect(cmd).to.include('--registry ');
    });

    it('should use package manager to install dependencies silently', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.install(true);
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^npm install --prefix/);
      expect(execStub.firstCall.args[1]).to.be.true;
    });
  });

  describe('build', () => {
    let repo: PackageRepo;
    let initStub: sinon.SinonStub;

    beforeEach(async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({
          name: pkgName,
          version: '1.1.0',
          scripts: {
            build: 'echo "build"',
          },
        })
      );
      stubMethod($$.SANDBOX, Package.prototype, 'retrieveNpmPackage').returns({
        name: pkgName,
        version: '1.0.0',
        versions: ['1.0.0'],
      });
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns('');

      // Create a base init stub that sets up the basic properties
      initStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'init').callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
      });

      repo = await PackageRepo.create({ ux: uxStub });
    });

    it('should use npm to build the project', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.build();
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^npm run build --prefix/);
    });

    it('should use yarn to build the project', async () => {
      const yarnManager = new YarnTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = yarnManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.build();
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^yarn run build --cwd/);
    });

    it('should use package manager to build the project silently', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.build(true);
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^npm run build --prefix/);
      expect(execStub.firstCall.args[1]).to.be.true;
    });
  });

  describe('run', () => {
    let repo: PackageRepo;
    let initStub: sinon.SinonStub;

    beforeEach(async () => {
      stubMethod($$.SANDBOX, Package.prototype, 'readPackageJson').returns(
        Promise.resolve({ name: pkgName, version: '1.1.0' })
      );
      stubMethod($$.SANDBOX, Package.prototype, 'retrieveNpmPackage').returns({
        name: pkgName,
        version: '1.0.0',
        versions: ['1.0.0'],
      });
      execStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'execCommand').returns('');

      // Create a base init stub that sets up the basic properties
      initStub = stubMethod($$.SANDBOX, PackageRepo.prototype, 'init').callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
      });

      repo = await PackageRepo.create({ ux: uxStub });
    });

    it('should use npm to run a script', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.run('test');
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^npm run test --prefix/);
    });

    it('should use yarn to run a script', async () => {
      const yarnManager = new YarnTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = yarnManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.run('test');
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^yarn test --cwd/);
    });

    it('should use package manager to run a script silently', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      repo.run('test', undefined, true);
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^npm run test --prefix/);
      expect(execStub.firstCall.args[1]).to.be.true;
    });

    it('should use package manager to run a script in a specific location', async () => {
      const npmManager = new NpmTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = npmManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      const location = '/path/to/project';
      repo.run('test', location);
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^\(cd \/path\/to\/project && npm run test --prefix/);
    });

    it('should use yarn to run a script in a specific location', async () => {
      const yarnManager = new YarnTargetManager(process.cwd());
      initStub.callsFake(async function (this: PackageRepo) {
        this.package = await Package.create();
        this.name = this.package.name;
        this.nextVersion = this.package.packageJson.version;
        this.packageManager = yarnManager;
      });
      repo = await PackageRepo.create({ ux: uxStub });

      const location = '/path/to/project';
      repo.run('test', location);
      const cmd = execStub.firstCall.args[0];
      expect(cmd).to.match(/^\(cd \/path\/to\/project && yarn test --cwd/);
    });
  });
});
