# Adapting `plugin-release-management` for Llmzy

## 1. Context

The `plugin-release-management` project is a Salesforce CLI plugin designed to
handle tasks related to signing, releasing, and testing npm packages. A key
feature of this system is its package signing capability, which provides
security and authenticity verification for npm packages.

The signing system was originally designed for Salesforce CLI plugins with the
following key characteristics:

1. **Security Infrastructure**

   - Uses AWS S3 for storing signatures and public keys
   - Relies on a public web endpoint (developer.salesforce.com) to serve
     verification files
   - Hardcoded paths and bucket names specific to Salesforce's infrastructure

2. **Package Signing Process**

   - Generates ephemeral RSA key pairs for each signing operation
   - Signs npm package tarballs using RSA-SHA256
   - Verifies signatures locally before uploading
   - Never persists private keys to disk
   - Stores public keys and signatures in AWS S3

3. **Package.json Integration**

   - Adds signature verification URLs to package.json under the `sfdx` property
   - Requires specific patterns in .npmignore and .gitignore
   - Manages backup files during the signing process

4. **Current Configuration**
   - Uses hardcoded values in multiple files:
     - S3 bucket: 'dfc-data-production'
     - Base URL: <https://developer.salesforce.com>
     - Security path: 'media/salesforce-cli/security'
   - Limited configuration flexibility through AWS credentials environment
     variables

To adapt this system for Llmzy's use, we'll need to modify these hardcoded
values and potentially introduce a more flexible configuration system while
maintaining the secure signing and verification capabilities.

## 2. Current Capabilities and System Design

The system implements a complete package signing and verification workflow with
several interconnected components:

### 2.1 Core Signing Components

#### SimplifiedSigning Module (`src/codeSigning/SimplifiedSigning.ts`)

- **Key Generation**: Creates 4096-bit RSA keypairs using Node's crypto library
- **Signing Process**: Uses RSA-SHA256 for signing package tarballs
- **Verification**: Implements immediate verification after signing
- **URL Generation**: Creates standardized URLs for signature and public key
  files
- **S3 Upload**: Handles uploading of both signature and public key files

#### Package Integration (`src/codeSigning/packAndSign.ts`)

- **Package Management**: Handles npm package preparation and signing
- **File Validation**: Ensures required ignore patterns are present
- **Package.json Modification**: Adds signature URLs to package metadata
- **Backup Management**: Creates and restores package.json backups

### 2.2 AWS Integration

#### S3 Storage (`src/amazonS3.ts`)

- **Bucket Management**: Interfaces with AWS S3 for file storage
- **Credential Handling**: Supports AWS credential environment variables
- **File Operations**: Implements upload and retrieval operations
- **URL Structure**:

  ```plaintext
  {BASE_URL}/{SECURITY_PATH}/{packageName}/{version}.crt  # Public key
  {BASE_URL}/{SECURITY_PATH}/{packageName}/{version}.sig  # Signature
  ```

### 2.3 Command Line Interface

#### Release Command

```bash
sfdx npm package release --sign
```

- Triggers the signing process during package release
- Supports dry-run mode for testing
- Verifies signature after upload
- Manages npm package publication

#### Verification Command

```bash
sfdx plugins trust verify --npm <package-name>@<version>
```

- Downloads signature and public key from configured URLs
- Verifies package integrity
- Reports verification status

### 2.4 Security Features

1. **Key Management**

   - Private keys are generated per-signing and never stored
   - Public keys are stored in S3 and served via HTTPS
   - RSA-SHA256 cryptographic algorithm

2. **File Integrity**

   - Local verification before upload
   - Remote verification after installation
   - Package backup system during signing

3. **Required File Patterns**

   ```plaintext
   .npmignore and .gitignore:
   *.tgz
   *.sig
   package.json.bak
   ```

### 2.5 Package.json Integration

The system adds an `sfdx` property to package.json:

```json
{
  "sfdx": {
    "publicKeyUrl": "https://developer.salesforce.com/media/salesforce-cli/security/package-name/1.0.0.crt",
    "signatureUrl": "https://developer.salesforce.com/media/salesforce-cli/security/package-name/1.0.0.sig"
  }
}
```

### 2.6 Current Limitations

1. **Configuration Inflexibility**

   - Hardcoded S3 bucket name
   - Fixed base URL and security paths
   - No configuration file support

2. **Infrastructure Dependencies**

   - Requires AWS S3 access
   - Needs public HTTPS endpoint
   - Assumes specific URL structure

3. **Package.json Schema**
   - Uses Salesforce-specific `sfdx` property
   - No support for alternative property names
   - Fixed URL structure for verification files

## 3. Adapting for Llmzy

### 3.1 Prerequisites

Before adapting the code, ensure the following infrastructure and resources are
in place:

1. **AWS Infrastructure Setup**

   - S3 bucket: `llmzy-downloads-001` in US East (Ohio) us-east-2
   - CloudFront distribution with domain: `sigs.llmzy.tools`
   - SSL certificates for CloudFront domain
   - Appropriate IAM roles and policies

2. **AWS Configuration**

   - Configure AWS credentials with appropriate permissions
   - Set up CORS configuration for S3 bucket if needed
   - Configure CloudFront to serve S3 content securely

3. **Environment Variables**

   ```bash
   # AWS Configuration
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   ```

   Note: Only AWS credentials are configured via environment variables. All
   other security-critical values like bucket names, URLs, and paths are
   hardcoded in the source code for security reasons.

### 3.2 Required Code Changes

The original codebase intentionally hardcodes certain security-critical values:

```typescript
const BUCKET = 'dfc-data-production';
export const BASE_URL = 'https://developer.salesforce.com';
export const SECURITY_PATH = 'media/salesforce-cli/security';
```

While it might seem convenient to make these configurable via environment
variables, we will maintain the hardcoded approach for security reasons:

1. **Attack Surface Reduction**: Hardcoding these values means an attacker would
   need:

   - Access to the source code repository
   - Ability to modify the code
   - Ability to deploy new versions of the package
   - Users would need to update to the compromised version

   In contrast, environment variables could be modified by anyone with access to
   the CI/CD environment or deployment platform, without code changes being
   detected.

2. **Change Visibility**: Any modifications to these security-critical paths
   require:
   - A visible code change
   - Code review
   - A new package version This creates an audit trail and ensures changes are
     properly vetted.

Therefore, we will update the hardcoded values directly:

1. **Update Base Configuration** (`src/amazonS3.ts`)

   ```typescript
   // For security reasons, these values are hardcoded
   const BASE_URL = 'https://sigs.llmzy.tools';
   const BUCKET = 'llmzy-downloads-001';
   ```

2. **Update Security Path** (`src/codeSigning/SimplifiedSigning.ts`)

   ```typescript
   // For security reasons, these values are hardcoded
   export const BASE_URL = 'https://sigs.llmzy.tools';
   export const SECURITY_PATH = 'signatures';

   export const getSfdxProperty = (packageName: string, packageVersion: string): PackageJsonSfdxProperty => {
     const fullPathNoExtension = `${BASE_URL}/${SECURITY_PATH}/${packageName}/${packageVersion}`;
     return {
       signatures: {
         publicKeyUrl: `${fullPathNoExtension}.crt`,
         signatureUrl: `${fullPathNoExtension}.sig`,
       },
     };
   };
   ```

3. **Update Upload Logic** (`src/codeSigning/upload.ts`)

   ```typescript
   export async function putObject(bucket: string, key: string, body: string): Promise<AWS.S3.PutObjectOutput> {
     const s3 = new AWS.S3({
       region: 'us-east-2', // Hardcoded for security and consistency
       httpOptions: { agent: agent.http },
       httpsOptions: { agent: agent.https },
     });
     return s3
       .putObject({
         Bucket: bucket,
         Key: key,
         Body: body,
         ContentType: key.endsWith('.crt') ? 'application/x-x509-ca-cert' : 'application/octet-stream',
         CacheControl: 'public, max-age=31536000',
       })
       .promise();
   }
   ```

Note that while AWS credentials themselves (`AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY`) will still be configured via environment variables, as
these are authentication credentials rather than security-critical paths.

### 3.3 Path Structure

The system uses a consistent path structure for storing signature files:

```plaintext
s3://llmzy-downloads-001/signatures/{packageName}/{version}.crt  # Public key
s3://llmzy-downloads-001/signatures/{packageName}/{version}.sig  # Signature
```

Which maps to public URLs:

```plaintext
https://sigs.llmzy.tools/signatures/{packageName}/{version}.crt  # Public key
https://sigs.llmzy.tools/signatures/{packageName}/{version}.sig  # Signature
```

This hierarchical structure provides:

- Clear organization by package name
- Version-specific signatures
- Easy CloudFront configuration
- Simple bucket organization

### 3.4 Security Considerations

1. **AWS Security**

   - Use IAM roles with minimal required permissions
   - Enable S3 bucket versioning for audit trail
   - Configure appropriate CORS policies
   - Enable CloudFront origin access identity
   - Use SSL/TLS for all connections

2. **Access Control**

   - Restrict S3 bucket access to CloudFront only
   - Configure appropriate CloudFront behaviors
   - Implement proper AWS credentials rotation
   - Monitor AWS CloudTrail logs

3. **File Integrity**
   - Enable S3 versioning for signature files
   - Implement checksum validation
   - Configure appropriate content types
   - Set proper cache control headers

### 3.5 Testing Changes

1. **AWS Configuration Test**

   ```bash
   # Test AWS credentials
   aws s3 ls s3://llmzy-downloads-001/signatures/

   # Test CloudFront access
   curl -I https://sigs.llmzy.tools/signatures/test-package/1.0.0.crt
   ```

2. **Signing Process Test**

   ```bash
   # Set required environment variables
   export LLMZY_BASE_URL=https://sigs.llmzy.tools
   export LLMZY_BUCKET=llmzy-downloads-001
   export LLMZY_SECURITY_PATH=signatures

   # Test package signing
   llmzy-release npm package release --sign
   ```

3. **Verification Test**

   ```bash
   # Verify signed package
   llmzy-release plugins trust verify --npm test-package@1.0.0
   ```

4. **Error Handling Test**

   ```bash
   # Test with invalid AWS credentials
   AWS_ACCESS_KEY_ID=invalid AWS_SECRET_ACCESS_KEY=invalid llmzy-release npm package release --sign

   # Test with non-existent package
   llmzy-release plugins trust verify --npm nonexistent-package@1.0.0

   # Test with tampered signature
   aws s3 cp <(echo "invalid") s3://llmzy-downloads-001/signatures/test-package/1.0.0.sig
   llmzy-release plugins trust verify --npm test-package@1.0.0
   ```

### 3.6 Package.json Integration Example

The system will add a `signatures` property to package.json:

```json
{
  "signatures": {
    "publicKeyUrl": "https://sigs.llmzy.tools/signatures/package-name/1.0.0.crt",
    "signatureUrl": "https://sigs.llmzy.tools/signatures/package-name/1.0.0.sig"
  }
}
```

### 3.7 Deployment Checklist

1. **AWS Setup**

   - [ ] Configure S3 bucket with appropriate permissions
   - [ ] Set up CloudFront distribution
   - [ ] Configure SSL certificates
   - [ ] Set up IAM roles and policies
   - [ ] Enable bucket versioning
   - [ ] Configure CORS if needed

2. **Application Configuration**

   - [ ] Update environment variables
   - [ ] Test AWS connectivity
   - [ ] Verify CloudFront access
   - [ ] Test signing process
   - [ ] Verify package signatures

3. **Monitoring Setup**
   - [ ] Configure CloudWatch alerts
   - [ ] Set up access logging
   - [ ] Enable AWS CloudTrail
   - [ ] Monitor CloudFront metrics

This implementation maintains the security and functionality of the original
system while adapting it to use Llmzy's AWS infrastructure. The changes are
focused on configuration rather than core functionality, ensuring that the
robust signing and verification processes remain intact.

## 4. Test Plan and Backout Procedure

### 4.1 Manual Test Plan

1. **AWS Infrastructure Verification**

   ```bash
   # Test AWS credentials and bucket access
   aws s3 ls s3://llmzy-downloads-001/
   aws s3api get-bucket-versioning --bucket llmzy-downloads-001
   aws s3api get-bucket-cors --bucket llmzy-downloads-001
   ```

2. **CloudFront Configuration Test**

   ```bash
   # Test CloudFront domain and SSL
   curl -v https://sigs.llmzy.tools/
   # Verify SSL certificate
   openssl s_client -connect sigs.llmzy.tools:443 -servername sigs.llmzy.tools
   ```

3. **Package Signing Test**

   ```bash
   # Create a test package
   mkdir test-package && cd test-package
   npm init -y

   # Add required ignore patterns
   echo "*.tgz\n*.sig\npackage.json.bak" > .npmignore
   cp .npmignore .gitignore

   # Test package signing
   llmzy-release npm package release --sign
   ```

4. **Signature Verification Test**

   ```bash
   # Verify the uploaded files exist
   aws s3 ls s3://llmzy-downloads-001/signatures/test-package/

   # Test public access via CloudFront
   curl -I https://sigs.llmzy.tools/signatures/test-package/1.0.0.crt
   curl -I https://sigs.llmzy.tools/signatures/test-package/1.0.0.sig

   # Verify package signature
   llmzy-release plugins trust verify --npm test-package@1.0.0
   ```

5. **Error Handling Test**

   ```bash
   # Test with invalid AWS credentials
   AWS_ACCESS_KEY_ID=invalid AWS_SECRET_ACCESS_KEY=invalid llmzy-release npm package release --sign

   # Test with non-existent package
   llmzy-release plugins trust verify --npm nonexistent-package@1.0.0

   # Test with tampered signature
   aws s3 cp <(echo "invalid") s3://llmzy-downloads-001/signatures/test-package/1.0.0.sig
   llmzy-release plugins trust verify --npm test-package@1.0.0
   ```

### 4.2 Backout Procedure

If issues are discovered during testing or deployment, follow these steps to revert the changes:

1. **Code Reversion**

   ```bash
   # Revert the code changes in git
   git revert <commit-hash>
   # Or manually restore the original values:
   # - BASE_URL = 'https://developer.salesforce.com'
   # - BUCKET = 'dfc-data-production'
   # - SECURITY_PATH = 'media/salesforce-cli/security'
   ```

2. **Data Cleanup**

   ```bash
   # List all test data
   aws s3 ls s3://llmzy-downloads-001/signatures/ --recursive

   # Remove test signatures and keys
   aws s3 rm s3://llmzy-downloads-001/signatures/test-package/ --recursive

   # Optional: Remove all signature data
   aws s3 rm s3://llmzy-downloads-001/signatures/ --recursive
   ```

3. **CloudFront Cache Invalidation**

   ```bash
   # Create invalidation for test files
   aws cloudfront create-invalidation \
     --distribution-id <DISTRIBUTION_ID> \
     --paths "/signatures/test-package/*"

   # Optional: Invalidate all signature paths
   aws cloudfront create-invalidation \
     --distribution-id <DISTRIBUTION_ID> \
     --paths "/signatures/*"
   ```

4. **Verification After Backout**

   ```bash
   # Verify files are removed
   aws s3 ls s3://llmzy-downloads-001/signatures/test-package/ || echo "Files removed"

   # Verify CloudFront no longer serves the files
   curl -I https://sigs.llmzy.tools/signatures/test-package/1.0.0.crt
   ```

### 4.3 Success Criteria

The implementation is considered successful if:

1. All manual test steps pass without errors
2. Package signing process completes successfully
3. Signed packages can be verified through CloudFront
4. Error cases are handled gracefully
5. Backout procedure successfully removes test data
6. No unintended side effects on existing packages

### 4.4 Test Data Management

To prevent test data from accumulating in the production bucket:

1. Use a consistent naming pattern for test packages (e.g., `test-*`)
2. Clean up test data immediately after testing
3. Maintain a list of test package names for easy cleanup
4. Run cleanup script weekly to remove any lingering test data

```bash
# Weekly cleanup script
aws s3 ls s3://llmzy-downloads-001/signatures/test-* --recursive | \
while read -r line; do
  aws s3 rm "s3://llmzy-downloads-001/$line"
done
```

## Appendix B: Future Enhancement - Secure Auto-Updates

While @oclif/plugin-update provides auto-update functionality, it does not
include signature verification. This appendix outlines how to create a secure
auto-update system for Llmzy CLI tools by combining our signature infrastructure
with a custom update plugin.

### B.1 Current Update Process

The standard @oclif/plugin-update workflow:

1. Checks for updates by querying S3 or GitHub releases
2. Downloads the new version
3. Replaces the existing installation
4. No signature verification is performed

### B.2 Proposed Secure Update Process

A secure Llmzy updater would:

1. Check for updates (same as current)
2. Before installation:
   - Download the package signature and public key from `sigs.llmzy.tools`
   - Verify the signature matches the downloaded package
   - Only proceed with installation if verification succeeds
3. Complete the installation
4. Verify the installed package again

### B.3 Implementation Strategy

1. **Fork @oclif/plugin-update**

   ```bash
   # Create a new repository
   git clone https://github.com/oclif/plugin-update llmzy-plugin-update
   ```

2. **Add Dependencies**

   ```json
   {
     "dependencies": {
       "@oclif/plugin-update": "^3.1.5",
       "@salesforce/plugin-trust": "^3.7.69" // For signature verification
     }
   }
   ```

3. **Extend Update Hook**

   ```typescript
   // src/hooks/update.ts
   import { Hook } from '@oclif/core';
   import { verify } from '@salesforce/plugin-trust';

   const hook: Hook<'update'> = async function (opts) {
     // 1. Get update info from S3/GitHub
     const update = await this.config.findUpdate();
     if (!update) return;

     // 2. Download package
     const packagePath = await this.downloadUpdate(update);

     // 3. Download and verify signature
     const verified = await verify({
       packagePath,
       publicKeyUrl: `https://sigs.llmzy.tools/signatures/${update.name}/${update.version}.crt`,
       signatureUrl: `https://sigs.llmzy.tools/signatures/${update.name}/${update.version}.sig`,
     });

     if (!verified) {
       throw new Error('Package signature verification failed');
     }

     // 4. Proceed with update
     await this.config.runHook('preupdate', update);
     await this.executeUpdate(update, packagePath);
     await this.config.runHook('postupdate', update);
   };

   export default hook;
   ```

4. **Add Verification Command**

   ```typescript
   // src/commands/update/verify.ts
   import { Command } from '@oclif/core';
   import { verify } from '@salesforce/plugin-trust';

   export default class VerifyUpdate extends Command {
     static description = 'Verify the authenticity of an installed update';

     async run() {
       const { root } = this.config;
       const verified = await verify({
         packagePath: root,
         // ... signature verification logic
       });

       if (verified) {
         this.log('Installation verified successfully');
       } else {
         this.error('Installation verification failed');
       }
     }
   }
   ```

### B.4 Security Considerations

1. **Fail Closed**

   - If signature verification fails, abort the update
   - If signature files are unavailable, abort the update
   - Provide clear error messages to users

2. **Version Pinning**

   - Consider implementing version pinning for critical updates
   - Allow organizations to control which versions are approved

3. **Offline Verification**
   - Cache public keys for offline verification
   - Implement key rotation strategy
   - Consider certificate pinning for signature endpoints

### B.5 User Experience

1. **Automatic Updates**

   ```bash
   # Default update with verification
   llmzy-release update
   ```

2. **Manual Verification**

   ```bash
   # Verify current installation
   llmzy-release update:verify

   # Verify specific version
   llmzy-release update:verify --version 1.2.3
   ```

3. **Error Handling**

   ```typescript
   // Clear error messages for verification failures
   if (!verified) {
     this.error(`
       Update verification failed
       Expected signature: ${signatureUrl}
       If this persists, please:
       1. Download from https://github.com/llmzy/cli/releases
       2. Verify the checksum
       3. Install manually
     `);
   }
   ```

### B.6 Testing Strategy

1. **Unit Tests**

   - Mock signature verification
   - Test failure modes
   - Verify error handling

2. **Integration Tests**

   ```typescript
   describe('update verification', () => {
     it('verifies valid updates', async () => {
       // Test with known good signature
     });

     it('rejects invalid signatures', async () => {
       // Test with tampered package
     });

     it('handles missing signatures gracefully', async () => {
       // Test with missing signature files
     });
   });
   ```

3. **End-to-End Tests**
   - Test complete update workflow
   - Verify with real signatures
   - Test offline behavior

This enhancement would provide a secure auto-update mechanism that leverages our
existing signature infrastructure, ensuring that only authentic updates are
installed.
