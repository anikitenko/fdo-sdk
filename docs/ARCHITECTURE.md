# SDK Architecture

This document is the canonical architecture reference for `@anikitenko/fdo-sdk`.

## Runtime Model

The SDK spans two runtimes:

- Backend/plugin runtime:
  - plugin class lifecycle (`init`, handlers, stores, logging)
  - communicator and host IPC handling
  - persistence and diagnostics
- Iframe UI runtime (FDO host managed):
  - plugin UI code produced by `render()`
  - host-injected browser/UI helpers
  - React-hosted iframe render pipeline

For detailed render semantics, see [RENDER_RUNTIME_CONTRACT.md](./RENDER_RUNTIME_CONTRACT.md).

## Lifecycle Model

Primary plugin lifecycle:

- `init()`:
  - setup and registrations
  - may fail; communicator returns stable failure payload
- `render()`:
  - returns UI source string
  - serialized for host transport via explicit SDK methods
- `renderOnLoad()`:
  - optional string payload for UI on-load behavior

Transport helpers:

- `serializeRender()`
- `serializeRenderOnLoad()`

These methods are transport boundaries, not authoring lifecycle overrides.

## Message Flow

Inbound host messages are validated in runtime contract validators:

- envelope validation (`MESSAGE_TYPE`, payload shape)
- UI message payload validation (`handler`, `content`)

Core message paths:

- `PLUGIN_READY`
- `PLUGIN_INIT`
- `PLUGIN_RENDER`
- `UI_MESSAGE`

Failure behavior:

- `PLUGIN_INIT` failure: empty capabilities + `error`
- `PLUGIN_RENDER` failure: fallback error UI + `error`
- `UI_MESSAGE` failure: `{ error: string }`

## Storage Model

Storage is plugin-scoped through `PluginRegistry.useStore(...)`.

- `default` store:
  - in-memory
  - scoped by plugin identity
- `json` store:
  - persistent
  - requires explicit storage root (`configureStorage` or `FDO_SDK_STORAGE_ROOT`)
  - path is namespaced by plugin scope

Store lifecycle hooks are supported:

- `init(context)`
- `flush()`
- `dispose()`
- optional capability metadata and migration/version hooks

## Validation Boundaries

Runtime validation currently covers:

- plugin metadata (including BlueprintJS v6 icon name)
- serialized render payload shape
- host message envelope shape
- UI message payload shape

Validation should happen at boundaries, not in arbitrary inner layers.

## Extension Points

Stable extension points for plugin authors:

- `FDO_SDK` lifecycle methods
- `PluginRegistry.registerHandler(...)`
- `PluginRegistry.useStore(...)`
- mixins (`QuickActionMixin`, `SidePanelMixin`)
- DOM helper modules for UI-source generation

## Internal Boundaries

Internal modules that should not be treated as public plugin API contracts:

- communicator implementation details
- private registry internals
- store internals prefixed with `_` fields
- decorator internals outside documented behavior

## Design Constraints

- prioritize predictable host/plugin boundaries over convenience
- avoid runtime assumptions leaking between backend and iframe contexts
- keep metadata, transport, and store contracts explicit and machine-readable
- preserve deterministic behavior in failure paths
