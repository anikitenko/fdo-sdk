# Examples And Fixtures

This guide defines the public, stable example surface for `@anikitenko/fdo-sdk`.

If you are starting a new plugin, prefer the fixture set under `examples/fixtures/` before the numbered learning examples.

## Recommended Starting Order

1. `examples/fixtures/minimal-plugin.fixture.ts`
   Use when you need the smallest valid plugin scaffold.
   It is intentionally plain: metadata, `init()`, and `render()` only, with no extra bridge or UI-helper concepts mixed in.
2. `examples/fixtures/error-handling-plugin.fixture.ts`
   Use when you need deterministic render fallback behavior.
   It demonstrates `@handleError`, real `UI_MESSAGE` handler invocation, and runtime-safe fallback UI without extra UI abstraction.
3. `examples/fixtures/storage-plugin.fixture.ts`
   Use when you need plugin-scoped storage with graceful JSON-store handling.
   It demonstrates backend storage handlers, session fallback when JSON storage is unavailable, and UI_MESSAGE-driven storage actions instead of a static snapshot only.
4. `examples/fixtures/operator-kubernetes-plugin.fixture.ts`
   Use when building a `kubectl`-style operator plugin.
   It demonstrates the current curated operator pattern: declare preset capabilities, build validated operator/workflow envelopes in backend code, fetch them through `UI_MESSAGE`, and send them through the host privileged-action path.
5. `examples/fixtures/operator-terraform-plugin.fixture.ts`
   Use when building a Terraform preview/apply plugin.
   It demonstrates the same curated operator pattern for Terraform: declare preset capabilities, build validated plan/workflow envelopes in backend code, fetch them through `UI_MESSAGE`, and send them through the host privileged-action path.
6. `examples/fixtures/operator-custom-tool-plugin.fixture.ts`
   Use when you need a host-specific scoped tool that is not covered by a curated operator preset.
   It demonstrates the generic scoped-process pattern: declare the broad execution capability plus a narrow custom process scope, build a validated scoped-process envelope in backend code, fetch it through `UI_MESSAGE`, and send it through the host privileged-action path.

The numbered examples under `examples/01-...` to `examples/10-...` are learning references. They are not the default production starting point.

## Production-Grade Rules

Use these rules for examples, fixtures, and AI-generated plugin scaffolds:

- Keep backend orchestration in plugin methods and registered handlers.
- Keep `renderOnLoad()` thin and UI-focused.
- Do not call `PluginRegistry.useStore(...)` in class-field initializers; acquire stores lazily or in `init()` after metadata is available.
- If `render()` uses styled SDK DOM-helper output, wrap the final helper markup with `renderHTML(...)`.
- Treat `renderHTML(...)` as mandatory for styled DOM-helper output because it emits the extracted goober CSS alongside the markup.
- Treat DOM helpers as the preferred SDK pattern for general structured UI.
- Use plain markup intentionally only when the example is isolating a different lesson, such as injected libraries or the iframe/backend boundary.
- The numbered learning examples are an intentional progression:
  - `01` plain markup for the minimal lifecycle contract
  - `02` plain markup for handlers, `renderOnLoad()`, and `UI_MESSAGE`
  - `03` plain markup for storage and backend/UI separation
  - `04` plain markup for quick actions and side-panel routing
  - `05` DOM helpers directly, including the `renderHTML(...)` rule
  - `06` plain markup for error handling and runtime-safe fallback behavior
  - `07` plain markup for injected iframe libraries and browser-only helpers
  - `08` plain markup for low-level privileged-action transport and response handling
  - `09` plain markup for the curated operator-helper path, declared preset capabilities, and host-mediated execution
  - `10` plain markup for generic scoped filesystem mutation when a plugin needs to edit a system file other than `/etc/hosts`
- Even plain markup examples must remain JSX-compatible for the FDO host transform.
- Escape JSX-sensitive code samples and prefer JSX-safe tags such as `<br />`.
- Prefer descriptive text over raw guard-sensitive capability/runtime tokens in `render()` when the literal token is not required for the lesson.
- Example: in `09`, describe the broad capability plus narrow scope instead of embedding raw `system.process.*` strings in the rendered UI, because host fail-fast guards may conservatively flag those tokens.
- Do not embed raw JSON snapshots directly in `render()`; use a safe placeholder and load the structured data after iframe initialization.
- For UI-to-backend calls, use the real bridge contract:

```ts
const result = await window.createBackendReq("UI_MESSAGE", {
  handler: "plugin.handlerName",
  content: {},
});
```

- If a backend handler returns a privileged-action envelope from `createPrivilegedActionBackendRequest(...)`, extract the validated request object before calling the raw `requestPrivilegedAction` bridge. Prefer `extractPrivilegedActionRequest(envelopeOrRequest)`. If you need fallback compatibility, use `envelope?.result?.request ?? envelope?.request ?? envelope` and keep `envelope?.result?.correlationId ?? envelope?.correlationId` only for diagnostics/fallback display.
- For non-`ok` privileged responses, format errors with `formatPrivilegedActionError(...)` so users get correlation IDs and host process diagnostics (`stderr`, `stdout`, `exitCode`, command, `cwd`) when available.
- In `renderOnLoad()` string runtimes, use `getInlinePrivilegedActionErrorFormatterSource()` to inline the same formatter function.

- For known operator tool families, prefer:
  - `createOperatorToolCapabilityPreset(...)`
  - `requestOperatorTool(...)`
- For multi-step operator flows, prefer:
  - `requestScopedWorkflow(...)`
- For host-specific or non-curated tools, prefer:
  - `requestScopedProcessExec(...)`
- For privileged or operator plugins, declare expected capabilities in code via `declareCapabilities()`.
- AI provider globals should follow one canonical host naming scheme:
  - assistants list: `globalThis.__FDO_AI_LIST_ASSISTANTS`
  - AI request: `globalThis.__FDO_AI_REQUEST`

## Validation Expectations

The examples surface is considered stable only when all of the following stay true:

- `npm run test:examples` passes
- public example docs do not reference local-only or internal planning files
- public example docs do not reference stale docs domains
- `createBackendReq(...)` examples reflect the real `UI_MESSAGE` handler pattern
- DOM-helper examples that rely on helper-generated styles call `renderHTML(...)`
- the canonical fixtures remain the primary recommended starting point

## Fixture Runtime Matrix Contract

Use the SDK fixture runtime matrix helpers as the source of truth for host CI smoke coverage:

- `getFixtureRuntimeMatrix()`
- `listFixtureRuntimeMatrixCases()`
- `getFixtureRuntimeMatrixCase(id)`

The contract is versioned and lists:

- canonical fixture path
- required lifecycle probes (`init`, `render`, `renderOnLoad`)
- canonical `UI_MESSAGE` handler probes
- required capabilities when relevant (for example storage/operator fixtures)

Host CI should consume this matrix instead of hardcoding fixture handler IDs or capability expectations.

## Canonical Operator Patterns

For operator plugins, the recommended order is:

1. start from the closest fixture
2. use curated capability presets for known tool families
3. use `requestOperatorTool(...)` for single-action known-tool execution
4. use `requestScopedWorkflow(...)` for preview/apply or inspect/act flows
5. use `requestScopedProcessExec(...)` for host-specific internal tools
6. use lower-level transport helpers only when transport-level control is explicitly required

For more detail, see [OPERATOR_PLUGIN_PATTERNS.md](./OPERATOR_PLUGIN_PATTERNS.md).

## Public Documentation Links

These are the public guides that should stay stable for generated docs sites:

- [SAFE_PLUGIN_AUTHORING.md](./SAFE_PLUGIN_AUTHORING.md)
- [OPERATOR_PLUGIN_PATTERNS.md](./OPERATOR_PLUGIN_PATTERNS.md)
- [PLUGIN_DEVELOPMENT_GAP_REGISTER.md](../docs-local/PLUGIN_DEVELOPMENT_GAP_REGISTER.md)
- [RENDER_RUNTIME_CONTRACT.md](./RENDER_RUNTIME_CONTRACT.md)
- [INJECTED_LIBRARIES.md](./INJECTED_LIBRARIES.md)
- [API_STABILITY.md](./API_STABILITY.md)
