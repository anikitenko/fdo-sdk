# FDO SDK Constitution

## Core Principles

### Plugin Architecture Integrity

The FDO SDK MUST maintain a clean, extensible plugin architecture that allows developers to create modular extensions for the FlexDevOps desktop application. All plugin interfaces MUST be well-defined, stable, and backward-compatible within major versions. The SDK MUST provide clear lifecycle hooks (init, render) that plugins can rely on. Breaking changes to the plugin API require a major version bump and comprehensive migration documentation.

**Rationale**: Plugin developers depend on stable APIs to build reliable extensions. A well-defined architecture prevents fragmentation and ensures the ecosystem remains healthy and maintainable.

### Type Safety and Developer Experience

All public APIs MUST be fully typed using TypeScript with strict mode enabled. Type definitions MUST be exported and available to plugin developers. The SDK MUST generate accurate TypeScript declaration files (.d.ts) as part of the build process. Runtime type checking SHOULD be used for external inputs where appropriate.

**Rationale**: Strong typing prevents entire classes of bugs, improves IDE support, and makes the SDK easier to learn and use. Plugin developers benefit from autocomplete, inline documentation, and compile-time error detection.

### Testing and Quality Assurance

All new features and bug fixes MUST include corresponding Jest tests. Test coverage MUST be maintained at a minimum of 80% for core functionality. Tests MUST run successfully in CI before any code is merged to main. Critical paths (plugin lifecycle, IPC communication, DOM generation) MUST have comprehensive integration tests.

**Rationale**: High test coverage ensures reliability and prevents regressions. Plugin developers need confidence that the SDK behaves predictably across versions and environments.

### Automated Release Management

Version management MUST be automated through CI/CD workflows. Pull requests MUST trigger automatic patch version bumps. All releases to npm MUST include provenance information for supply chain security. The main branch MUST always be in a releasable state. Breaking changes require manual major version bumps with clear changelog entries.

**Rationale**: Automated versioning reduces human error and ensures consistent release practices. Provenance tracking enhances security and trust in the package ecosystem.

### Documentation and Examples

All public APIs MUST be documented with JSDoc comments including parameter types, return types, and usage examples. The repository MUST maintain working example plugins that demonstrate core functionality. Breaking changes MUST be documented in CHANGELOG.md with migration guides. README MUST be kept up-to-date with installation instructions and quick start guides.

**Rationale**: Good documentation lowers the barrier to entry for new plugin developers and reduces support burden. Examples serve as both documentation and integration tests.

## Development Standards

### Code Quality

Code MUST follow consistent formatting and linting rules. TypeScript strict mode MUST be enabled. No `any` types SHOULD be used in public APIs without explicit justification. All exported functions and classes MUST have JSDoc documentation. Code reviews are REQUIRED for all pull requests.

### Build and Distribution

The SDK MUST produce both UMD bundles (for browser/Electron) and TypeScript declarations. Webpack configuration MUST exclude Electron and Node.js built-ins from the bundle. The build process MUST be reproducible and documented. All dependencies MUST be explicitly declared in package.json with appropriate version constraints.

### Security Practices

Sensitive operations (sudo prompts, file system access) MUST be clearly documented and require explicit opt-in. The SDK MUST NOT log sensitive information. Dependencies MUST be regularly updated to address security vulnerabilities. All npm releases MUST use provenance attestation.

## Governance

### Amendment Process

This constitution may be amended through pull requests that modify this document. Amendments require approval from repository maintainers. Major principle changes require a MAJOR version bump. Minor clarifications or additions require a MINOR version bump. Typo fixes and formatting changes require a PATCH version bump.

### Versioning Policy

The SDK follows Semantic Versioning (SemVer 2.0.0):
- MAJOR: Breaking changes to public APIs, plugin interfaces, or core principles
- MINOR: New features, new APIs, or expanded functionality (backward-compatible)
- PATCH: Bug fixes, documentation updates, internal refactoring (backward-compatible)

### Compliance Review

All pull requests MUST be reviewed against these principles before merging. CI checks MUST enforce testing, building, and type checking requirements. Maintainers MUST ensure that changes align with the core principles outlined in this constitution.

**Version**: 1.0.0 | **Ratified**: 2025-10-27 | **Last Amended**: 2025-10-27
