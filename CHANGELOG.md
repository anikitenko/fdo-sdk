# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1](https://github.com/anikitenko/fdo-sdk/compare/fdo-sdk-v1.1.0...fdo-sdk-v1.1.1) (2026-03-29)


### Bug Fixes

* **examples:** remove console logging and fix runtime issues ([#42](https://github.com/anikitenko/fdo-sdk/issues/42)) ([5e452ae](https://github.com/anikitenko/fdo-sdk/commit/5e452ae64749d71943b64844bac1b5961d4290b1))

## [1.1.0](https://github.com/anikitenko/fdo-sdk/compare/v1.0.22...v1.1.0) (2026-03-29)


### Features

* Implement enhanced error handling with decorators ([ed9b98f](https://github.com/anikitenko/fdo-sdk/commit/ed9b98f6a5667626edb33743f712560ad838a298))
* Implement enhanced error handling with decorators ([77edc9f](https://github.com/anikitenko/fdo-sdk/commit/77edc9fbc1ac636aa46a2cfd57150a6db4220530))
* initialize spec-kit structure with copilot integration ([ba8054e](https://github.com/anikitenko/fdo-sdk/commit/ba8054e33de408bade3a073e1943231cc3186e1d))


### Bug Fixes

* correct constitution dates to 2025-10-27 ([2c95634](https://github.com/anikitenko/fdo-sdk/commit/2c956343f09258c66169f53ad47f99a927f9af0b))
* remove duplicate memory/constitution.md from root ([d596aba](https://github.com/anikitenko/fdo-sdk/commit/d596aba484e614cc29864eb05355dceddc50f2fd))

### Added

- Host privileged action SDK contracts and root exports for FDO host integration:
  - `validateHostPrivilegedActionRequest`
  - `createHostsWriteActionRequest(request)`
  - `createFilesystemMutateActionRequest(request)`
  - `createFilesystemScopeCapability(scopeId)`
- New capability typing for scoped privileged filesystem access:
  - `system.hosts.write`
  - `system.fs.scope.<scope-id>`
- New privileged action typing:
  - `system.hosts.write`
  - `system.fs.mutate`
- Developer UX helpers for privileged request construction and validation:
  - `validatePrivilegedActionRequest`
  - `requireFilesystemScopeCapability`
- Example plugin for privileged request flow:
  - `examples/08-privileged-actions-plugin.ts`

### Changed

- Strengthened host privileged action validator rules with deterministic errors:
  - action enum enforcement
  - action-specific payload shape checks
  - absolute-path enforcement for filesystem mutate operations
  - operation allowlist (`mkdir`, `writeFile`, `appendFile`, `rename`, `remove`)
  - encoding allowlist (`utf8`, `base64`) for write/append operations
  - scope format validation (`^[a-z0-9][a-z0-9._-]*$`)
- Updated privileged action contract docs with `createBackendReq` + `correlationId` usage and stable response envelope guidance.

## [Unreleased]

### Changed

- Release automation is managed by Release Please (`.github/workflows/release-please.yml`), including automated versioning and changelog updates on release PRs.

## [1.0.19] - 2025-11-11

### Changed

- Updated electron dependency from 35.1.0 to 35.7.5 to fix security vulnerability (GHSA-vmqv-hx8q-j7mg)
- Updated brace-expansion dependency to fix Regular Expression Denial of Service vulnerability
- Fixed trailing commas in tsconfig.json for better JSON compliance
- Enhanced package.json with improved keywords for better npm discoverability
- Added `prebuild` script to automatically generate TypeScript declarations before building
- Added `prepublishOnly` script to ensure tests pass and build succeeds before publishing
- Added Node.js and npm engine requirements (Node >=18.0.0, npm >=9.0.0) for compatibility clarity

### Documentation

- Updated README.md with comprehensive development workflow documentation
- Added documentation for all npm scripts including coverage and publishing workflows

## [1.0.18] - 2025-11-11

### Added

- **DOMTable class** for creating HTML table structures
  - `createTable()` - Create table element
  - `createTableHead()` - Create thead element
  - `createTableBody()` - Create tbody element
  - `createTableFoot()` - Create tfoot element
  - `createTableRow()` - Create tr element
  - `createTableHeader()` - Create th element with scope support
  - `createTableCell()` - Create td element with colspan/rowspan support
  - `createCaption()` - Create caption element

- **DOMMedia class** for creating media elements
  - `createImage()` - Create img element with src, alt, width, height, and loading attributes

- **DOMSemantic class** for creating semantic HTML5 elements
  - `createArticle()` - Create article element
  - `createSection()` - Create section element
  - `createNav()` - Create nav element
  - `createHeader()` - Create header element
  - `createFooter()` - Create footer element
  - `createAside()` - Create aside element
  - `createMain()` - Create main element

- **Enhanced DOMNested class** with additional list types
  - `createOrderedList()` - Create ol element
  - `createDefinitionList()` - Create dl element
  - `createDefinitionTerm()` - Create dt element
  - `createDefinitionDescription()` - Create dd element

- **Enhanced DOMInput class** with select dropdown support
  - `createSelect()` - Create select element with onChange handler support
  - `createOption()` - Create option element with value and selected attributes
  - `createOptgroup()` - Create optgroup element for grouping options

- **Example plugin** (`examples/dom_elements_plugin.ts`) demonstrating all new DOM element capabilities

- **Comprehensive test coverage** for all new DOM classes and methods
  - Unit tests for DOMTable, DOMMedia, DOMSemantic
  - Enhanced tests for DOMNested and DOMInput
  - Integration tests demonstrating real-world usage

### Changed

- Updated README.md with comprehensive documentation of new DOM element capabilities
- Updated index.ts to export new DOM classes (DOMTable, DOMMedia, DOMSemantic)

### Technical Details

- All new DOM classes extend the base DOM class and follow existing architecture patterns
- Full TypeScript type safety with strict mode enabled
- JSDoc documentation with @uiName tags for all public methods
- CSS-in-JS integration via goober for styling support
- Custom attributes support for all new elements
- Event handler support for interactive elements
- Maintains backward compatibility with existing DOM classes

## [1.0.15] - Previous Release

- Initial release with core DOM classes (DOMText, DOMButton, DOMInput, DOMLink, DOMNested, DOMMisc)
- Plugin framework with FDO_SDK base class
- IPC communication system
- Storage backends (StoreDefault, StoreJson)
- Logging and system integration utilities
