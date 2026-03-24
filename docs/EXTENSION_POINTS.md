# Extension Points And Anti-Patterns

This document defines the supported ways to extend plugins with `@anikitenko/fdo-sdk` and what to avoid.

## Supported Extension Points

### Lifecycle Methods

- `init()`
  - register handlers
  - initialize stores
  - perform backend runtime setup
- `render()`
  - return UI source string for the iframe host render pipeline
- `renderOnLoad()`
  - optional on-load string payload for UI runtime setup

### Handler Registration

- `PluginRegistry.registerHandler(name, handler)`
  - use for UI-to-backend calls
  - keep handler names stable and explicit
  - validate payloads at handler boundaries when needed

### Store Usage

- `PluginRegistry.useStore("default")` for scoped in-memory state
- `PluginRegistry.useStore("json")` for scoped persistent state
- `PluginRegistry.registerStore(name, storeOrFactory)` for custom store integrations
- `PluginRegistry.configureStorage({ rootDir })` for persistent storage root

### UI Extensions

- `QuickActionMixin` for quick action definitions
- `SidePanelMixin` for side panel definitions

### Error Handling

- `@handleError()` for controlled error handling behavior
- optional `errorUIRenderer` for render fallback UI

### Logging And Diagnostics

- `this.log/info/warn/debug/verbose/silly(...)` in plugin classes
- `this.error(error)` for error logs
- `this.event(name, payload)` for structured events with correlation IDs
- `PluginRegistry.DIAGNOSTICS_HANDLER` (`"__sdk.getDiagnostics"`) for host diagnostics requests over `UI_MESSAGE`

## Anti-Patterns To Avoid

### Runtime Boundary Violations

- do not use iframe-only globals in backend/bootstrap paths
- do not assume browser APIs are available in plugin backend runtime

### Lifecycle Misuse

- do not perform heavy dynamic setup in `render()`
- do not rely on constructor side effects for host/runtime integration
- do not override serialization helpers unless intentionally changing transport behavior

### Storage Misuse

- do not assume JSON store is available without configured storage root
- do not rely on unscoped key names for cross-plugin shared state
- do not depend on private store internals (`_`-prefixed fields)

### Error Handling Misuse

- do not use brittle UI-only helpers in backend error fallback paths
- do not let custom error UI throw without fallback expectations

### Contract Drift

- do not depend on non-exported internals as public API
- do not infer plugin contract behavior from tests only
- use documented contract sources:
  - `README.md`
  - `docs/RENDER_RUNTIME_CONTRACT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/API_STABILITY.md`
  - this file

## Practical Checklist

- implement `init()` and `render()` explicitly
- define complete `metadata` with valid BlueprintJS v6 `icon`
- prefer `metadata.id` for stable plugin scope
- register handlers in `init()`
- use scoped stores through `PluginRegistry`
- log lifecycle and handler paths with structured events when useful
