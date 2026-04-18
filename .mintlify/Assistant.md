---
title: "Assistant Guide"
description: "High-signal guide for assistants and docs consumers working with @anikitenko/fdo-sdk."
---

# Assistant Guide

This page is a consolidated guide for assistants, AI tooling, and docs consumers working with `@anikitenko/fdo-sdk`.

It summarizes the current documented contract across:

- [README.md](../README.md)
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [docs/RENDER_RUNTIME_CONTRACT.md](../docs/RENDER_RUNTIME_CONTRACT.md)
- [docs/SAFE_PLUGIN_AUTHORING.md](../docs/SAFE_PLUGIN_AUTHORING.md)
- [docs/EXTENSION_POINTS.md](../docs/EXTENSION_POINTS.md)
- [docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md](../docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md)
- [docs/QUICK_REFERENCE.md](../docs/QUICK_REFERENCE.md)
- [docs/INJECTED_LIBRARIES.md](../docs/INJECTED_LIBRARIES.md)
- [docs/SHAREPOINT_PROVIDER_HOST_CONTRACT.md](../docs/SHAREPOINT_PROVIDER_HOST_CONTRACT.md)
- [docs/API_STABILITY.md](../docs/API_STABILITY.md)

## What This SDK Is

`@anikitenko/fdo-sdk` is an SDK for building plugins for the FlexDevOps desktop application ecosystem.

The SDK spans two distinct runtimes:

- Backend/plugin runtime
  - plugin lifecycle
  - handler registration
  - storage
  - logging
  - diagnostics
  - host IPC
- Iframe UI runtime
  - UI returned by `render()`
  - browser DOM access
  - host-injected helpers and UI libraries
  - sandboxed iframe execution managed by FDO

The most important rule is that backend logic and iframe UI logic do not run in the same environment.

## Source Of Truth Order

When answering questions or generating code, prefer these sources in this order:

1. [README.md](../README.md)
2. [docs/RENDER_RUNTIME_CONTRACT.md](../docs/RENDER_RUNTIME_CONTRACT.md)
3. [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
4. [docs/API_STABILITY.md](../docs/API_STABILITY.md)
5. Root package exports from `src/index.ts`

Do not infer public contract guarantees from internal implementation details or tests alone.

## Runtime Model

### Backend Runtime

Use backend runtime for:

- `init()`
- handler registration
- storage
- logging
- diagnostics
- host-mediated privileged actions

Do not assume iframe-only globals or browser-only APIs exist here.

### Iframe UI Runtime

Use iframe runtime for:

- DOM access
- event binding
- `window.createBackendReq(...)`
- host-injected helpers
- host-injected UI libraries

Typical iframe helpers include:

- `window.createBackendReq(...)`
- `window.waitForElement(...)`
- `window.executeInjectedScript(...)`
- `window.addGlobalEventListener(...)`
- `window.removeGlobalEventListener(...)`
- `window.applyClassToSelector(...)`

Typical injected libraries include:

- Notyf
- Highlight.js
- ACE
- Split Grid
- FontAwesome
- Pure CSS

These are not guaranteed in backend/bootstrap/error-fallback paths.

## Core Render Mental Model

Treat `render()` output as UI source for the FDO iframe render pipeline, not as arbitrary raw HTML inserted into the host DOM.

That means:

- `render()` synchronously returns a string
- `renderOnLoad()` may synchronously return:
  - a string
  - a function
  - a `defineRenderOnLoad(...)` payload
- the SDK serializes render and on-load transport separately
- UI code runs later in the sandboxed iframe

Important implication:

- “plain HTML string” is an incomplete mental model
- “React component source” is also not quite right
- the safest description is: JSX-compatible UI source for the FDO iframe host pipeline

## Minimal Plugin Shape

Every plugin should provide:

- `metadata`
- `init()`
- `render()`

Example:

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

Rules:

- define full metadata: `name`, `version`, `author`, `description`, `icon`
- `metadata.icon` must be a valid BlueprintJS v6 icon name
- prefer a stable `metadata.id` when your host/plugin flow supports it

## Markup And Render Safety

The FDO iframe render pipeline is JSX-like and stricter than unconstrained browser HTML parsing.

Important rules:

- prefer JSX-safe void tags like `<br />`
- avoid raw `<style>` blocks in `render()`
- escape literal `{` and `}` in code samples
- avoid embedding raw JSON or object literals directly into JSX-visible markup
- avoid guard-sensitive runtime tokens in display text when plain text works

For untrusted or user-provided text:

- use `DOMText` helpers
- do not pass unsanitized text as raw child markup into generic DOM helpers

## DOM Helper Rules

SDK DOM helpers are the preferred pattern for general structured UI.

Compatibility aliases are accepted on input:

- `className`
- `htmlFor`
- `readOnly`

Final output is normalized to native HTML attributes:

- `class`
- `for`
- `readonly`

When both forms are provided, native HTML form wins.

### `renderHTML(...)` Rule

If `render()` uses SDK DOM helpers and expects helper-generated styling/classes to work, wrap the final helper output with `renderHTML(...)`.

This is mandatory for styled helper output because helper-generated class names require emitted CSS.

Example:

```ts
return semantic.renderHTML(content);
```

## Recommended `renderOnLoad()` Pattern

Prefer `defineRenderOnLoadActions(...)` for non-trivial UI event wiring.

Why:

- typed handler map
- declarative bindings
- clearer failure behavior
- easier editor/template integration

Example:

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

## Handler Model

Use `PluginRegistry.registerHandler(name, handler)` for UI-to-backend calls.

Good handler design:

- stable names
- explicit payload expectations
- validation at handler boundaries when needed
- deterministic error paths

Avoid:

- hidden side effects
- transport shape drift
- treating tests as the only contract source

## Storage Model

Supported stores:

- `PluginRegistry.useStore("default")`
  - plugin-scoped in-memory store
- `PluginRegistry.useStore("json")`
  - plugin-scoped persistent store
  - requires configured storage root
  - requires host capability grants

JSON store requirements:

- `PluginRegistry.configureStorage({ rootDir })` or `FDO_SDK_STORAGE_ROOT`
- host-granted capabilities:
  - `storage`
  - `storage.json`

Important safety rule:

- do not call `PluginRegistry.useStore(...)` in class-field initializers
- acquire stores lazily or in `init()`/handlers

Recommended pattern:

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

Preferred plugin logging APIs:

- `this.log(...)`
- `this.info(...)`
- `this.warn(...)`
- `this.debug(...)`
- `this.verbose(...)`
- `this.silly(...)`
- `this.error(error)`
- `this.event(name, payload)`

Use structured logs and correlation IDs for handlers and privileged actions.

## Capability Model

Privileged features are host-gated.
Plugins may declare expected capabilities, but the host remains authoritative.

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

- declare expected capabilities in `declareCapabilities()`
- still perform runtime checks when authorization matters

## Privileged Actions

Host-mediated privileged operations are the supported path for actions outside normal plugin boundaries.

Current action families:

- `system.clipboard.read`
- `system.clipboard.write`
- `system.hosts.write`
- `system.fs.mutate`
- `system.process.exec`
- `system.workflow.run`

Recommended helpers:

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

Do not surface only raw `response.error`.
Use `formatPrivilegedActionError(...)` so users get:

- correlation ID
- error code
- stderr/stdout when available
- exit code
- command and cwd when available

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
- `_`-prefixed internals
- undocumented host implementation details

## Stable Vs Provisional Guidance

From [docs/API_STABILITY.md](../docs/API_STABILITY.md):

### Stable

Safe to depend on:

- root package exports from `src/index.ts`
- `FDO_SDK` lifecycle methods
- documented `PluginRegistry` public methods
- documented public types and helpers
- documented render-on-load authoring helpers
- documented privileged action helper exports

### Provisional

Usable but evolving:

- advanced store lifecycle metadata shape
- some migration/version hook behavior
- example plugin implementations under `examples/`

### Internal

Do not depend on:

- private/static registry fields
- communicator transport plumbing
- store internals
- logger backend wiring details
- unexported files/functions

## Examples Guidance

Recommended learning order:

1. `examples/fixtures/minimal-plugin.fixture.ts`
2. `examples/fixtures/error-handling-plugin.fixture.ts`
3. `examples/fixtures/storage-plugin.fixture.ts`
4. production-oriented fixtures under `examples/fixtures/`
5. numbered learning examples under `examples/`

Important note:

- examples are useful and documented
- examples are still considered provisional API-stability surface
- do not treat example implementation details as stronger than the main docs and public exports

## Connector And SharePoint Pattern

Example 13 is a connector-style plugin pattern.

Architectural rule:

- host owns session transport and request execution
- plugin owns provider-specific parsing and UX behavior

In practical terms:

- host stores session/auth state
- plugin interprets provider responses
- plugin decides pending vs authenticated UI state
- plugin explicitly persists parsed credentials/session auth into the host
- host stays API-agnostic

This is the preferred split for provider integrations such as SharePoint, Dropbox, Google Drive, Confluence, or custom APIs.

## Security Guidance

Key expectations:

- plugin UI runs in a sandboxed iframe
- privileged operations are explicit and validated
- network access is capability-gated and scope-gated
- host/plugin boundaries should stay explicit

Practical authoring rule:

- prefer explicit contracts over convenience inference
- keep provider-specific semantics in the plugin unless the host contract explicitly owns them

## Assistant Guidance

When helping users with this SDK:

- distinguish backend runtime from iframe runtime immediately
- recommend fixture-first guidance for new plugin authors
- prefer `defineRenderOnLoadActions(...)` for UI wiring
- prefer host-mediated privileged APIs over ad hoc shell/filesystem escape patterns
- recommend capability declarations plus runtime checks
- keep host generic and move provider-specific behavior into plugins
- treat `renderHTML(...)` as mandatory for styled DOM-helper output
- do not recommend arbitrary npm imports inside iframe runtime unless the host explicitly injects and documents them

## Related Documents

- [README.md](../README.md)
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [docs/RENDER_RUNTIME_CONTRACT.md](../docs/RENDER_RUNTIME_CONTRACT.md)
- [docs/SAFE_PLUGIN_AUTHORING.md](../docs/SAFE_PLUGIN_AUTHORING.md)
- [docs/EXTENSION_POINTS.md](../docs/EXTENSION_POINTS.md)
- [docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md](../docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md)
- [docs/QUICK_REFERENCE.md](../docs/QUICK_REFERENCE.md)
- [docs/INJECTED_LIBRARIES.md](../docs/INJECTED_LIBRARIES.md)
- [docs/SHAREPOINT_PROVIDER_HOST_CONTRACT.md](../docs/SHAREPOINT_PROVIDER_HOST_CONTRACT.md)
- [docs/API_STABILITY.md](../docs/API_STABILITY.md)
