# Render Runtime Contract

This document defines the real runtime contract for FDO plugins built with `@anikitenko/fdo-sdk`.

## Short Version

- Your plugin class runs in the plugin backend/runtime.
- Your plugin UI runs in a sandboxed iframe host managed by FDO.
- `render()` returns UI source for the FDO iframe pipeline.
- That output is not the same thing as raw `innerHTML` inserted directly into the host page.
- SDK DOM helpers generate UI strings intended for that iframe-hosted render pipeline.

## Two Runtimes

### Backend Runtime

This is where your plugin class and backend logic run.

Typical backend/runtime responsibilities:

- `init()`
- handler registration
- storage access
- logging
- filesystem or process-side work
- error handling outside the iframe UI

Do not assume iframe-only globals or injected UI libraries exist here.

### Iframe UI Runtime

This is where your plugin UI code runs after FDO consumes `render()` output.

Typical iframe/runtime capabilities:

- browser DOM access
- `window.createBackendReq(...)`
- `window.waitForElement(...)`
- `window.executeInjectedScript(...)`
- `window.addGlobalEventListener(...)`
- `window.removeGlobalEventListener(...)`
- `window.applyClassToSelector(...)`
- injected UI libraries such as goober, ACE, Highlight.js, Notyf, FontAwesome, and Split Grid

These helpers and libraries are provided by the FDO host iframe environment, not by the backend runtime.

## What `render()` Really Means

`render()` returns a string, but that string should be understood as UI source for the FDO iframe host pipeline.

At a high level, FDO:

1. requests plugin render output
2. prepares and validates the payload
3. wraps the render content for the iframe host
4. transforms it for the plugin page runtime
5. mounts it inside a React-hosted sandboxed iframe

Because of that:

- "plain HTML string" is an incomplete mental model
- "React component source" is also not quite right from the plugin author's perspective
- the safest description is: JSX-like UI strings for the FDO iframe host pipeline

The SDK now keeps that separation explicit:

- `render()` returns the plugin's UI string
- `renderOnLoad()` optionally returns the plugin's on-load script/function string
- serialization for the host transport is handled by explicit SDK methods rather than by mutating plugin lifecycle methods at construction time

## Supported Lifecycle Contract

The supported public contract in the SDK is:

- `init()` performs plugin setup
- `render()` synchronously returns a string
- `renderOnLoad()` optionally synchronously returns a string
- `serializeRender()` and `serializeRenderOnLoad()` are transport helpers used by the SDK/host boundary

Plugin authors should override:

- `init()`
- `render()`
- optionally `renderOnLoad()`

Plugin authors should not override the transport serialization methods unless they are intentionally changing SDK-host transport behavior.

## Plugin Metadata Contract

- `metadata` is part of the host-facing contract, not just plugin-internal data.
- `metadata.icon` must be a valid BlueprintJS v6 icon name because the FDO host uses BlueprintJS v6.
- Keep metadata values deterministic and serializable.

## What The SDK DOM Helpers Do

Classes such as `DOMText`, `DOMButton`, `DOMTable`, `DOMNested`, and related helpers build strings for plugin UI composition.

You should treat them as:

- helpers for the FDO UI render pipeline
- not proof that the host inserts raw HTML directly
- not proof that every browser/runtime feature is available everywhere

## Runtime Safety Rules

### Safe Backend Assumptions

These are generally backend/runtime concerns:

- registering handlers in `init()`
- reading or writing store data
- logging and diagnostics
- backend error handling

### Safe Iframe/UI Assumptions

These are generally iframe/runtime concerns:

- DOM interaction
- event listeners on `window` or `document`
- `window.createBackendReq(...)`
- goober styling used by rendered UI behavior
- UI-only injected libraries

### Unsafe Assumption To Avoid

Do not assume iframe-injected libraries exist in:

- plugin constructors
- class field initializers
- backend/bootstrap paths
- backend render-error fallbacks
- non-UI utility modules unless the current workspace explicitly proves that runtime

## Error Handling Guidance

If you use `errorUIRenderer` or any custom render fallback:

- keep it runtime-safe
- avoid depending on iframe-only helpers unless you know the fallback runs in the iframe UI path
- prefer simple fallback UI over brittle styling dependencies

## Practical Authoring Guidance

- Use `init()` for setup and handler registration.
- Use `render()` to provide UI for the iframe host pipeline.
- Use injected `window.*` helpers only from UI-facing code paths.
- Use SDK DOM helpers when they match the existing workspace style.
- Do not move UI-runtime assumptions into backend/bootstrap code.

## Guidance For AI Tools

When generating or refactoring FDO plugins:

- do not describe the plugin UI as only "plain HTML"
- do not claim unrestricted React/Electron/Node access from UI code
- preserve the current workspace's render convention
- distinguish backend runtime from iframe runtime explicitly
