# Adapting `plugin-release-management` for Llmzy

## Executive Summary

The `plugin-release-management` project has been successfully adapted for
Llmzy's infrastructure with the following key changes:

1. **Infrastructure Updates**

   - Changed S3 bucket from `dfc-data-production` to `llmzy-downloads-001` (US
     East/Ohio)
   - Updated base URL from `developer.salesforce.com` to `sigs.llmzy.tools`
   - Modified security path to use `signatures/` prefix instead of
     `media/salesforce-cli/security/`

2. **Package Signing**

   - Updated package.json to use `signatures` property instead of
     Salesforce-specific `sfdx` property
   - Maintained the same secure RSA-SHA256 signing process
   - Preserved the ephemeral key pair generation for each signing operation

3. **Package Manager Support**

   - Added support for both npm and Yarn package managers
   - Implemented automatic detection of the target project's package manager
   - Updated all relevant commands to work with the detected package manager
   - Added comprehensive tests for both package managers

4. **Command Updates**
   - Modified `npm:package:release` command to work with both npm and Yarn
   - Added `npm:package:verify` command for signature verification
   - Updated all commands to use the new infrastructure endpoints

These changes ensure that Llmzy's npm packages can be securely signed and
verified while maintaining compatibility with projects using either npm or Yarn
as their package manager.

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

### 3.2 Implemented Code Changes

The following changes have been implemented to adapt the plugin for Llmzy's
infrastructure:

#### 3.2.1 Infrastructure Endpoints and Security Path Updates

The original codebase hardcoded certain security-critical values which have been
updated:

```typescript
// Original (salesforce) values
// const BUCKET = 'dfc-data-production';
// export const BASE_URL = 'https://developer.salesforce.com';
// export const SECURITY_PATH = 'media/salesforce-cli/security';

// Updated (llmzy) values in src/amazonS3.ts and src/codeSigning/SimplifiedSigning.ts
const BUCKET = 'llmzy-downloads-001';
export const BASE_URL = 'https://sigs.llmzy.tools';
export const SECURITY_PATH = 'signatures';
```

The region for S3 operations was also set to the US East/Ohio region:

```typescript
// In src/codeSigning/upload.ts
export async function putObject(bucket: string, key: string, body: string): Promise<AWS.S3.PutObjectOutput> {
  const s3 = new AWS.S3({
    region: 'us-east-2', // Hardcoded for security and consistency
    httpOptions: { agent: agent.http },
    httpsOptions: { agent: agent.https },
  });
  // ...
}
```

#### 3.2.2 Package.json Structure Updates

The package signing information is now stored in the `signatures` property
instead of the Salesforce-specific `sfdx` property:

```typescript
// In src/codeSigning/packAndSign.ts
// Original approach:
// packageJson.sfdx = {
//   publicKeyUrl: signatureUrls.publicKeyUrl,
//   signatureUrl: signatureUrls.signatureUrl,
// };

// Updated approach:
packageJson.signatures = {
  signatureUrl: signatureUrls.signatureUrl,
  publicKeyUrl: signatureUrls.publicKeyUrl,
};
```

The property name changes are also reflected in associated functions and test
files:

```typescript
// In src/codeSigning/SimplifiedSigning.ts
export const getSignaturesProperty = (packageName: string, packageVersion: string): PackageJsonSignatures => {
  const fullPathNoExtension = `${BASE_URL}/${SECURITY_PATH}/${packageName}/${packageVersion}`;
  return {
    publicKeyUrl: `${fullPathNoExtension}.crt`,
    signatureUrl: `${fullPathNoExtension}.sig`,
  };
};
```

#### 3.2.3 Package Manager Support

A new system was implemented to detect and use the appropriate package manager
(npm or Yarn) for the target project:

1. **Package Manager Interface** (`src/targetPackageManager/index.ts`)

   ```typescript
   export type TargetPackageManager = {
     getInstallCommand(registryParam?: string): string;
     getDeduplicateCommand(): string;
     getBuildCommand(): string;
     getScriptCommand(script: string): string;
     getPublishCommand(
       registryParam?: string,
       access?: string,
       tag?: string,
       dryrun?: boolean,
       tarball?: string
     ): string;
   };
   ```

2. **Package Manager Implementations**

   - `NpmTargetManager` (`src/targetPackageManager/npm.ts`)
   - `YarnTargetManager` (`src/targetPackageManager/yarn.ts`)

3. **Package Manager Detection** (`src/targetPackageManager/detection.ts`)

   ```typescript
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
   ```

4. **Repository Integration** (`src/repository.ts`)

   ```typescript
   // Added packageManager field to Repository class
   protected packageManager!: TargetPackageManager;

   // Initialize it in the init method
   protected async init(): Promise<void> {
     this.packageManager = detectPackageManager(process.cwd());
     return Promise.resolve();
   }

   // Use packageManager for various operations
   public install(silent = false): void {
     this.execCommand(this.packageManager.getInstallCommand(this.registry.getRegistryParameter()), silent);
   }

   public build(silent = false): void {
     this.execCommand(this.packageManager.getBuildCommand(), silent);
   }

   public run(script: string, location?: string, silent = false): void {
     if (location) {
       this.execCommand(`(cd ${location} && ${this.packageManager.getScriptCommand(script)})`, silent);
     } else {
       this.execCommand(this.packageManager.getScriptCommand(script), silent);
     }
   }

   public publish(opts: PublishOpts = {}): Promise<void> {
     // ...
     const cmd = this.packageManager.getPublishCommand(
       this.registry.getRegistryParameter(),
       access,
       tag,
       dryrun,
       signatures?.[0]?.fileTarPath
     );
     // ...
   }
   ```

#### 3.2.4 Comprehensive Testing

1. **Package Manager Detection Tests**
   (`test/targetPackageManager/detection.test.ts`)

   - Tests detection from yarn.lock
   - Tests detection from package-lock.json
   - Tests detection from packageManager field
   - Tests fallback to npm

2. **Package Manager Implementation Tests**

   - Tests for npm commands (`test/targetPackageManager/npm.test.ts`)
   - Tests for yarn commands (`test/targetPackageManager/yarn.test.ts`)

3. **Repository Integration Tests** (`test/repository.test.ts`)

   - Tests for `install()` with both npm and yarn
   - Tests for `build()` with both npm and yarn
   - Tests for `run()` with both npm and yarn
   - Tests for command options like silent mode and specific location

4. **Command Tests** (`test/commands/npm.package.release.test.ts`)

   - Tests release process with both npm and yarn
   - Tests publishing with both package managers

5. **Verification Tests** (`test/commands/npm.package.verify.test.ts`)
   - Tests verification of package signatures
   - Handles both signed and unsigned packages
   - Works with different npm registries including GitHub Packages

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

   - [x] Configure S3 bucket with appropriate permissions
   - [x] Set up CloudFront distribution
   - [x] Configure SSL certificates
   - [x] Set up IAM roles and policies

2. **Application Configuration**

   - [x] Test AWS connectivity
   - [x] Verify CloudFront access
   - [x] Test signing process
   - [x] Verify package signatures

3. **Monitoring Setup**
   - [ ] Configure CloudWatch alerts
   - [ ] Set up access logging
   - [ ] Enable AWS CloudTrail
   - [ ] Monitor CloudFront metrics

### 3.8 Package Manager Support for Target Projects

#### 3.8.1 Scope

This section addresses changes needed to support both npm and Yarn when working
with target projects. The changes do not affect how this plugin manages its own
dependencies or development tooling, which will continue to use Yarn.

##### 3.8.1.1 Out of Scope

- Development tooling (husky scripts, linting, etc.)
- Plugin's own dependency management
- Plugin's own build/test/lint commands
- Plugin's own CLI tooling (oclif commands)

##### 3.8.1.2 In Scope

- Package manager detection for target projects
- Package installation in target projects
- Build execution in target projects
- Script execution in target projects
- Test execution in target projects

#### 3.8.2 Package Manager Detection

The system will detect the package manager of target projects through the
following methods:

1. **Primary Detection Method**:

   - Check for presence of `yarn.lock` or `package-lock.json` in target project
   - Check for `packageManager` field in target project's package.json
   - Default to npm if no clear indicator is found

2. **Detection Location**:
   - Only check in the target project directory
   - Ignore package manager configuration of this plugin itself

#### 3.8.3 Implementation Strategy

1. **Create Package Manager Interface**:

   ```typescript
   // src/targetPackageManager/index.ts
   export interface TargetPackageManager {
     install(registryParam: string, silent: boolean): void;
     build(silent: boolean): void;
     runScript(script: string, location?: string, silent: boolean): void;
     getInstallCommand(): string;
     getDeduplicateCommand(): string;
   }
   ```

2. **Implement Package Managers**:

   ```typescript
   // src/targetPackageManager/yarn.ts
   export class YarnTargetManager implements TargetPackageManager {
     install(registryParam: string, silent: boolean): void {
       this.execCommand(`yarn install ${registryParam}`, silent);
     }
     // ... other implementations
   }

   // src/targetPackageManager/npm.ts
   export class NpmTargetManager implements TargetPackageManager {
     install(registryParam: string, silent: boolean): void {
       this.execCommand(`npm install ${registryParam}`, silent);
     }
     // ... other implementations
   }
   ```

3. **Update Repository Class**:

   ```typescript
   // src/repository.ts
   export class Repository {
     private packageManager: TargetPackageManager;

     constructor() {
       this.packageManager = await TargetPackageManager.detect(this.projectRoot);
     }

     public install(silent = false): void {
       this.packageManager.install(this.registry.getRegistryParameter(), silent);
     }

     public build(silent = false): void {
       this.packageManager.build(silent);
     }

     public run(script: string, location?: string, silent = false): void {
       this.packageManager.runScript(script, location, silent);
     }
   }
   ```

#### 3.8.4 Testing Strategy

1. **Unit Tests** (`test/targetPackageManager.test.ts`):

   - Test package manager detection logic
   - Test command generation for each package manager
   - Test error handling and fallbacks
   - Test silent mode operation

2. **Integration Tests** (`test/targetPackageManager/integration.test.ts`):

   - Test with real npm and Yarn projects
   - Test actual command execution
   - Test lockfile creation/modification
   - Test script execution

3. **Repository Integration Tests**:

   - Update existing repository tests to verify package manager integration
   - Test all repository operations with both package managers
   - Verify correct command execution

4. **Build Process Tests**:
   - Test build process with both package managers
   - Verify correct installation and deduplication
   - Test script execution in build process

#### 3.8.5 Migration Path

1. **For Existing Projects**:

   - No changes required
   - System will continue to use Yarn by default
   - Projects can opt-in to npm by adding appropriate configuration

2. **For New Projects**:
   - System will automatically detect and use the appropriate package manager
   - No manual configuration required unless specific behavior is needed

#### 3.8.6 Documentation Updates

1. **Command Documentation**:

   - Update command descriptions to mention package manager support
   - Add examples for both npm and Yarn projects
   - Document package manager detection behavior

2. **Project Requirements**:
   - Clarify which package manager features are required
   - Document any package manager-specific limitations
   - Explain detection and fallback behavior

#### 3.8.7 Error Handling

1. **Package Manager Detection**:

   - Clear error messages when detection fails
   - Logging of detection process for debugging
   - Graceful fallback to npm

2. **Command Execution**:
   - Proper error propagation from package manager commands
   - Clear error messages for common failure cases
   - Logging of command execution for debugging

#### 3.8.8 Future Considerations

1. **Additional Package Managers**:

   - Design allows for easy addition of new package managers
   - Interface can be extended for new package manager features
   - Detection system can be enhanced for new indicators

2. **Performance Optimization**:

   - Cache package manager detection results
   - Optimize command execution for each package manager
   - Consider parallel operations where possible

3. **Security Considerations**:
   - Validate package manager commands
   - Sanitize script inputs
   - Handle package manager-specific security features

#### 3.8.9 Implementation Checklist

##### Infrastructure Updates ✅

- [x] Update S3 bucket from `dfc-data-production` to `llmzy-downloads-001`
- [x] Change base URL from `developer.salesforce.com` to `sigs.llmzy.tools`
- [x] Modify security path from `media/salesforce-cli/security` to `signatures`
- [x] Set AWS region to `us-east-2` (US East/Ohio)
- [x] Update upload logic to use the new paths and bucket

##### Package.json Updates ✅

- [x] Change property from `sfdx` to `signatures` in package.json
- [x] Update functions that read/write the signature information
- [x] Modify tests to verify the new structure
- [x] Ensure backward compatibility is maintained where needed
- [x] Update verification process to check both locations

##### Package Manager Support ✅

- [x] Create `TargetPackageManager` interface
- [x] Implement `NpmTargetManager` class
- [x] Implement `YarnTargetManager` class
- [x] Implement package manager detection logic
- [x] Update `Repository` class to use the appropriate package manager
- [x] Update `install()`, `build()`, and `run()` methods
- [x] Update publishing logic to use the detected package manager
- [x] Add comprehensive tests for all package manager functionality

##### Command Updates ✅

- [x] Update `npm:package:release` command to work with both npm and Yarn
- [x] Add `npm:package:verify` command to verify package signatures
- [x] Ensure all commands work with the new infrastructure endpoints
- [x] Add tests for commands with both package managers

##### Testing ✅

- [x] Add package manager detection tests
- [x] Create npm implementation tests
- [x] Create yarn implementation tests
- [x] Update repository tests to cover both package managers
- [x] Add npm release tests with both package managers
- [x] Add verification tests for signed packages
- [x] Test with different npm registries including GitHub Packages

##### Documentation 🔄

- [x] Update README with information about the infrastructure changes
- [x] Document the use of `signatures` property instead of `sfdx`
- [x] Add usage examples for npm and Yarn projects
- [ ] Provide detailed documentation on AWS setup requirements
- [ ] Document error handling and troubleshooting
- [ ] Add migration guide for users of the original package

##### Future Enhancements 📝

- [ ] Create a secure auto-update system using signatures
- [ ] Implement certificate pinning for signature endpoints
- [ ] Add support for configurable signing algorithms
- [ ] Create diagnostics commands for troubleshooting
- [ ] Add CI/CD integration examples

Legend:

- ✅ Completed
- 🔄 In Progress
- 📝 Planned for future
- ❌ Blocked

Current Status:

- Core infrastructure for package manager support is in place
- Basic unit tests are implemented
- Command documentation has been updated
- Repository class has been updated with package manager field and detection

Next Steps:

1. Complete Repository class method updates (install, build, run)
2. Update all commands to use the package manager
3. Add comprehensive integration tests
4. Implement error handling and security features
5. Complete remaining documentation updates

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

If issues are discovered during testing or deployment, follow these steps to
revert the changes:

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

The existing package verification code in `src/commands/npm/package/verify.ts` provides a solid foundation for implementing secure auto-updates. This code already handles:

1. **Package Verification**

   - Downloads and verifies package tarballs
   - Validates RSA-SHA256 signatures
   - Extracts and validates package.json contents
   - Supports both npm and GitHub Packages registries

2. **Signature Management**

   - Handles signature URLs from both registry metadata and package.json
   - Supports both new `signatures` and legacy `sfdx` formats
   - Downloads and validates public keys and signatures

3. **Error Handling**
   - Graceful handling of unsigned packages
   - Proper error messages for verification failures
   - Support for different registry types and authentication methods

To implement secure auto-updates, we can repurpose this code by:

1. **Creating an Update Checker**

   ```typescript
   class UpdateChecker {
     private verify: typeof Verify;

     constructor() {
       this.verify = new Verify();
     }

     async checkForUpdates(packageName: string, currentVersion: string): Promise<UpdateInfo> {
       // Use existing getNpmMetadata to fetch latest version
       const metadata = await Verify.getNpmMetadata(packageName, 'latest', registry);

       // Compare versions
       if (semver.gt(metadata.version, currentVersion)) {
         // Use existing verification code to validate the update
         const verified = await this.verify.verifyPackage(packageName, metadata.version);
         if (verified) {
           return {
             hasUpdate: true,
             latestVersion: metadata.version,
             verified: true,
           };
         }
       }

       return { hasUpdate: false, verified: false };
     }
   }
   ```

2. **Adding Update Installation**

   ```typescript
   class SecureUpdater {
     private checker: UpdateChecker;

     async update(packageName: string, currentVersion: string): Promise<UpdateResult> {
       const updateInfo = await this.checker.checkForUpdates(packageName, currentVersion);

       if (updateInfo.hasUpdate && updateInfo.verified) {
         // Use existing download and verification code
         const tarball = await Verify.downloadTarball(updateInfo.tarballUrl);
         const verified = await Verify.verifySignature(tarball, updateInfo.publicKey, updateInfo.signature);

         if (verified) {
           // Install the verified update
           await this.installUpdate(tarball);
           return { success: true, newVersion: updateInfo.latestVersion };
         }
       }

       return { success: false, error: 'Update verification failed' };
     }
   }
   ```

3. **Integration with Package Manager**

   ```typescript
   class PackageManager {
     private updater: SecureUpdater;

     async checkAndUpdate(packageName: string): Promise<void> {
       const currentVersion = await this.getInstalledVersion(packageName);
       const result = await this.updater.update(packageName, currentVersion);

       if (result.success) {
         this.notify(`Successfully updated ${packageName} to ${result.newVersion}`);
       } else {
         this.notify(`Update failed: ${result.error}`);
       }
     }
   }
   ```

This approach leverages the existing verification infrastructure while adding:

1. **Automatic Update Detection**

   - Version comparison using semver
   - Registry polling for updates
   - Configurable update check intervals

2. **Secure Installation**

   - Verification before installation
   - Rollback capability on failure
   - Atomic updates

3. **User Experience**
   - Progress notifications
   - Update scheduling
   - Manual override options

The implementation will maintain the same security guarantees as the current verification system while adding the convenience of automatic updates.
