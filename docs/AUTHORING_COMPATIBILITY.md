# Authoring hardening: audit and compatibility report

Audit scope: all ten exported DOM classes, their constructors and 65 public declared methods (including the added collector), runtime implementations, generated declarations, legacy metadata, JSDoc examples, rendering/lifecycle tests, package exports and release scripts. Inherited methods are represented by the contract's `extends: "DOM"` relationship.

| Finding                                                                                                                                                                              | Fix and compatibility                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goober's shared sheet is drained by the next renderer; CSS can cross instances or disappear on cached rerender.                                                                      | Default behavior is preserved. Additive `collectStylesFrom` gives explicit isolated, retained sheets. A default-isolated renderer would break cross-helper callers and was not introduced.                             |
| Nested style declarations work at runtime but types allow only flat strings.                                                                                                         | Recursive exported `DOMStyleMap` supports strings, numbers, omissions, selectors and conditional rules. Existing `Record<string, string>` remains assignable.                                                          |
| Metadata uses descriptive JSDoc returns rather than authoritative TypeScript return types; examples include bare calls, invalid `const class`, ellipses and mismatched constructors. | Keep legacy shape; add compiler-derived `returnType`/`rest`, correct examples and ship a versioned authoring contract/schema. All examples are compiled against installed declarations.                                |
| Input/link documented default constructors fail type checks.                                                                                                                         | Add default empty IDs, preserving all existing arguments and generated-ID behavior.                                                                                                                                    |
| Textarea serializes as a self-closing HTML tag, potentially swallowing later markup in the browser.                                                                                  | Emit a paired textarea; add optional escaped text content. Existing valid browser behavior is corrected. **Exact string/snapshot consumers must update `<textarea ... />` to `<textarea ...></textarea>`.**            |
| Declarative actions have no ownership/cleanup or partial-failure rollback. Strict asynchronous failure throws inside a rejection callback.                                           | Extend the existing helper with stable keys, exact-listener cleanup, setup cleanup, pagehide teardown, rollback and deduplicated structured diagnostics. Async failures are reported without new unhandled rejections. |
| Plain authoring imports eagerly require Electron.                                                                                                                                    | Load Electron only when `runWithSudo` is invoked, after capability validation. No privilege/transport boundary changes.                                                                                                |
| Workspace TypeScript 7 exposes no legacy compiler API, breaking ts-loader and docs verification.                                                                                     | Use ts-morph's compiler API for Webpack transpilation/docs syntax checks. TypeScript's public CLI continues full declaration/consumer checks. No dependency downgrade.                                                 |
| Native ESM named imports do not match the declared public exports of the CommonJS bundle.                                                                                            | Add a generated ESM façade and conditional import entry over the same runtime exports; preserve CommonJS paths and verify export parity.                                                                               |
| The local example glob skips multi-file examples.                                                                                                                                    | Compile all packaged examples and correct two unvalidated handler input signatures; enable the established legacy decorators in the consumer fixture.                                                                  |
| Existing pack check only inspects the dry-run file list.                                                                                                                             | Retain it; add actual tarball installation, schema/signature/example verification and real-Chrome overlay checks. Missing Chrome is a failing release gate.                                                            |

No public HTML-string API was converted to a DOM-node API. No required argument was added. Metadata readers must tolerate additive fields; legacy descriptions/examples have been corrected. No replacement renderer or backend preview execution was added. Custom overlay examples intentionally cover a fixed two-button focus loop, not arbitrary focusable-content management.

## Migration notes

1. Keep existing rendering unchanged, or create a per-plugin/view collector and attach every contributing helper before registration to obtain isolation. Do not mix explicit owners or attach already-styled legacy helpers. Reuse a collector for cached markup; create a fresh one when discarding accumulated styles.
2. Give declarative on-load modules unique stable `lifecycleKey` values, scope selectors to the view root and return cleanup from setup. Dispose the key before replacing markup. Existing plain function/string on-load modules still need host-managed cleanup.
3. Replace legacy inline handlers with static markup plus frontend bindings when authoring browser-native behavior. Keep backend work in explicit host-validated `UI_MESSAGE` calls.
4. Update textarea string snapshots, use its optional `content` argument for text, and consume `returnType`/`returnKind` rather than interpreting JSDoc return descriptions.
5. AI/Live UI consumers should use authoring contract 1.0.0, published declarations and the schema. Reject unsupported majors and preserve source constructs that cannot be safely edited. Do not execute plugin backend code to obtain a preview.

## SDK guarantees and FDO host changes required

SDK guarantees: unchanged HTML-string transport, flat-style type compatibility, explicit style-sheet isolation/retention, owned action cleanup and rollback, self-contained frontend source generation, structured failure reports, published metadata/schema exports and verified package examples. Existing capability checks, IPC validation and backend transport remain in place.

FDO must:

- Supply the actual published declarations/JSON exports to AI and Monaco; negotiate the authoring-contract major separately from existing handshake contracts.
- Implement AST/source mapping and bidirectional edits, preserve unsupported source, and validate/sanitize allowlisted static composition without executing backend/on-load code. Treat preview safety as conditional, not permission to evaluate arbitrary source.
- Call frontend cleanup before replacing markup, provide unique lifecycle keys/root selectors for coexisting views, and forward diagnostics to the editor/plugin inspector. Dispose arbitrary user on-load scripts under its own lifecycle contract.
- Provide isolated plugin documents, appropriate iframe sandbox/CSP, browser feature support and host-level focus restoration; test overlays across iframe and Electron boundaries. The SDK cannot enforce these host responsibilities.

## Validation

The pre-change baseline passed 610 tests. Final verification on 2026-10-14:

- 622 tests passed across 57 files; coverage thresholds passed (91.26% lines, 83.37% branches, 97.25% functions).
- All repository examples, including multi-file examples, compiled. Documentation verification passed (four syntax-checked snippets, one runtime-checked snippet).
- Build and actual tarball install passed in a fresh temporary consumer. CommonJS imports, native ESM imports/export parity, JSON exports/schema and declaration signatures passed.
- All ten DOM constructors and 65 public declared methods were checked against shipped declarations/runtime exports; all 62 generated examples compiled and executed as SDK-only composition fixtures.
- Chrome 155.0.8059.80 passed 29 overlay checks, including actual accessibility-tree names/roles, trusted mouse/keyboard input, native dialog cancel, focus, custom dialog/alertdialog Tab wraps, native popover, rerender and teardown.
- Pack file-list verification passed (99 files, 50 declaration files). `git diff --check` passed.

These results cover the SDK and its browser fixtures; FDO iframe/Electron/editor integration remains a host check. Run `npm test`, `npm run test:examples`, `npm run verify:docs` and `npm run verify:pack`. The last command builds and verifies the real tarball; set `FDO_CHROME_PATH` if Chrome is not in a standard location. `FDO_RELEASE_OFFLINE=1` uses the npm cache without bypassing any gate.

## SDK UI component extension

Additive Dialog, Confirmation Dialog and Popover functions are available from the root and browser-safe `/ui` entry. The original HTML-string APIs remain unchanged. Component contract 1.0.0 and its schema ship as JSON exports; generated docs and examples are in [UI components](UI_COMPONENTS.md). Browser composition uses an isolated Goober target adapter rather than replacing the readonly browser `window` or injecting styles into the host head. No capability grant or backend operation is implicit.

The extended suite passes 632 tests in 58 files; the Chrome gate passes 53 overlay/component checks. Native APIs are required, with explicit feature errors and documented host-approved fallbacks. FDO must supply frontend module loading, component/source mapping and visual-edit history, preview sanitation/state simulation, cleanup before rerender and document isolation.
