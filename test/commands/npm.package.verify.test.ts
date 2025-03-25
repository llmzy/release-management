/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import got from 'got';
import { SfCommand } from '@salesforce/sf-plugins-core';

import Verify from '../../src/commands/npm/package/verify.js';

describe('npm package verify', () => {
  const $$ = new TestContext();
  const mockSignature = 'mock-signature';
  const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nmock-key\n-----END PUBLIC KEY-----';
  const mockTarballContent = 'mock-tarball-content';

  class TestVerify extends Verify {
    public async runIt() {
      await this.init();
      return this.run();
    }
  }

  beforeEach(() => {
    $$.restore();
    // Reset environment variables
    delete process.env.NPM_TOKEN;
    // Stub console methods to suppress output
    $$.SANDBOX.stub(console, 'log');
    $$.SANDBOX.stub(console, 'info');
    $$.SANDBOX.stub(console, 'warn');
    $$.SANDBOX.stub(console, 'error');
  });

  afterEach(() => {
    $$.restore();
  });

  it('verifies a signed package successfully using package.json from tarball', async () => {
    // Mock registry response - only includes tarball URL
    const getStub = stubMethod($$.SANDBOX, got, 'get');
    getStub.callsFake((url: string) => {
      if (url === 'https://registry.npmjs.org/@llmzy/test-package') {
        return Promise.resolve({
          body: JSON.stringify({
            versions: {
              '1.0.1': {
                dist: {
                  tarball: 'https://registry.npmjs.org/@llmzy/test-package/-/test-package-1.0.1.tgz',
                },
              },
            },
          }),
        });
      } else if (url.includes('.sig')) {
        return Promise.resolve({ body: mockSignature });
      } else if (url.includes('.crt')) {
        return Promise.resolve({ body: mockPublicKey });
      } else if (url.includes('.tgz')) {
        return Promise.resolve({ body: mockTarballContent });
      }
      return Promise.resolve({ body: JSON.stringify({ versions: {} }) });
    });

    // Mock tarball extraction to simulate package.json with signature info
    const extractStub = stubMethod($$.SANDBOX, Verify, 'extractPackageJsonFromTarball');
    extractStub.resolves({
      name: '@llmzy/test-package',
      version: '1.0.1',
      signatures: {
        signatureUrl: 'https://sigs.llmzy.tools/signatures/@llmzy/test-package/1.0.1.sig',
        publicKeyUrl: 'https://sigs.llmzy.tools/signatures/@llmzy/test-package/1.0.1.crt',
      },
    });

    // Mock verifySignature to return true
    const verifyStub = stubMethod($$.SANDBOX, Verify, 'verifySignature');
    verifyStub.resolves(true);

    // Create a proper Config mock
    const oclifConfigStub = $$.SANDBOX.createStubInstance(Config);
    (oclifConfigStub.runHook as sinon.SinonStub).resolves({ successes: [], failures: [] });

    const cmd = new TestVerify(['--npm', '@llmzy/test-package@1.0.1'], oclifConfigStub);
    const result = await cmd.runIt();

    expect(result.verified).to.be.true;
    expect(extractStub.calledOnce).to.be.true;
    expect(verifyStub.calledOnce).to.be.true;
  });

  it('handles unsigned packages by checking both registry and package.json', async () => {
    // Mock registry response with no signature info
    const getStub = stubMethod($$.SANDBOX, got, 'get');
    getStub.callsFake((url: string) => {
      if (url === 'https://registry.npmjs.org/@llmzy/unsigned-package') {
        return Promise.resolve({
          body: JSON.stringify({
            versions: {
              '1.0.1': {
                dist: {
                  tarball: 'https://registry.npmjs.org/@llmzy/unsigned-package/-/unsigned-package-1.0.1.tgz',
                },
              },
            },
          }),
        });
      } else if (url.includes('.tgz')) {
        return Promise.resolve({ body: mockTarballContent });
      }
      return Promise.resolve({ body: JSON.stringify({ versions: {} }) });
    });

    // Mock tarball extraction to simulate package.json without signature info
    const extractStub = stubMethod($$.SANDBOX, Verify, 'extractPackageJsonFromTarball');
    extractStub.resolves({
      name: '@llmzy/unsigned-package',
      version: '1.0.1',
      // No signatures field
    });

    // Create a proper Config mock
    const oclifConfigStub = $$.SANDBOX.createStubInstance(Config);
    (oclifConfigStub.runHook as sinon.SinonStub).resolves({ successes: [], failures: [] });

    // Spy on the log method
    const logSpy = $$.SANDBOX.spy(TestVerify.prototype, 'log');

    const cmd = new TestVerify(['--npm', '@llmzy/unsigned-package@1.0.1'], oclifConfigStub);
    const result = await cmd.runIt();

    expect(logSpy.calledWith('This package is not digitally signed.')).to.be.true;
    expect(result.verified).to.be.false;
    expect(extractStub.calledOnce).to.be.true;
  });

  it('handles GitHub Packages registry correctly', async () => {
    // Set NPM_TOKEN for GitHub Packages
    process.env.NPM_TOKEN = 'mock-token';

    // Mock GitHub Packages registry response
    const getStub = stubMethod($$.SANDBOX, got, 'get');
    getStub.callsFake((url: string) => {
      if (url === 'https://pkg.github.com/@llmzy/test-package') {
        return Promise.resolve({
          body: JSON.stringify({
            versions: {
              '1.0.1': {
                dist: {
                  tarball: 'https://pkg.github.com/download/@llmzy/test-package/1.0.1/test-package-1.0.1.tgz',
                },
              },
            },
          }),
        });
      } else if (url.includes('.sig')) {
        return Promise.resolve({ body: mockSignature });
      } else if (url.includes('.crt')) {
        return Promise.resolve({ body: mockPublicKey });
      } else if (url.includes('.tgz')) {
        return Promise.resolve({ body: mockTarballContent });
      }
      return Promise.resolve({ body: JSON.stringify({ versions: {} }) });
    });

    // Mock tarball extraction
    const extractStub = stubMethod($$.SANDBOX, Verify, 'extractPackageJsonFromTarball');
    extractStub.resolves({
      name: '@llmzy/test-package',
      version: '1.0.1',
      signatures: {
        signatureUrl: 'https://sigs.llmzy.tools/signatures/@llmzy/test-package/1.0.1.sig',
        publicKeyUrl: 'https://sigs.llmzy.tools/signatures/@llmzy/test-package/1.0.1.crt',
      },
    });

    // Mock verifySignature
    const verifyStub = stubMethod($$.SANDBOX, Verify, 'verifySignature');
    verifyStub.resolves(true);

    // Create a proper Config mock
    const oclifConfigStub = $$.SANDBOX.createStubInstance(Config);
    (oclifConfigStub.runHook as sinon.SinonStub).resolves({ successes: [], failures: [] });

    const cmd = new TestVerify(
      ['--npm', '@llmzy/test-package@1.0.1', '--registry', 'https://pkg.github.com/'],
      oclifConfigStub
    );
    const result = await cmd.runIt();

    expect(result.verified).to.be.true;
    expect(getStub.called).to.be.true;
    // Verify GitHub Packages URL format was used
    expect(getStub.firstCall.args[0]).to.include('pkg.github.com');
    // Verify auth header was set
    expect(getStub.firstCall.args[1]?.headers?.authorization).to.equal('Bearer mock-token');
  });

  it('handles GitHub Packages authentication failures', async () => {
    // Mock GitHub Packages registry response with 401
    const getStub = stubMethod($$.SANDBOX, got, 'get');
    getStub.callsFake((url: string) => {
      if (url === 'https://pkg.github.com/@llmzy/test-package') {
        const error = new Error('Authentication failed for GitHub Packages');
        (error as { statusCode?: number }).statusCode = 401;
        throw error;
      }
      return Promise.resolve({ body: JSON.stringify({ versions: {} }) });
    });

    // Create a proper Config mock
    const oclifConfigStub = $$.SANDBOX.createStubInstance(Config);
    (oclifConfigStub.runHook as sinon.SinonStub).resolves({ successes: [], failures: [] });

    const cmd = new TestVerify(
      ['--npm', '@llmzy/test-package@1.0.1', '--registry', 'https://pkg.github.com/'],
      oclifConfigStub
    );

    try {
      await cmd.runIt();
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).to.include('Authentication failed for GitHub Packages');
    }
  });

  it('handles malformed tarball gracefully', async () => {
    // Mock registry response with no signature info
    const getStub = stubMethod($$.SANDBOX, got, 'get');
    getStub.callsFake((url: string) => {
      if (url === 'https://registry.npmjs.org/@llmzy/test-package') {
        return Promise.resolve({
          body: JSON.stringify({
            versions: {
              '1.0.1': {
                dist: {
                  tarball: 'https://registry.npmjs.org/@llmzy/test-package/-/test-package-1.0.1.tgz',
                },
                // No signatures in registry metadata
              },
            },
          }),
        });
      } else if (url.includes('.tgz')) {
        return Promise.resolve({ body: 'invalid-tarball-content' });
      }
      return Promise.resolve({ body: JSON.stringify({ versions: {} }) });
    });

    // Mock tarball extraction to throw error
    const extractStub = stubMethod($$.SANDBOX, Verify, 'extractPackageJsonFromTarball');
    extractStub.rejects(new Error('Invalid tarball format'));

    // Create a proper Config mock
    const oclifConfigStub = $$.SANDBOX.createStubInstance(Config);
    (oclifConfigStub.runHook as sinon.SinonStub).resolves({ successes: [], failures: [] });

    // Spy on the log method
    const logSpy = $$.SANDBOX.spy(TestVerify.prototype, 'log');

    const cmd = new TestVerify(['--npm', '@llmzy/test-package@1.0.1'], oclifConfigStub);
    const result = await cmd.runIt();

    // Since both registry metadata and package.json extraction failed, package should be considered unsigned
    expect(result.verified).to.be.false;
    expect(logSpy.calledWith('This package is not digitally signed.')).to.be.true;
    expect(extractStub.calledOnce).to.be.true;
  });

  it('handles signature verification failure', async () => {
    // Mock registry response
    const getStub = stubMethod($$.SANDBOX, got, 'get');
    getStub.callsFake((url: string) => {
      if (url === 'https://registry.npmjs.org/@llmzy/test-package') {
        return Promise.resolve({
          body: JSON.stringify({
            versions: {
              '1.0.1': {
                dist: {
                  tarball: 'https://registry.npmjs.org/@llmzy/test-package/-/test-package-1.0.1.tgz',
                },
              },
            },
          }),
        });
      } else if (url.includes('.sig')) {
        return Promise.resolve({ body: mockSignature });
      } else if (url.includes('.crt')) {
        return Promise.resolve({ body: mockPublicKey });
      } else if (url.includes('.tgz')) {
        return Promise.resolve({ body: mockTarballContent });
      }
      return Promise.resolve({ body: JSON.stringify({ versions: {} }) });
    });

    // Mock tarball extraction
    const extractStub = stubMethod($$.SANDBOX, Verify, 'extractPackageJsonFromTarball');
    extractStub.resolves({
      name: '@llmzy/test-package',
      version: '1.0.1',
      signatures: {
        signatureUrl: 'https://sigs.llmzy.tools/signatures/@llmzy/test-package/1.0.1.sig',
        publicKeyUrl: 'https://sigs.llmzy.tools/signatures/@llmzy/test-package/1.0.1.crt',
      },
    });

    // Mock verifySignature to return false
    const verifyStub = stubMethod($$.SANDBOX, Verify, 'verifySignature');
    verifyStub.resolves(false);

    // Mock error method to prevent test from failing
    const errorStub = stubMethod($$.SANDBOX, SfCommand.prototype, 'error');
    errorStub.returns({ message: 'Failed to verify the digital signature', verified: false });

    // Create a proper Config mock
    const oclifConfigStub = $$.SANDBOX.createStubInstance(Config);
    (oclifConfigStub.runHook as sinon.SinonStub).resolves({ successes: [], failures: [] });

    const cmd = new TestVerify(['--npm', '@llmzy/test-package@1.0.1'], oclifConfigStub);
    const result = await cmd.runIt();

    expect(result.verified).to.be.false;
    expect(errorStub.called).to.be.true;
    expect(verifyStub.calledOnce).to.be.true;
  });
});
