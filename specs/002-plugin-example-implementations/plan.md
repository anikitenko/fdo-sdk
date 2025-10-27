# Implementation Plan: Add Plugin Example Implementations

**Branch**: `002-plugin-example-implementations` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-plugin-example-implementations/spec.md`

## Summary

This feature adds comprehensive, production-quality plugin examples to the FDO SDK to reduce the learning curve for plugin developers. The implementation will create four progressively complex example plugins (Hello World, Todo List, Note-Taking, Settings Panel) that demonstrate all core SDK features including FDO_SDK base class, DOM generation, IPC communication, data persistence, and UI extensions. Each example will include extensive inline documentation and follow the same quality standards as the SDK core.

## Technical Context

**Language/Version**: TypeScript 5.7.3 (matching SDK)  
**Primary Dependencies**: 
- `@anikitenko/fdo-sdk` (local) - Core SDK functionality
- `electron` ^35.0.0 - Desktop application framework
- `goober` ^2.1.16 - CSS-in-JS for styling
- `winston` ^3.17.0 - Logging

**Storage**: 
- In-memory storage (StoreDefault) for basic examples
- JSON file-based storage (StoreJson) for persistence examples

**Testing**: 
- Jest ^29.7.0 for unit tests
- TypeScript compiler for type checking
- Manual testing in FDO application environment

**Target Platform**: Electron desktop application (cross-platform: Windows, macOS, Linux)

**Project Type**: Single project (SDK library with examples)

**Performance Goals**: 
- Examples must load and initialize in <100ms
- Render operations must complete in <50ms
- Storage operations must complete in <200ms

**Constraints**: 
- Examples must compile without TypeScript errors
- Examples must pass same linting standards as SDK core
- Examples must be self-contained (no external dependencies beyond SDK)
- Examples must work in Electron worker thread environment
- Comment-to-code ratio must be at least 30%

**Scale/Scope**: 
- 4 example plugins
- 50-300 lines of code per example
- Comprehensive inline documentation
- Single README.md for examples directory
- Updates to main SDK README.md

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Based on the project's constitution (`.specify/memory/constitution.md`), the following principles apply:

1. **Code Quality**: Examples must follow the same TypeScript, linting, and testing standards as the SDK core
2. **Documentation**: Examples must be well-documented with clear explanations of SDK features
3. **User Experience**: Examples must provide a clear learning path from basic to advanced
4. **Maintainability**: Examples must be maintainable and updated alongside SDK changes

**Constitution Compliance**: ✅ All requirements align with project principles

## Project Structure

### Documentation (this feature)

```text
specs/002-plugin-example-implementations/
├── spec.md              # Feature specification (completed)
├── clarify.md           # Clarification questions (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Research existing patterns
├── data-model.md        # Phase 1: Example plugin data structures
├── quickstart.md        # Phase 1: Quick start guide for examples
├── contracts/           # Phase 1: API contracts for examples
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
examples/
├── README.md                           # Overview and learning path
├── 01-basic-hello-world.ts            # P1: Basic plugin example
├── 02-interactive-todo-list.ts        # P2: Interactive UI example
├── 03-persistent-notes.ts             # P3: Data persistence example
└── 04-advanced-settings-panel.ts      # P4: Advanced features example

src/
├── index.ts                            # SDK exports (existing)
├── PluginRegistry.ts                   # Plugin management (existing)
├── Communicator.ts                     # IPC communication (existing)
├── DOM*.ts                             # DOM generation classes (existing)
└── types.ts                            # Type definitions (existing)

tests/
├── examples/                           # New: Example validation tests
│   ├── basic-hello-world.test.ts
│   ├── interactive-todo-list.test.ts
│   ├── persistent-notes.test.ts
│   └── advanced-settings-panel.test.ts
└── [existing test files]

README.md                               # Updated: Add examples section
package.json                            # Updated: Add example validation script
```

**Structure Decision**: Using flat structure in `examples/` directory with numbered, descriptive filenames. This provides clear progression while keeping examples easily discoverable. Tests for examples are placed in `tests/examples/` to maintain separation from SDK core tests.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. All implementation decisions align with project principles.

---

## Phase 0: Research

### Research Goals

1. **Analyze Existing Example**: Review `examples/example_plugin.ts` to understand current example structure and identify gaps
2. **Survey SDK Features**: Catalog all SDK features that should be demonstrated in examples
3. **Review DOM Classes**: Document all available DOM generation classes and their usage patterns
4. **Study Storage System**: Understand StoreDefault and StoreJson implementation details
5. **Examine Mixins**: Review QuickActionMixin and SidePanelMixin usage patterns
6. **Analyze IPC Patterns**: Document message handler registration and communication patterns

### Research Deliverables

Document findings in `research.md` covering:
- Current example analysis (strengths, weaknesses, gaps)
- Complete SDK feature inventory
- DOM class usage patterns and best practices
- Storage system implementation details
- Mixin usage patterns
- IPC communication patterns
- Recommendations for example structure and content

---

## Phase 1: Design

### Design Goals

1. **Define Example Data Models**: Specify data structures for each example (Todo items, Notes, Settings)
2. **Design Example APIs**: Define the public interface for each example plugin
3. **Create Example Contracts**: Specify expected inputs, outputs, and behaviors
4. **Design UI Layouts**: Plan the UI structure for each example using DOM classes
5. **Define Message Handlers**: Specify custom message handlers for interactive examples
6. **Plan Storage Schema**: Define storage keys and data formats for persistence examples

### Design Deliverables

1. **data-model.md**: Complete data structure definitions for all examples
2. **contracts/**: API contracts for each example plugin
   - `01-basic-hello-world-contract.md`
   - `02-interactive-todo-list-contract.md`
   - `03-persistent-notes-contract.md`
   - `04-advanced-settings-panel-contract.md`
3. **quickstart.md**: Quick start guide for using the examples

---

## Phase 2: Implementation Planning

### Implementation Approach

**Incremental Development**: Implement examples in priority order (P1 → P4) to ensure each example builds on previous concepts.

**Quality Gates**: Each example must pass:
1. TypeScript compilation without errors
2. Linting checks (matching SDK standards)
3. Unit tests (instantiation, basic functionality)
4. Manual testing in FDO application
5. Documentation review (30%+ comment ratio)

### Example 1: Basic Hello World (P1)

**Purpose**: Demonstrate minimal viable plugin with core SDK features

**Features Demonstrated**:
- Extending FDO_SDK base class
- Implementing FDOInterface
- Defining plugin metadata
- Implementing init() method
- Implementing render() method
- Using Logger for logging
- Basic DOM generation with DOMText

**Implementation Steps**:
1. Create plugin class structure
2. Define metadata (name, version, author, description, icon)
3. Implement init() with logging
4. Implement render() with simple HTML output
5. Add comprehensive inline comments
6. Create unit test
7. Test in FDO application

**Success Criteria**:
- Plugin loads and initializes without errors
- Displays greeting message with plugin metadata
- Logs initialization message
- Code has 30%+ comment ratio
- Passes all quality gates

---

### Example 2: Interactive Todo List (P2)

**Purpose**: Demonstrate interactive UI with DOM classes and message handlers

**Features Demonstrated**:
- Using DOMNested for container elements
- Using DOMInput for text input
- Using DOMButton for interactive buttons
- Using DOMText for displaying content
- Registering custom message handlers
- Handling user interactions via IPC
- Managing component state
- CSS-in-JS styling with goober

**Implementation Steps**:
1. Create plugin class structure
2. Define metadata
3. Implement init() with handler registration
4. Create message handlers for add/remove/toggle todo
5. Implement render() with form and todo list UI
6. Add CSS styling for clean appearance
7. Add comprehensive inline comments
8. Create unit tests
9. Test interactions in FDO application

**Success Criteria**:
- Users can add, remove, and toggle todos
- UI updates correctly on interactions
- Handlers process messages correctly
- Styling is clean and functional
- Code has 30%+ comment ratio
- Passes all quality gates

---

### Example 3: Persistent Notes (P3)

**Purpose**: Demonstrate data persistence with storage system

**Features Demonstrated**:
- Using PluginRegistry.useStore()
- Working with StoreDefault (in-memory)
- Registering and using StoreJson (file-based)
- Saving data on user actions
- Loading data on initialization
- Handling storage errors gracefully
- Using DOMTextarea for multi-line input
- Combining persistence with interactive UI

**Implementation Steps**:
1. Create plugin class structure
2. Define metadata
3. Register StoreJson in init()
4. Implement data loading from storage
5. Implement message handlers for save/load/delete
6. Implement render() with note editor UI
7. Add error handling for storage operations
8. Add comprehensive inline comments
9. Create unit tests including storage mocks
10. Test persistence across application restarts

**Success Criteria**:
- Notes persist across application restarts
- Storage operations complete successfully
- Errors are handled gracefully with user feedback
- UI shows loading states appropriately
- Code has 30%+ comment ratio
- Passes all quality gates

---

### Example 4: Advanced Settings Panel (P4)

**Purpose**: Demonstrate advanced features including mixins and complex UI

**Features Demonstrated**:
- Using QuickActionMixin
- Using SidePanelMixin
- Defining quick actions
- Defining side panel configuration
- Complex UI with multiple sections
- Combining all previous concepts
- Advanced CSS styling
- Form validation

**Implementation Steps**:
1. Create plugin class with mixins
2. Define metadata
3. Implement defineQuickActions()
4. Implement defineSidePanel()
5. Implement init() with all handlers
6. Create message handlers for settings operations
7. Implement render() with tabbed settings UI
8. Add form validation logic
9. Add advanced CSS styling
10. Add comprehensive inline comments
11. Create unit tests
12. Test quick actions and side panel in FDO application

**Success Criteria**:
- Quick actions appear in FDO application
- Side panel is properly configured
- Settings UI is functional and well-styled
- All SDK features are demonstrated
- Code has 30%+ comment ratio
- Passes all quality gates

---

## Phase 3: Documentation

### Documentation Components

1. **examples/README.md**: 
   - Overview of all examples
   - Learning path (which order to study)
   - How to run examples
   - What each example demonstrates
   - Links to relevant SDK documentation

2. **Inline Comments** (in each example):
   - File header with purpose and features
   - Section comments explaining major blocks
   - Line comments for complex operations
   - "Why" explanations, not just "what"
   - References to SDK documentation

3. **Main README.md Update**:
   - Add "Examples" section
   - Link to examples/README.md
   - Brief description of available examples
   - Encourage developers to start with examples

4. **API Documentation Updates** (if applicable):
   - Ensure all demonstrated features are documented
   - Add example code snippets to API docs
   - Cross-reference examples from feature docs

### Documentation Quality Gates

- All examples have header comments explaining purpose
- Inline comments achieve 30%+ ratio
- examples/README.md provides clear learning path
- Main README.md references examples
- No broken links in documentation
- Documentation is technically accurate

---

## Phase 4: Testing & Validation

### Testing Strategy

**Unit Tests** (`tests/examples/`):
- Test plugin instantiation
- Test metadata correctness
- Test init() execution
- Test render() output structure
- Test message handler registration
- Mock storage operations for persistence tests

**Integration Tests**:
- Validate examples compile without errors
- Validate examples pass linting
- Validate comment-to-code ratio
- Validate no external dependencies

**Manual Testing**:
- Load each example in FDO application
- Test all interactive features
- Verify persistence across restarts
- Verify quick actions and side panel
- Check visual appearance and styling
- Verify error handling

### Validation Checklist

For each example:
- [ ] Compiles without TypeScript errors
- [ ] Passes linting checks
- [ ] Unit tests pass
- [ ] Loads in FDO application
- [ ] All features work as expected
- [ ] Comments achieve 30%+ ratio
- [ ] Documentation is complete
- [ ] Follows SDK code standards
- [ ] No external dependencies
- [ ] Error handling is robust

---

## Phase 5: Integration & Deployment

### Integration Steps

1. **Update Build Configuration**:
   - Ensure examples are included in build process
   - Add example validation to CI/CD pipeline
   - Update package.json scripts if needed

2. **Update Documentation**:
   - Merge all documentation updates
   - Ensure cross-references are correct
   - Update CHANGELOG.md

3. **Code Review**:
   - Review all example code
   - Review all documentation
   - Verify quality gates passed
   - Check for consistency across examples

4. **Final Testing**:
   - Run full test suite
   - Manual test all examples
   - Verify examples work with latest SDK build
   - Test on multiple platforms if possible

### Deployment Checklist

- [ ] All examples implemented and tested
- [ ] All documentation complete
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Code review approved
- [ ] CI/CD pipeline passes
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] examples/README.md complete
- [ ] No breaking changes to SDK
- [ ] Version bump if needed

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Examples become outdated as SDK evolves | High | Include examples in CI/CD pipeline; add automated validation |
| Examples don't work in actual FDO application | High | Manual testing in FDO environment; integration tests if possible |
| Examples are too complex for beginners | Medium | Start with very simple P1 example; progressive complexity |
| Examples don't demonstrate all SDK features | Medium | Create comprehensive feature inventory; review against spec |
| Storage examples fail due to file system permissions | Medium | Add error handling; document requirements; test on multiple platforms |

### Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep (too many examples) | Low | Stick to 4 examples as specified; resist adding more |
| Insufficient documentation | Medium | Enforce 30% comment ratio; review documentation thoroughly |
| Examples don't follow SDK standards | Medium | Use same linting/testing as SDK; code review |
| Manual testing is incomplete | Medium | Create detailed testing checklist; test all scenarios |

---

## Success Metrics

### Quantitative Metrics

- **SC-001**: Time-to-first-plugin < 15 minutes (measured by user testing)
- **SC-002**: 100% of examples run without errors
- **SC-003**: 100% of core SDK features demonstrated
- **SC-004**: Comment-to-code ratio ≥ 30% for all examples
- **SC-007**: 100% of examples pass linting and type checking

### Qualitative Metrics

- **SC-005**: Clear progression from basic to advanced (validated by code review)
- **SC-006**: Reduced support questions (measured post-release)

### Validation Methods

- Automated: CI/CD pipeline validates compilation, linting, tests
- Manual: Code review validates documentation quality and progression
- User testing: New developers attempt to create plugins using examples
- Post-release: Monitor support channels for example-related questions

---

## Timeline Estimate

**Phase 0 (Research)**: 2-4 hours
- Review existing code and documentation
- Catalog SDK features
- Document patterns

**Phase 1 (Design)**: 4-6 hours
- Define data models
- Create contracts
- Design UI layouts
- Write quickstart guide

**Phase 2 (Implementation)**: 12-16 hours
- Example 1 (Basic): 2-3 hours
- Example 2 (Interactive): 3-4 hours
- Example 3 (Persistence): 3-4 hours
- Example 4 (Advanced): 4-5 hours

**Phase 3 (Documentation)**: 3-4 hours
- examples/README.md
- Inline comments review
- Main README.md update

**Phase 4 (Testing)**: 4-6 hours
- Unit tests
- Integration tests
- Manual testing
- Bug fixes

**Phase 5 (Integration)**: 2-3 hours
- Final review
- CI/CD updates
- Documentation finalization

**Total Estimated Time**: 27-39 hours

---

## Dependencies

### Internal Dependencies

- FDO SDK core functionality (existing)
- DOM generation classes (existing)
- Storage system (existing)
- Plugin registry (existing)
- IPC communication system (existing)

### External Dependencies

- FDO desktop application (for manual testing)
- TypeScript compiler
- Jest testing framework
- Linting tools

### Blocking Issues

None identified. All required SDK features are already implemented.

---

## Next Steps

1. **Complete Phase 0 Research**: Create `research.md` with detailed analysis
2. **Complete Phase 1 Design**: Create data models, contracts, and quickstart guide
3. **Generate Tasks**: Run `/speckit.tasks` to create actionable task list
4. **Begin Implementation**: Start with Example 1 (Basic Hello World)

---

## Appendix

### Reference Documents

- Feature Specification: `specs/002-plugin-example-implementations/spec.md`
- Clarification Document: `specs/002-plugin-example-implementations/clarify.md`
- SDK Source Code: `src/`
- Existing Example: `examples/example_plugin.ts`
- SDK Documentation: `README.md`

### Key Decisions

1. **File Naming**: Numbered with descriptive names (e.g., `01-basic-hello-world.ts`)
2. **Use Cases**: Hello World, Todo List, Note-Taking, Settings Panel
3. **Documentation**: Both inline comments and README files
4. **Code Style**: Slightly more verbose than production for educational purposes
5. **Testing**: Automated build validation + manual testing
6. **Metadata**: Consistent standards with "FDO SDK Team" author

### Assumptions

- FDO desktop application is available for manual testing
- SDK features are stable and documented
- Examples will be maintained alongside SDK updates
- Developers have basic TypeScript knowledge
- Examples will be used primarily for learning, not production
