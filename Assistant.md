# Assistant Guide

This file is a concise, assistant-facing guide for working with `@anikitenko/fdo-sdk`.
It is intended for Mintlify or other docs surfaces that need one high-signal overview instead of many separate internal documents.

## What This SDK Is

`@anikitenko/fdo-sdk` is an SDK for building FDO desktop application plugins.

The SDK spans two runtimes:

- Backend/plugin runtime
  - plugin class lifecycle
  - handler registration
  - storage
  - logging
  - host IPC
- Iframe UI runtime
  - UI returned by `render()`
  - browser DOM access
  - host-injected helpers and UI libraries
  - sandboxed iframe execution managed by FDO

The most important rule is: plugin backend logic and plugin UI logic do not run in the same environment.

## Core Mental Model

Treat `render()` output as UI source for the FDO iframe render pipeline, not as arbitrary raw HTML inserted directly into the host page.

That means:

- `render()` must synchronously return a string
- `renderOnLoad()` may synchronously return:
  - a string
  - a function
  - a `defineRenderOnLoad(...)` payload
- FDO serializes and transports these pieces separately
- UI code runs later inside a sandboxed iframe

If you are generating UI with SDK DOM helpers and expect helper-generated styles to work, you must wrap the final helper output with `renderHTML(...)`.

## Start Here

Recommended order for understanding and building plugins:

1. Read `README.md`
2. Read `docs/RENDER_RUNTIME_CONTRACT.md`
3. Read `docs/SAFE_PLUGIN_AUTHORING.md`
4. Read `docs/EXTENSION_POINTS.md`
5. Study `examples/fixtures/minimal-plugin.fixture.ts`
6. Then move to numbered examples in `examples/`

## Minimal Plugin Shape

Every plugin should provide:

- `metadata`
- `init()`
- `render()`

Typical shape:

```ts
import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

export default class MyPlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "My Plugin",
    version: "1.0.0",
    author: "Your Name",
    description: "Plugin description",
    icon: "cog",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  init(): void {
    this.info("plugin initialized");
  }

  render(): string {
    return `<div>Hello World</div>`;
  }
}
```

## Metadata Rules

Plugin metadata is part of the host contract.

Rules:

- define full metadata: `name`, `version`, `author`, `description`, `icon`
- prefer a stable `metadata.id` if your host/plugin flow supports it
- `metadata.icon` must be a valid BlueprintJS v6 icon name

## Backend Runtime Rules

Use backend runtime for:

- `init()`
- registering handlers
- stores
- logging
- diagnostics
- host-mediated privileged actions

Do not assume browser-only globals or injected UI libraries exist here.

Do not use iframe-specific APIs in backend/bootstrap paths.

## Iframe UI Runtime Rules

Use iframe runtime for:

- DOM access
- event binding
- `window.createBackendReq(...)`
- host-injected helpers
- UI libraries injected by FDO

Common helpers available in iframe runtime:

- `window.createBackendReq(...)`
- `window.waitForElement(...)`
- `window.executeInjectedScript(...)`
- `window.addGlobalEventListener(...)`
- `window.removeGlobalEventListener(...)`
- `window.applyClassToSelector(...)`

Common injected libraries:

- Notyf
- Highlight.js
- ACE
- Split Grid
- FontAwesome
- Pure CSS

Do not assume these libraries exist in backend runtime or failure/bootstrap paths.

## Safe Markup Rules

The iframe render pipeline is JSX-like and stricter than “whatever a browser would parse.”

Important rules:

- prefer JSX-safe void tags like `<br />`
- avoid inline `<style>` blocks in `render()`
- escape literal `{` and `}` in code samples
- avoid embedding raw JSON or object literals directly in JSX-visible markup
- avoid rendering guard-sensitive runtime tokens in display text when plain text works

For untrusted or user-provided text:

- use `DOMText` helpers
- do not pass untrusted strings as raw child markup into generic DOM helpers

## DOM Helper Rules

DOM helpers accept compatibility aliases such as:

- `className`
- `htmlFor`
- `readOnly`

But final output is normalized to native HTML attributes:

- `class`
- `for`
- `readonly`

When both are provided, native HTML form wins.

If helper-generated styling is expected, this is mandatory:

```ts
return semantic.renderHTML(content);
```

## Recommended `renderOnLoad()` Pattern

Prefer `defineRenderOnLoadActions(...)` for complex UI wiring.

Why:

- typed handler map
- declarative bindings
- better failure behavior
- easier editor/template integration

Recommended baseline:

```ts
renderOnLoad() {
  return defineRenderOnLoadActions({
    handlers: {
      runAction: async () => {
        await window.createBackendReq("UI_MESSAGE", {
          handler: "plugin.runAction",
          content: {},
        });
      },
    },
    bindings: [
      { selector: "#run", event: "click", handler: "runAction", required: true, preventDefault: true },
    ],
    strict: true,
    language: "typescript",
  });
}
```

## Handlers

Use `PluginRegistry.registerHandler(name, handler)` for UI-to-backend calls.

Good handler properties:

- stable names
- explicit payload expectations
- boundary validation when needed
- deterministic error handling

Avoid:

- hidden handler side effects
- ad hoc message shape drift
- relying on tests as the only source of contract truth

## Storage

Supported store patterns:

- `PluginRegistry.useStore("default")`
  - plugin-scoped in-memory store
- `PluginRegistry.useStore("json")`
  - plugin-scoped persistent store
  - requires configured storage root
  - requires capability grants

JSON store requirements:

- storage root configured via `PluginRegistry.configureStorage({ rootDir })` or `FDO_SDK_STORAGE_ROOT`
- host-granted capabilities:
  - `storage`
  - `storage.json`

Important safety rule:

- do not call `PluginRegistry.useStore(...)` in class field initializers
- acquire stores lazily or inside `init()`/handlers

Recommended lazy pattern:

```ts
private sessionStore?: StoreType;

private getSessionStore(): StoreType {
  if (!this.sessionStore) {
    this.sessionStore = PluginRegistry.useStore("default");
  }
  return this.sessionStore;
}
```

## Logging And Diagnostics

Preferred logging APIs on `FDO_SDK`:

- `this.log(...)`
- `this.info(...)`
- `this.warn(...)`
- `this.debug(...)`
- `this.verbose(...)`
- `this.silly(...)`
- `this.error(error)`
- `this.event(name, payload)`

Use structured logs and correlation IDs for handler and privileged-action flows.

## Capability Model

Privileged features are capability-gated by the host.
Plugins may declare intent, but host grants are authoritative.

Common capability families:

- `storage`
- `storage.json`
- `system.network`
- `system.network.https`
- `system.network.http`
- `system.network.websocket`
- `system.network.tcp`
- `system.network.udp`
- `system.network.dns`
- `system.network.scope.<scope-id>`
- `system.clipboard.read`
- `system.clipboard.write`
- `system.hosts.write`
- `system.fs.scope.<scope-id>`
- `system.process.exec`
- `system.process.scope.<scope-id>`
- `sudo.prompt`

Best practice:

- implement `declareCapabilities()`
- still use runtime capability checks for actual authorization

## Privileged Actions

Host-mediated privileged actions are the supported path for operations outside normal plugin boundaries.

Current action families:

- `system.clipboard.read`
- `system.clipboard.write`
- `system.hosts.write`
- `system.fs.mutate`
- `system.process.exec`
- `system.workflow.run`

Preferred SDK helpers:

- `validateHostPrivilegedActionRequest(...)`
- `requestPrivilegedAction(...)`
- `requestPrivilegedActionFromEnvelope(...)`
- `formatPrivilegedActionError(...)`
- `createClipboardReadRequest(...)`
- `createClipboardWriteRequest(...)`
- `createFilesystemMutateActionRequest(...)`
- `createProcessExecActionRequest(...)`

Recommended response envelope:

```ts
type PrivilegedActionResponse =
  | { ok: true; correlationId: string; result?: unknown }
  | { ok: false; correlationId: string; error: string; code?: string };
```

Do not show only raw `response.error`.
Use `formatPrivilegedActionError(...)` so users see:

- correlation ID
- code
- stderr/stdout when present
- exit code
- command/cwd when present

## Extension Points

Supported extension points:

- lifecycle methods
  - `init()`
  - `render()`
  - `renderOnLoad()`
- `PluginRegistry.registerHandler(...)`
- `PluginRegistry.useStore(...)`
- `PluginRegistry.registerStore(...)`
- `QuickActionMixin`
- `SidePanelMixin`
- DOM helper modules

Avoid depending on:

- private registry internals
- communicator internals
- `_`-prefixed store internals
- undocumented host implementation details

## Anti-Patterns

Avoid these:

- using iframe-only globals in backend code
- doing heavy work in `render()`
- constructor-driven host/runtime side effects
- calling stores too early in field initializers
- assuming JSON storage exists without root config
- depending on undocumented internals as public API
- embedding unsafe raw user text into generated markup

## Examples

Recommended examples and fixtures:

- `examples/fixtures/minimal-plugin.fixture.ts`
- `examples/01-basic-plugin.ts`
- `examples/05-advanced-dom-plugin.ts`
- `examples/08-privileged-actions-plugin.ts`
- `examples/09-operator-plugin.ts`
- `examples/10-system-file-plugin.ts`

Production-oriented fixtures:

- `examples/fixtures/operator-kubernetes-plugin.fixture.ts`
- `examples/fixtures/operator-terraform-plugin.fixture.ts`
- `examples/fixtures/operator-custom-tool-plugin.fixture.ts`

## SharePoint And Connector Example

Example 13 is a production-oriented connector example.

Important architectural split:

- Host is transport/session infrastructure
- Plugin is responsible for provider-specific parsing and UX

For connector-style plugins, the practical rule is:

- host owns session storage and request execution
- plugin interprets provider responses
- plugin decides pending/authenticated UI state
- plugin explicitly persists credentials/session auth into host
- host remains API-agnostic

The example uses generic broker concepts such as:

- auth broker
- content broker
- browser broker
- session request bridge

Do not hardcode service-specific logic into the host if it belongs to plugin-owned provider behavior.

## Security Model

Key security expectations:

- plugin UI runs in a sandboxed iframe
- capability grants are host-managed
- privileged actions are explicit and validated
- network access is capability-gated and scope-gated
- host/plugin boundaries should stay explicit

Practical safety rule:

- prefer explicit contracts over convenience inference
- boundary code should not silently reinterpret provider-specific payloads when plugin can provide explicit state

## API Stability

Use documented contracts as primary sources:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/RENDER_RUNTIME_CONTRACT.md`
- `docs/SAFE_PLUGIN_AUTHORING.md`
- `docs/EXTENSION_POINTS.md`
- `docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md`
- `docs/API_STABILITY.md`

Do not infer public SDK guarantees from internal tests or host implementation details alone.

## Assistant Behavior Guidance

When helping users with this SDK:

- distinguish backend runtime from iframe runtime early
- prefer fixture-first guidance for new plugin authors
- recommend `defineRenderOnLoadActions(...)` for UI event wiring
- recommend host-mediated privileged APIs instead of ad hoc shell/filesystem escape patterns
- recommend capability declarations plus runtime checks
- keep host generic and move provider-specific behavior into plugins
- treat `renderHTML(...)` as mandatory whenever styled DOM helper output is used
- avoid telling users to rely on arbitrary third-party imports in iframe runtime

## Source Documents

This file is derived from:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/RENDER_RUNTIME_CONTRACT.md`
- `docs/SAFE_PLUGIN_AUTHORING.md`
- `docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md`
- `docs/EXTENSION_POINTS.md`
- `docs/QUICK_REFERENCE.md`
- `docs/SHAREPOINT_PROVIDER_HOST_CONTRACT.md`
