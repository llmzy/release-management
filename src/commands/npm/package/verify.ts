/*
 * Copyright (c) 2025, Palomar Digital, LLC.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createVerify } from 'node:crypto';
import { Readable } from 'node:stream';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Transform } from 'node:stream';
import { Messages, SfError, Logger } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import got, { HTTPError } from 'got';
import { ProxyAgent } from 'proxy-agent';
import { parseJson } from '@salesforce/kit';
import * as tar from 'tar';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@llmzy/release-management', 'npm.package.verify');

const CRYPTO_LEVEL = 'RSA-SHA256';

export type VerifyResponse = {
  message: string;
  verified: boolean;
};

type VersionData = {
  [key: string]: unknown;
  dist: {
    tarball: string;
  };
  signatures?: {
    signatureUrl: string;
    publicKeyUrl: string;
  };
  sfdx?: {
    signatureUrl: string;
    publicKeyUrl: string;
  };
  publishConfig?: Record<string, unknown>;
};

type NpmMetadata = {
  [key: string]: unknown;
  versions: {
    [version: string]: VersionData;
  };
  dist?: {
    tarball: string;
  };
};

export default class Verify extends SfCommand<VerifyResponse> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    npm: Flags.string({
      char: 'n',
      required: true,
      summary: messages.getMessage('flags.npm.summary'),
    }),
    registry: Flags.string({
      char: 'r',
      summary: messages.getMessage('flags.registry.summary'),
    }),
  };

  private static async getNpmMetadata(packageName: string, version: string, registry: string): Promise<VersionData> {
    const logger = Logger.childFromRoot('Verify.getNpmMetadata');
    const formattedRegistry = registry.endsWith('/') ? registry : `${registry}/`;

    // Adjust URL format for GitHub Packages
    let packageUrl: string;
    if (registry.includes('pkg.github.com')) {
      // GitHub Packages requires a specific format: https://npm.pkg.github.com/download/@owner/package/version
      // For fetching metadata, we need to use: https://npm.pkg.github.com/@owner/package
      packageUrl = `${formattedRegistry}${packageName}`;

      // For scoped packages, ensure we're using the right format
      if (packageName.startsWith('@')) {
        // Package is already in the correct format (@owner/package)
        logger.debug(`Using GitHub Packages URL format: ${packageUrl}`);
      }
    } else {
      // Standard NPM registry
      packageUrl = `${formattedRegistry}${packageName}`;
    }

    // Get npm token from environment variable
    const npmToken = process.env.NPM_TOKEN;
    const headers: Record<string, string> = {};

    // Add authentication if token is available
    if (npmToken) {
      logger.debug('Using NPM_TOKEN for authentication');

      // For GitHub Packages
      if (registry.includes('pkg.github.com')) {
        headers.authorization = `Bearer ${npmToken}`;
      } else {
        // For standard NPM registry
        headers.authorization = `token ${npmToken}`;
      }
    } else {
      logger.debug('No NPM_TOKEN found in environment variables');
    }

    try {
      logger.debug(`Fetching package metadata from: ${packageUrl}`);
      const response = await got.get(packageUrl, {
        agent: { https: new ProxyAgent() },
        retry: { limit: 2 },
        headers,
      });

      const metadata = JSON.parse(response.body) as NpmMetadata;
      logger.debug(`Full metadata: ${JSON.stringify(metadata, null, 2)}`);

      if (!metadata.versions || Object.keys(metadata.versions).length === 0) {
        throw new SfError(`No versions found for package ${packageName} in registry ${registry}`);
      }

      const versionData = metadata.versions[version];

      if (!versionData) {
        throw new SfError(
          `Version ${version} not found for package ${packageName}. Available versions: ${Object.keys(
            metadata.versions
          ).join(', ')}`
        );
      }

      logger.debug(`Version data for ${version}: ${JSON.stringify(versionData, null, 2)}`);

      return versionData;
    } catch (error) {
      if (error instanceof HTTPError) {
        if (error.response.statusCode === 404) {
          const notFoundError = new SfError(`Package not found: ${packageName} - URL: ${packageUrl}`);
          logger.debug(notFoundError);
          throw notFoundError;
        } else if (error.response.statusCode === 401 || error.response.statusCode === 403) {
          // Authentication or authorization error
          const authError = registry.includes('pkg.github.com')
            ? new SfError(
                `Authentication failed for GitHub Packages. Make sure your NPM_TOKEN environment variable contains a valid GitHub Personal Access Token with package read permissions. URL: ${packageUrl} - Status: ${error.response.statusCode}`
              )
            : new SfError(
                `Authentication failed. Make sure your NPM_TOKEN environment variable is properly set. URL: ${packageUrl} - Status: ${error.response.statusCode}`
              );
          logger.debug(authError);
          throw authError;
        } else {
          const httpError = new SfError(
            `Failed to fetch package metadata: ${error.message} - URL: ${packageUrl} - Status: ${error.response.statusCode}`
          );
          logger.debug(httpError);
          throw httpError;
        }
      }
      throw error;
    }
  }

  private static async downloadTarball(url: string): Promise<Buffer> {
    const logger = Logger.childFromRoot('Verify.downloadTarball');
    try {
      logger.debug(`Downloading tarball from: ${url}`);

      // Get npm token from environment variable
      const npmToken = process.env.NPM_TOKEN;
      const headers: Record<string, string> = {};

      // Add authentication if token is available
      if (npmToken) {
        // For GitHub Packages
        if (url.includes('pkg.github.com')) {
          headers.authorization = `Bearer ${npmToken}`;
        } else {
          // For standard NPM registry
          headers.authorization = `token ${npmToken}`;
        }
      }

      const response = await got.get(url, {
        agent: { https: new ProxyAgent() },
        retry: { limit: 2 },
        headers,
        responseType: 'buffer',
      });
      return response.body;
    } catch (error) {
      if (error instanceof HTTPError) {
        const downloadError = new SfError(
          `Failed to download tarball: ${error.message} - URL: ${url} - Status: ${error.response.statusCode}`
        );
        logger.debug(downloadError);
        throw downloadError;
      }
      throw error;
    }
  }

  private static async downloadFile(url: string, fileType: string): Promise<string> {
    const logger = Logger.childFromRoot('Verify.downloadFile');
    try {
      logger.debug(`Downloading ${fileType} from: ${url}`);

      // Get npm token from environment variable
      const npmToken = process.env.NPM_TOKEN;
      const headers: Record<string, string> = {};

      // Add authentication if token is available
      if (npmToken) {
        // For GitHub Packages
        if (url.includes('pkg.github.com')) {
          headers.authorization = `Bearer ${npmToken}`;
        } else {
          // For standard NPM registry
          headers.authorization = `token ${npmToken}`;
        }
      }

      const response = await got.get(url, {
        agent: { https: new ProxyAgent() },
        retry: { limit: 2 },
        headers,
      });
      return response.body;
    } catch (error) {
      if (error instanceof HTTPError) {
        const downloadError = new SfError(
          `Failed to download ${fileType}: ${error.message} - URL: ${url} - Status: ${error.response.statusCode}`
        );
        logger.debug(downloadError);
        throw downloadError;
      }
      throw error;
    }
  }

  private static async verifySignature(tarball: Buffer, publicKey: string, signature: string): Promise<boolean> {
    const logger = Logger.childFromRoot('Verify.verifySignature');
    const verifier = createVerify(CRYPTO_LEVEL);

    // Create a temporary directory to write the tarball
    const tempDir = await fs.mkdtemp('npm-verify-');
    try {
      // Write tarball buffer to a temporary file
      const tarballPath = path.join(tempDir, 'package.tgz');
      await fs.writeFile(tarballPath, tarball);

      // Create a readable stream from the tarball file
      const tarballStream = createReadStream(tarballPath, { encoding: 'binary' });

      return await new Promise<boolean>((resolve, reject) => {
        tarballStream.pipe(verifier);
        tarballStream.on('end', () => {
          try {
            const verified = verifier.verify(publicKey, signature, 'base64');
            resolve(verified);
          } catch (err) {
            const verifyError = new SfError(
              `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`
            );
            logger.debug(verifyError);
            reject(verifyError);
          }
        });
        tarballStream.on('error', (err) => {
          const streamError = new SfError(`Error streaming tarball data: ${err.message}`);
          logger.debug(streamError);
          reject(streamError);
        });
      });
    } finally {
      // Clean up
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private static async extractPackageJsonFromTarball(tarball: Buffer): Promise<Record<string, unknown>> {
    const logger = Logger.childFromRoot('Verify.extractPackageJsonFromTarball');
    try {
      // Create a readable stream from the tarball buffer
      const tarballStream = Readable.from(tarball);

      // Create a transform stream to collect the package.json content
      let packageJsonContent = '';
      const transform = new Transform({
        transform(chunk, encoding, callback): void {
          packageJsonContent += chunk;
          callback();
        },
      });

      // Extract only package.json from the tarball
      await new Promise<void>((resolve, reject) => {
        tarballStream
          .pipe(
            tar.extract({
              filter: (entryPath) => entryPath === 'package/package.json',
              onentry: (entry) => {
                entry.pipe(transform);
              },
            })
          )
          .on('finish', resolve)
          .on('error', reject);
      });

      // Parse the collected package.json content
      const packageJson = parseJson(packageJsonContent) as Record<string, unknown>;
      return packageJson;
    } catch (error) {
      logger.debug(
        `Error extracting package.json from tarball: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new SfError(
        `Failed to extract package.json from tarball: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private static extractSignatureInfo(
    versionData: VersionData,
    tarballPackageJson?: Record<string, unknown>
  ): { signatureUrl: string; publicKeyUrl: string } | undefined {
    const logger = Logger.childFromRoot('Verify.extractSignatureInfo');

    // First try to get signature info from registry metadata
    if (versionData.signatures) {
      logger.debug('Found signatures in registry metadata');
      return versionData.signatures;
    }

    if (versionData.sfdx) {
      logger.debug('Found signatures in deprecated sfdx format in registry metadata');
      return {
        signatureUrl: versionData.sfdx.signatureUrl,
        publicKeyUrl: versionData.sfdx.publicKeyUrl,
      };
    }

    // If no signature info in registry metadata, try package.json from tarball
    if (tarballPackageJson) {
      logger.debug('Checking package.json from tarball for signature information');

      // Check for signatures in package.json
      if (tarballPackageJson.signatures && typeof tarballPackageJson.signatures === 'object') {
        const sigs = tarballPackageJson.signatures as Record<string, unknown>;
        if (typeof sigs.signatureUrl === 'string' && typeof sigs.publicKeyUrl === 'string') {
          logger.debug('Found signatures in package.json');
          return {
            signatureUrl: sigs.signatureUrl,
            publicKeyUrl: sigs.publicKeyUrl,
          };
        }
      }

      // Check for deprecated sfdx format in package.json
      if (tarballPackageJson.sfdx && typeof tarballPackageJson.sfdx === 'object') {
        const sfdx = tarballPackageJson.sfdx as Record<string, unknown>;
        if (typeof sfdx.signatureUrl === 'string' && typeof sfdx.publicKeyUrl === 'string') {
          logger.debug('Found signatures in deprecated sfdx format in package.json');
          return {
            signatureUrl: sfdx.signatureUrl,
            publicKeyUrl: sfdx.publicKeyUrl,
          };
        }
      }
    }

    logger.debug('No signature information found in registry metadata or package.json');
    return undefined;
  }

  public async run(): Promise<VerifyResponse> {
    const logger = Logger.childFromRoot('Verify.run');
    const { flags } = await this.parse(Verify);
    this.log('Checking for digital signature.');

    try {
      // Parse npm package name and version
      logger.debug(`Package input: ${flags.npm}`);
      const npmParts = flags.npm.split('@');

      let packageName: string;
      let version: string;

      if (flags.npm.startsWith('@')) {
        // Scoped package
        if (npmParts.length < 3) {
          throw new SfError(`Invalid package format. Expected @scope/package@version but got ${flags.npm}`);
        }
        packageName = `@${npmParts[1]}`;
        version = npmParts[2];
      } else {
        // Non-scoped package
        if (npmParts.length < 2) {
          throw new SfError(`Invalid package format. Expected package@version but got ${flags.npm}`);
        }
        packageName = npmParts[0];
        version = npmParts[1];
      }

      logger.debug(`Parsed package name: ${packageName}, version: ${version}`);

      // Get package metadata from npm
      const npmRegistry = flags.registry ?? 'https://registry.npmjs.org/';
      logger.debug(`Using registry: ${npmRegistry}`);

      // Check for NPM_TOKEN when using GitHub Packages
      if (npmRegistry.includes('pkg.github.com')) {
        const npmToken = process.env.NPM_TOKEN;
        if (!npmToken) {
          this.log('Warning: GitHub Packages requires authentication. NPM_TOKEN environment variable is not set.');
          logger.debug('NPM_TOKEN not found in environment');
        } else {
          logger.debug('NPM_TOKEN found in environment');
        }
      }

      const versionData = await Verify.getNpmMetadata(packageName, version, npmRegistry);
      logger.debug('Found package metadata');

      // Download the package tarball
      const tarballBuffer = await Verify.downloadTarball(versionData.dist.tarball);
      logger.debug(`Downloaded tarball (${tarballBuffer.length} bytes)`);

      // Extract package.json from tarball
      let tarballPackageJson: Record<string, unknown> | undefined;
      try {
        tarballPackageJson = await Verify.extractPackageJsonFromTarball(tarballBuffer);
        logger.debug('Extracted package.json from tarball');
      } catch (error) {
        logger.debug(
          `Failed to extract package.json from tarball: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue without tarball package.json - we'll still check registry metadata
      }

      // Check for signatures in both registry metadata and tarball package.json
      const signatureInfo = Verify.extractSignatureInfo(versionData, tarballPackageJson);
      if (!signatureInfo) {
        const message = messages.getMessage('NotSigned');
        this.log(message);
        return { message, verified: false };
      }

      logger.debug(`Using signature URLs: ${JSON.stringify(signatureInfo)}`);
      logger.debug(`Tarball URL: ${versionData.dist.tarball}`);

      // Download signature and public key
      logger.debug('Downloading signature and public key');
      const [signature, publicKey] = await Promise.all([
        Verify.downloadFile(signatureInfo.signatureUrl, 'signature'),
        Verify.downloadFile(signatureInfo.publicKeyUrl, 'public key'),
      ]);

      logger.debug(`Downloaded signature (${signature.length} bytes) and public key (${publicKey.length} bytes)`);

      // Verify the signature
      logger.debug('Verifying signature');
      const verified = await Verify.verifySignature(tarballBuffer, publicKey, signature);

      if (verified) {
        const message = messages.getMessage('SignatureCheckSuccess', [packageName, version]);
        this.logSuccess(message);
        return { message, verified: true };
      } else {
        const message = messages.getMessage('FailedDigitalSignatureVerification');
        this.error(message);
        return { message, verified: false };
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      // Enhanced logging for troubleshooting
      logger.debug(
        `Error details: ${JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
        })}`
      );

      throw SfError.wrap(error);
    }
  }
}
