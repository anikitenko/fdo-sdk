# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.19] - 2025-11-11

### Changed

- Updated electron dependency from 35.1.0 to 35.7.5 to fix security vulnerability (GHSA-vmqv-hx8q-j7mg)
- Updated brace-expansion dependency to fix Regular Expression Denial of Service vulnerability
- Fixed trailing commas in tsconfig.json for better JSON compliance

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
