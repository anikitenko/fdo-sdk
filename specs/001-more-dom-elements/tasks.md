# Tasks: Add More DOM Elements

Feature: Add More DOM Elements
Branch: `001-more-dom-elements`
Feature dir: `/Users/onikiten/dev/fdo-sdk/specs/001-more-dom-elements`

## Phase 1 — Setup

- [ ] T001 Run prerequisite checker `.specify/scripts/bash/check-prerequisites.sh --json` and confirm FEATURE_DIR and AVAILABLE_DOCS at `/Users/onikiten/dev/fdo-sdk/.specify/scripts/bash/check-prerequisites.sh`
- [ ] T002 Run dependency install to ensure local environment ready (`npm ci`) referencing `/Users/onikiten/dev/fdo-sdk/package.json`

## Phase 2 — Foundational (blocking prerequisites)

- [ ] T003 [P] Create source file `src/DOMTable.ts` at `/Users/onikiten/dev/fdo-sdk/src/DOMTable.ts`
- [ ] T004 [P] Create source file `src/DOMMedia.ts` at `/Users/onikiten/dev/fdo-sdk/src/DOMMedia.ts`
- [ ] T005 [P] Create source file `src/DOMSemantic.ts` at `/Users/onikiten/dev/fdo-sdk/src/DOMSemantic.ts`
- [ ] T006 [P] Update `src/DOMNested.ts` to add ordered/definition list method signatures at `/Users/onikiten/dev/fdo-sdk/src/DOMNested.ts`
- [ ] T007 [P] Update `src/DOMInput.ts` to add select/option/optgroup method signatures at `/Users/onikiten/dev/fdo-sdk/src/DOMInput.ts`
- [ ] T008 Update `src/index.ts` to export new classes (`DOMTable`, `DOMMedia`, `DOMSemantic`) at `/Users/onikiten/dev/fdo-sdk/src/index.ts`
- [ ] T009 Update `src/types.ts` to declare new types/interfaces used by new DOM classes at `/Users/onikiten/dev/fdo-sdk/src/types.ts`
- [ ] T010 [P] Create test skeleton `tests/DOMTable.test.ts` at `/Users/onikiten/dev/fdo-sdk/tests/DOMTable.test.ts`
- [ ] T011 [P] Create test skeleton `tests/DOMMedia.test.ts` at `/Users/onikiten/dev/fdo-sdk/tests/DOMMedia.test.ts`
- [ ] T012 [P] Create test skeleton `tests/DOMSemantic.test.ts` at `/Users/onikiten/dev/fdo-sdk/tests/DOMSemantic.test.ts`
- [ ] T013 [P] Update `tests/DOMNested.test.ts` to add tests for ol/dl/dt/dd at `/Users/onikiten/dev/fdo-sdk/tests/DOMNested.test.ts`
- [ ] T014 [P] Update `tests/DOMInput.test.ts` to add tests for select/option/optgroup at `/Users/onikiten/dev/fdo-sdk/tests/DOMInput.test.ts`
- [ ] T015 Create example plugin file `examples/dom_elements_plugin.ts` at `/Users/onikiten/dev/fdo-sdk/examples/dom_elements_plugin.ts`

## Phase 3 — User Story 1 (US1) — Create Data Tables in Plugin UI (Priority: P1)

Goal: Provide a `DOMTable` class that generates valid HTML table markup (table, thead, tbody, tfoot, tr, th, td, caption) and supports styling, attributes and events.
Independent test criteria: A plugin using only `src/DOMTable.ts` and `tests/DOMTable.test.ts` must be able to render a table with headers and rows and pass unit tests that assert thead/tbody/th/td structure.

- [ ] T016 [US1] Implement `createTable()`, `createTableHead()`, `createTableBody()`, `createTableFoot()` methods in `/Users/onikiten/dev/fdo-sdk/src/DOMTable.ts`
- [ ] T017 [US1] Implement row/cell helpers `createTableRow()`, `createTableHeader()`, `createTableCell()` and `createCaption()` in `/Users/onikiten/dev/fdo-sdk/src/DOMTable.ts`
- [ ] T018 [US1] Add JSDoc (with @uiName) and usage examples to `/Users/onikiten/dev/fdo-sdk/src/DOMTable.ts`
- [ ] T019 [US1] Implement unit tests exercising headers, rows, styling and events in `/Users/onikiten/dev/fdo-sdk/tests/DOMTable.test.ts`
- [ ] T020 [US1] Add a minimal integration example using `DOMTable` in `/Users/onikiten/dev/fdo-sdk/examples/dom_elements_plugin.ts` and verify rendering via `/Users/onikiten/dev/fdo-sdk/package.json` test entry

## Phase 4 — User Story 2 (US2) — Display Images and Media (Priority: P2)

Goal: Provide `DOMMedia.createImage()` supporting src, alt, width, height, loading and styling. Independent test criteria: A unit test that asserts img element attributes and alt text correctness.

- [ ] T021 [P] [US2] Implement `createImage()` in `/Users/onikiten/dev/fdo-sdk/src/DOMMedia.ts`
- [ ] T022 [US2] Add JSDoc (with @uiName) and usage examples to `/Users/onikiten/dev/fdo-sdk/src/DOMMedia.ts`
- [ ] T023 [US2] Implement unit tests verifying src/alt/width/height/loading in `/Users/onikiten/dev/fdo-sdk/tests/DOMMedia.test.ts`
- [ ] T024 [US2] Add image usage example to `/Users/onikiten/dev/fdo-sdk/examples/dom_elements_plugin.ts`
- [ ] T025 [US2] Verify tests for DOMMedia pass via `/Users/onikiten/dev/fdo-sdk/package.json` test runner

## Phase 5 — User Story 3 (US3) — Semantic Page Sections (Priority: P3)

Goal: Provide semantic element helpers (article, section, nav, header, footer, aside, main) in `DOMSemantic`. Independent test criteria: Unit tests assert that semantic tags are produced instead of generic divs.

- [ ] T026 [P] [US3] Implement semantic element methods in `/Users/onikiten/dev/fdo-sdk/src/DOMSemantic.ts`
- [ ] T027 [US3] Add JSDoc (with @uiName) and examples in `/Users/onikiten/dev/fdo-sdk/src/DOMSemantic.ts`
- [ ] T028 [US3] Implement unit tests in `/Users/onikiten/dev/fdo-sdk/tests/DOMSemantic.test.ts` asserting semantic tag output
- [ ] T029 [US3] Add semantic element usage examples to `/Users/onikiten/dev/fdo-sdk/examples/dom_elements_plugin.ts`

## Phase 6 — User Story 4 (US4) — Ordered and Definition Lists (Priority: P3)

Goal: Extend `DOMNested` to support `ol`, `dl`, `dt`, `dd`. Independent test criteria: Unit tests assert proper ol and dl structures are produced and maintain existing unordered-list behavior.

- [ ] T030 [P] [US4] Implement `createOrderedList()`, `createDefinitionList()`, `createDefinitionTerm()`, `createDefinitionDescription()` in `/Users/onikiten/dev/fdo-sdk/src/DOMNested.ts`
- [ ] T031 [US4] Add/modify unit tests in `/Users/onikiten/dev/fdo-sdk/tests/DOMNested.test.ts` to cover new list types
- [ ] T032 [US4] Add ordered/definition list examples to `/Users/onikiten/dev/fdo-sdk/examples/dom_elements_plugin.ts`

## Phase 7 — User Story 5 (US5) — Interactive Select Dropdowns (Priority: P2)

Goal: Extend `DOMInput` to create `select`, `option`, and `optgroup` with value binding and event handlers. Independent test criteria: Unit tests that assert select/options render and onChange handlers are attached.

- [ ] T033 [P] [US5] Implement `createSelect()`, `createOption()`, `createOptgroup()` in `/Users/onikiten/dev/fdo-sdk/src/DOMInput.ts`
- [ ] T034 [US5] Update `/Users/onikiten/dev/fdo-sdk/tests/DOMInput.test.ts` with select/option/optgroup tests
- [ ] T035 [US5] Add select dropdown examples to `/Users/onikiten/dev/fdo-sdk/examples/dom_elements_plugin.ts`

## Final Phase — Polish & Cross-cutting Concerns

- [ ] T036 Update `README.md` and `CHANGELOG.md` with feature summary at `/Users/onikiten/dev/fdo-sdk/README.md` and `/Users/onikiten/dev/fdo-sdk/CHANGELOG.md`
- [ ] T037 Run `tsc --emitDeclarationOnly` and verify declaration files generated at `/Users/onikiten/dev/fdo-sdk/dist` (or configured `outDir` in `/Users/onikiten/dev/fdo-sdk/tsconfig.json`)
- [ ] T038 Run full build and tests (`npm run build` and `npm test`) referencing `/Users/onikiten/dev/fdo-sdk/package.json`
- [ ] T039 Create a feature branch push and open a PR (local repo path: `/Users/onikiten/dev/fdo-sdk/.git`)
- [ ] T040 Perform final review, address feedback, and merge (PR metadata in `/Users/onikiten/dev/fdo-sdk/.github/`)

- [ ] T041 [P] Add goober integration implementation and tests: create `src/gooberIntegration.ts` and `tests/goober.integration.test.ts` to validate CSS class generation and SSR compatibility for new DOM classes
- [ ] T042 [P] Add renderHTML compatibility integration test: create `tests/renderHTML.integration.test.ts` that feeds generated HTML from `src/DOMTable.ts`, `src/DOMMedia.ts`, and `src/DOMSemantic.ts` into the project's `renderHTML()` pipeline and asserts expected output
- [ ] T043 [P] Add XSS/escaping unit tests: create `tests/xss-escape.test.ts` to assert that content passed to element creation methods is properly escaped and does not produce raw executable HTML

---

## Dependencies

Story completion order (dependency graph):
1. Phase 1 (T001-T002) -> Phase 2 (T003-T015)
2. Phase 2 -> US1 (T016-T020)  [MVP]
3. US1 -> US2 (T021-T025) and US5 (T033-T035) (these can be worked in parallel after exports/types exist)
4. US3 (T026-T029) and US4 (T030-T032) can proceed in parallel after Phase 2
5. Final Phase (T036-T040) after all stories

## Parallel execution examples

- Implementations that can be done in parallel (no direct file dependencies):
  - T003, T004, T005 (create new src files) are parallelizable [P]
  - T010, T011, T012 (create test skeletons) are parallelizable [P]
  - Per-story: within each story some tasks are parallelizable (docs generation vs creating example snippets). See [P] markers above.

## Implementation strategy

- MVP: Implement User Story 1 (DOMTable) first. Deliverable: `src/DOMTable.ts`, `tests/DOMTable.test.ts`, and example usage. This is the smallest increment that delivers immediate value.
- Incremental delivery: After US1, implement US2 and US5 (media and select) as they unlock common UI patterns. Then implement semantic elements and list enhancements.
- Testing: Write unit tests alongside each implementation task. Aim for a passing test for the implemented story before moving to the next.
- Backwards compatibility: Do not change public signatures of existing classes; add new methods only.

## Format validation

- Total tasks: 40
- Task count by user story:
  - US1 (Tables): 5 tasks (T016-T020)
  - US2 (Media): 5 tasks (T021-T025)
  - US3 (Semantic): 4 tasks (T026-T029)
  - US4 (Lists): 3 tasks (T030-T032)
  - US5 (Selects): 3 tasks (T033-T035)
  - Setup + Foundational: 15 tasks (T001-T015)
  - Polish: 5 tasks (T036-T040)

All tasks follow the checklist format: each line starts with `- [ ]`, has a TaskID (T001..T040), includes [P] when parallelizable, includes [USx] for story tasks, and contains a file path.

## Suggested MVP scope

- MVP: Only User Story 1 (DOMTable) implemented (T016-T020) plus foundational exports/types (T008-T009) and skeletons (T010). This gives immediate value and keeps scope small.

## Output

Generated tasks file: `/Users/onikiten/dev/fdo-sdk/specs/001-more-dom-elements/tasks.md`

Summary:
- Total tasks: 40
- Task counts per story: see section above
- Parallel opportunities: many [P] marked tasks; new files and test skeletons are highest parallelization opportunities
- Independent test criteria: included at start of each story phase
- MVP suggestion: User Story 1
- Format validation: All tasks conform to required checklist format


---

*Generated on 2025-10-27 by task generation workflow.*