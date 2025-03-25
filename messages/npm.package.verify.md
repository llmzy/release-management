# description

Verify the digital signature of an npm package.

# examples

- <%= config.bin %> <%= command.id %> --npm package-name@1.0.0
- <%= config.bin %> <%= command.id %> --npm @scope/package-name@1.0.0
- <%= config.bin %> <%= command.id %> --npm package-name@1.0.0 --registry https://registry.npmjs.org/

# flags.npm.summary

The npm package name and version to verify (e.g., package-name@1.0.0 or @scope/package-name@1.0.0)

# flags.registry.summary

The npm registry URL to use (default: https://registry.npmjs.org/)

# NotSigned

This package is not digitally signed.

# SignatureCheckSuccess

Successfully verified digital signature for %s@%s

# FailedDigitalSignatureVerification

Failed to verify the digital signature.
