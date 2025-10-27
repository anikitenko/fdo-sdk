# Implementation Plan: Add More DOM Elements

**Branch**: `001-more-dom-elements` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-more-dom-elements/spec.md`

## Summary

This feature adds comprehensive DOM element creation capabilities to the FDO SDK, enabling plugin developers to create tables, media elements, semantic HTML5 structures, additional list types, and select dropdowns. The implementation follows the existing architecture pattern where specialized classes (DOMTable, DOMMedia, DOMSemantic) extend the base DOM class and provide type-safe, styled element generation methods. This expansion significantly increases the SDK's UI building capabilities while maintaining backward compatibility and adhering to the established patterns for CSS-in-JS integration via goober.

## Technical Context

**Language/Version**: TypeScript 5.7.3 with strict mode enabled  
**Primary Dependencies**: goober 2.1.16 (CSS-in-JS), electron 35.0.0, webpack 5.98.0  
**Storage**: N/A (DOM generation only, no persistence)  
**Testing**: Jest 29.7.0 with ts-jest 29.2.5, minimum 80% coverage required  
**Target Platform**: Electron desktop application (cross-platform: Windows, macOS, Linux)  
**Project Type**: Single project (SDK library)  
**Performance Goals**: DOM element generation < 1ms per element, bundle size increase < 50KB  
**Constraints**: Must maintain backward compatibility, follow existing DOM class patterns, integrate with goober SSR  
**Scale/Scope**: 5 new/enhanced classes, ~30 new methods, comprehensive test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Plugin Architecture Integrity ✓
- New DOM classes follow the established plugin architecture pattern
- All classes extend base DOM class maintaining consistent interface
- No breaking changes to existing plugin APIs
- Lifecycle hooks remain unchanged

### Type Safety and Developer Experience ✓
- All new methods are fully typed with TypeScript strict mode
- JSDoc documentation with @uiName tags for all public methods
- Type definitions will be generated via tsc --emitDeclarationOnly
- Usage examples included in JSDoc comments

### Testing and Quality Assurance ✓
- Jest unit tests required for all new classes and methods
- Integration tests demonstrating real plugin usage
- Minimum 80% code coverage target
- CI/CD pipeline will validate all tests pass

### Automated Release Management ✓
- Changes will go through standard PR workflow
- Automatic patch version bump on PR creation
- CI will run tests and build before merge
- npm publish with provenance on main branch merge

### Documentation and Examples ✓
- JSDoc comments for all public APIs
- Usage examples in each method's documentation
- Example plugins demonstrating new DOM elements
- README updates if needed for new capabilities

**Constitution Compliance**: PASS - All core principles are satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-more-dom-elements/
├── spec.md              # Feature specification (completed)
└── plan.md              # This implementation plan
```

### Source Code (repository root)

```text
src/
├── DOM.ts                    # Base class (existing, no changes)
├── DOMText.ts                # Text elements (existing, no changes)
├── DOMButton.ts              # Button elements (existing, no changes)
├── DOMInput.ts               # Input elements (existing, ENHANCED with select/option)
├── DOMLink.ts                # Link elements (existing, no changes)
├── DOMNested.ts              # Container elements (existing, ENHANCED with ol/dl)
├── DOMMisc.ts                # Misc elements (existing, no changes)
├── DOMTable.ts               # NEW: Table elements
├── DOMMedia.ts               # NEW: Media elements (img)
├── DOMSemantic.ts            # NEW: Semantic HTML5 elements
├── index.ts                  # Main exports (UPDATED to export new classes)
└── types.ts                  # Type definitions (existing, may need updates)

tests/
├── DOM.test.ts               # Base class tests (existing)
├── DOMText.test.ts           # Text element tests (existing)
├── DOMButton.test.ts         # Button tests (existing)
├── DOMInput.test.ts          # Input tests (existing, ENHANCED)
├── DOMLink.test.ts           # Link tests (existing)
├── DOMNested.test.ts         # Nested element tests (existing, ENHANCED)
├── DOMMisc.test.ts           # Misc tests (existing)
├── DOMTable.test.ts          # NEW: Table element tests
├── DOMMedia.test.ts          # NEW: Media element tests
├── DOMSemantic.test.ts       # NEW: Semantic element tests
└── integration/              # NEW: Integration tests for real plugin usage
    └── dom-elements.test.ts

examples/
└── dom_elements_plugin.ts    # NEW: Example plugin demonstrating new elements
```

**Structure Decision**: Single project structure is maintained. New classes follow the existing pattern of one class per file in src/ with corresponding test files in tests/. The DOM*.ts naming convention is preserved for consistency.

## Implementation Phases

### Phase 0: Research and Preparation

**Objective**: Understand existing patterns and prepare for implementation

**Tasks**:
1. Review existing DOM class implementations (DOM.ts, DOMText.ts, DOMButton.ts, etc.)
2. Document the common patterns used across all DOM classes
3. Identify how goober CSS-in-JS integration works in existing code
4. Review existing test patterns and coverage requirements
5. Verify TypeScript configuration and strict mode requirements
6. Document the createElement() method signature and usage
7. Document the combineProperties() method and options handling
8. Review how event handlers are attached to elements
9. Identify any edge cases in existing implementations
10. Create a checklist of requirements for each new class

**Deliverables**:
- Research notes documenting existing patterns
- Checklist of implementation requirements
- Understanding of goober integration
- Test pattern documentation

### Phase 1: Design and Contracts

**Objective**: Design the API surface for new DOM classes

**Tasks**:
1. Design DOMTable class API with all table-related methods
2. Design DOMMedia class API for image elements
3. Design DOMSemantic class API for HTML5 semantic elements
4. Design enhancements to DOMNested for ol/dl elements
5. Design enhancements to DOMInput for select/option elements
6. Define method signatures with TypeScript types
7. Write JSDoc documentation templates for all methods
8. Create usage examples for each method
9. Design test cases for each new method
10. Validate designs against constitution requirements

**Deliverables**:
- API design document with method signatures
- JSDoc documentation templates
- Usage examples for each method
- Test case specifications
- Type definitions for new classes

### Phase 2: Implementation - DOMTable Class (Priority P1)

**Objective**: Implement table element generation

**Tasks**:
1. Create src/DOMTable.ts extending DOM base class
2. Implement createTable() method for table element
3. Implement createTableHead() method for thead element
4. Implement createTableBody() method for tbody element
5. Implement createTableFoot() method for tfoot element
6. Implement createTableRow() method for tr element
7. Implement createTableHeader() method for th element
8. Implement createTableCell() method for td element
9. Implement createCaption() method for caption element
10. Add JSDoc documentation with @uiName tags
11. Add usage examples to JSDoc comments
12. Export DOMTable from index.ts
13. Create tests/DOMTable.test.ts with comprehensive test coverage
14. Test table generation with various configurations
15. Test styling and custom attributes
16. Test event handler attachment
17. Test edge cases (empty tables, nested content)
18. Verify 80%+ code coverage

**Deliverables**:
- src/DOMTable.ts implementation
- tests/DOMTable.test.ts with 80%+ coverage
- Updated index.ts exports
- Passing tests in CI

### Phase 3: Implementation - DOMMedia Class (Priority P2)

**Objective**: Implement media element generation

**Tasks**:
1. Create src/DOMMedia.ts extending DOM base class
2. Use self-closing tag constructor parameter (true)
3. Implement createImage() method for img element
4. Support src, alt, width, height, loading attributes
5. Add JSDoc documentation with @uiName tags
6. Add usage examples to JSDoc comments
7. Export DOMMedia from index.ts
8. Create tests/DOMMedia.test.ts with comprehensive test coverage
9. Test image generation with various attributes
10. Test styling and custom attributes
11. Test accessibility (alt text)
12. Test edge cases (missing src, invalid dimensions)
13. Verify 80%+ code coverage

**Deliverables**:
- src/DOMMedia.ts implementation
- tests/DOMMedia.test.ts with 80%+ coverage
- Updated index.ts exports
- Passing tests in CI

### Phase 4: Implementation - DOMSemantic Class (Priority P3)

**Objective**: Implement semantic HTML5 element generation

**Tasks**:
1. Create src/DOMSemantic.ts extending DOM base class
2. Implement createArticle() method for article element
3. Implement createSection() method for section element
4. Implement createNav() method for nav element
5. Implement createHeader() method for header element
6. Implement createFooter() method for footer element
7. Implement createAside() method for aside element
8. Implement createMain() method for main element
9. Add JSDoc documentation with @uiName tags
10. Add usage examples to JSDoc comments
11. Export DOMSemantic from index.ts
12. Create tests/DOMSemantic.test.ts with comprehensive test coverage
13. Test semantic element generation with children
14. Test styling and custom attributes
15. Test nested semantic elements
16. Verify 80%+ code coverage

**Deliverables**:
- src/DOMSemantic.ts implementation
- tests/DOMSemantic.test.ts with 80%+ coverage
- Updated index.ts exports
- Passing tests in CI

### Phase 5: Enhancement - DOMNested Class (Priority P3)

**Objective**: Add ordered and definition list support

**Tasks**:
1. Open src/DOMNested.ts for enhancement
2. Implement createOrderedList() method for ol element
3. Implement createDefinitionList() method for dl element
4. Implement createDefinitionTerm() method for dt element
5. Implement createDefinitionDescription() method for dd element
6. Follow existing pattern from createList() and createListItem()
7. Add JSDoc documentation with @uiName tags
8. Add usage examples to JSDoc comments
9. Update tests/DOMNested.test.ts with new test cases
10. Test ordered list generation
11. Test definition list generation with term/description pairs
12. Test styling and custom attributes
13. Verify backward compatibility with existing methods
14. Verify 80%+ code coverage maintained

**Deliverables**:
- Enhanced src/DOMNested.ts
- Updated tests/DOMNested.test.ts with 80%+ coverage
- Backward compatibility verified
- Passing tests in CI

### Phase 6: Enhancement - DOMInput Class (Priority P2)

**Objective**: Add select dropdown support

**Tasks**:
1. Open src/DOMInput.ts for enhancement
2. Implement createSelect() method for select element
3. Implement createOption() method for option element
4. Implement createOptgroup() method for optgroup element
5. Support value, label, selected attributes for options
6. Support onChange event handler for select
7. Add JSDoc documentation with @uiName tags
8. Add usage examples to JSDoc comments
9. Update tests/DOMInput.test.ts with new test cases
10. Test select generation with options
11. Test optgroup functionality
12. Test event handler attachment
13. Test styling and custom attributes
14. Verify backward compatibility with existing methods
15. Verify 80%+ code coverage maintained

**Deliverables**:
- Enhanced src/DOMInput.ts
- Updated tests/DOMInput.test.ts with 80%+ coverage
- Backward compatibility verified
- Passing tests in CI

### Phase 7: Integration Testing and Examples

**Objective**: Create comprehensive integration tests and example plugins

**Tasks**:
1. Create tests/integration/dom-elements.test.ts
2. Write integration test for table creation in plugin context
3. Write integration test for media elements in plugin context
4. Write integration test for semantic elements in plugin context
5. Write integration test for enhanced list types
6. Write integration test for select dropdowns
7. Create examples/dom_elements_plugin.ts
8. Demonstrate table usage in example plugin
9. Demonstrate media usage in example plugin
10. Demonstrate semantic elements in example plugin
11. Demonstrate all list types in example plugin
12. Demonstrate select dropdowns in example plugin
13. Test example plugin renders correctly
14. Verify all integration tests pass

**Deliverables**:
- tests/integration/dom-elements.test.ts
- examples/dom_elements_plugin.ts
- All integration tests passing
- Example plugin verified working

### Phase 8: Documentation and Type Definitions

**Objective**: Ensure complete documentation and type safety

**Tasks**:
1. Run tsc --emitDeclarationOnly to generate .d.ts files
2. Verify all new classes appear in type definitions
3. Verify all method signatures are correct in .d.ts
4. Review all JSDoc comments for completeness
5. Verify @uiName tags are present on all public methods
6. Verify usage examples are clear and correct
7. Update README.md if needed with new capabilities
8. Update CHANGELOG.md with new features
9. Check that all exports are properly documented
10. Verify TypeScript strict mode compliance

**Deliverables**:
- Complete .d.ts type definitions
- Updated documentation
- README.md updates (if needed)
- CHANGELOG.md entry

### Phase 9: Build and CI Validation

**Objective**: Ensure build process and CI pipeline work correctly

**Tasks**:
1. Run npm run build to generate webpack bundle
2. Verify bundle size increase is acceptable (< 50KB)
3. Run npm run build:types to generate type definitions
4. Run npm test to execute all tests
5. Verify all tests pass locally
6. Verify code coverage meets 80% threshold
7. Commit all changes to feature branch
8. Push to remote repository
9. Create pull request
10. Wait for CI checks to complete
11. Review CI test results
12. Review CI build results
13. Fix any CI failures
14. Verify automatic version bump occurs

**Deliverables**:
- Successful local build
- All tests passing locally
- Feature branch pushed to remote
- Pull request created
- CI checks passing

### Phase 10: Review and Merge

**Objective**: Complete code review and merge to main

**Tasks**:
1. Request code review from maintainers
2. Address any review comments
3. Make requested changes
4. Re-run tests after changes
5. Update documentation if needed based on feedback
6. Get approval from maintainers
7. Merge pull request to main branch
8. Verify npm publish workflow runs
9. Verify package is published to npm
10. Verify provenance information is included
11. Test installed package in a real plugin project
12. Verify all new functionality works in production

**Deliverables**:
- Approved pull request
- Merged to main branch
- Published to npm
- Production verification complete

## Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes to existing API | High | Comprehensive backward compatibility testing, no modifications to existing method signatures |
| Bundle size increase too large | Medium | Monitor bundle size during build, optimize if needed, consider code splitting |
| Performance regression | Medium | Benchmark DOM generation performance, optimize if needed |
| TypeScript compilation errors | Medium | Use strict mode from start, fix type errors incrementally |
| Test coverage below 80% | Medium | Write tests alongside implementation, use coverage reports to identify gaps |
| goober CSS integration issues | Low | Follow existing patterns closely, test CSS generation thoroughly |

### Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| CI pipeline failures | Medium | Test locally before pushing, fix CI issues promptly |
| Merge conflicts | Low | Rebase frequently, coordinate with other contributors |
| Documentation gaps | Low | Write JSDoc comments during implementation, review before PR |
| Example plugin doesn't work | Medium | Test example plugin thoroughly, verify in real FDO application |

## Success Metrics

- All 5 user stories implemented and tested
- 80%+ code coverage achieved
- All CI checks passing
- Bundle size increase < 50KB
- Zero breaking changes to existing API
- TypeScript strict mode compliance
- All JSDoc documentation complete
- Example plugin working in FDO application
- npm package published successfully

## Complexity Tracking

> No constitution violations - this section is not applicable.

This feature adheres to all constitution principles and does not require any complexity justifications.
