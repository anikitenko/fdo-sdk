# Examples And Fixtures

This guide defines the public, stable example surface for `@anikitenko/fdo-sdk`.

If you are starting a new plugin, prefer the fixture set under `examples/fixtures/` before the numbered learning examples.

## Recommended Starting Order

1. `examples/fixtures/minimal-plugin.fixture.ts`
   Use when you need the smallest valid plugin scaffold.
2. `examples/fixtures/error-handling-plugin.fixture.ts`
   Use when you need deterministic render fallback behavior.
3. `examples/fixtures/storage-plugin.fixture.ts`
   Use when you need plugin-scoped storage with graceful JSON-store handling.
4. `examples/fixtures/advanced-ui-plugin.fixture.ts`
   Use when you need richer UI composition with DOM helpers.
5. `examples/fixtures/operator-kubernetes-plugin.fixture.ts`
   Use when building a `kubectl`-style operator plugin.
6. `examples/fixtures/operator-terraform-plugin.fixture.ts`
   Use when building a Terraform preview/apply plugin.
7. `examples/fixtures/operator-custom-tool-plugin.fixture.ts`
   Use when you need a host-specific scoped tool that is not covered by a curated operator preset.

The numbered examples under `examples/01-...` to `examples/09-...` are learning references. They are not the default production starting point.

## Production-Grade Rules

Use these rules for examples, fixtures, and AI-generated plugin scaffolds:

- Keep backend orchestration in plugin methods and registered handlers.
- Keep `renderOnLoad()` thin and UI-focused.
- For UI-to-backend calls, use the real bridge contract:

```ts
const result = await window.createBackendReq("UI_MESSAGE", {
  handler: "plugin.handlerName",
  content: {},
});
```

- For known operator tool families, prefer:
  - `createOperatorToolCapabilityPreset(...)`
  - `requestOperatorTool(...)`
- For multi-step operator flows, prefer:
  - `requestScopedWorkflow(...)`
- For host-specific or non-curated tools, prefer:
  - `requestScopedProcessExec(...)`
- For privileged or operator plugins, declare expected capabilities in code via `declareCapabilities()`.

## Validation Expectations

The examples surface is considered stable only when all of the following stay true:

- `npm run test:examples` passes
- public example docs do not reference local-only or internal planning files
- public example docs do not reference stale docs domains
- `createBackendReq(...)` examples reflect the real `UI_MESSAGE` handler pattern
- the canonical fixtures remain the primary recommended starting point

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
- [RENDER_RUNTIME_CONTRACT.md](./RENDER_RUNTIME_CONTRACT.md)
- [INJECTED_LIBRARIES.md](./INJECTED_LIBRARIES.md)
- [API_STABILITY.md](./API_STABILITY.md)
