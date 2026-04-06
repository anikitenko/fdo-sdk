# Production-Grade TODO

This backlog is based on the current SDK implementation as of 2026-03-24. It focuses on making the package durable in production, reusable across plugins, and easier for AI tooling to reason about safely.

For the longer-term product/platform roadmap, see [docs/REVOLUTIONARY_PLUGIN_SYSTEM_TODO.md](./REVOLUTIONARY_PLUGIN_SYSTEM_TODO.md).

## Completed In This Pass

- [x] Hardened `@handleError()` so a failing `errorUIRenderer` falls back to the default render error UI instead of causing an unhandled rejection.
- [x] Preserved synchronous `render()` behavior for synchronous methods decorated with `@handleError()`.
- [x] Added regression tests for broken custom render error UIs and sync render behavior.
- [x] Added `prepack` so `npm pack` and `npm publish` always build `dist/` first.
- [x] Excluded `dist/*.map` from the published package.
- [x] Documented the real SDK render/runtime contract in SDK docs, including backend-vs-iframe runtime separation and the FDO iframe-hosted render pipeline.
- [x] Stopped mutating `render()` and `renderOnLoad()` inside the `FDO_SDK` constructor by moving transport serialization into explicit SDK methods.
- [x] Added an explicit root `exports` map so the published package exposes one unambiguous public entry point.
- [x] Split ambient iframe host globals out of `src/index.ts` into a dedicated ambient declaration module.
- [x] Added runtime validation for plugin metadata, serialized render payloads, inbound host messages, and `UI_MESSAGE` payloads.
- [x] Added an integration-style test that drives `PLUGIN_INIT` and `PLUGIN_RENDER` through `Communicator`, `PluginRegistry`, and a real `FDO_SDK` subclass.
- [x] Added host privileged action SDK contracts and validators for `system.hosts.write` and `system.fs.mutate`, including scoped capability typing (`system.fs.scope.<scope-id>`).
- [x] Added privileged action developer UX helpers and reference examples for typed transport helpers, correlation IDs, and stable response envelope handling.
- [x] Added host privileged action support for scoped process execution (`system.process.exec`, `system.process.scope.<scope-id>`) with typed request/response helpers and operator-focused authoring docs.
- [x] Added first-class privileged action transport helpers (`requestPrivilegedAction`, `createPrivilegedActionBackendRequest`) so plugin authors no longer hand-roll raw host IPC envelopes.
- [x] Added higher-level operator UX helpers for curated DevOps/SRE tool families and generic custom scopes, including capability bundles, structured missing-capability diagnostics, and curated operator presets.
- [x] Added production-oriented operator fixtures for known tool families (`kubectl`, `terraform`) and host-specific custom scopes to improve authoring guidance and AI grounding.

## Completed In FDO Host Review

- [x] Verified the real plugin render contract in FDO: plugin `render()` output is consumed by a React-hosted iframe pipeline, not inserted as raw `innerHTML`.
- [x] Verified that UI-only injected libraries such as goober, ACE, Highlight.js, Notyf, FontAwesome, and Split Grid are provided by the iframe host runtime, not by the plugin backend runtime.
- [x] Updated the FDO AI coding assistant prompt so it no longer claims that FDO plugins are "plain HTML only" or "do not use React", and instead reflects the real iframe-hosted render pipeline.
- [x] Hardened the FDO plugin host message path so message source and payload shape are validated in shared helpers rather than relying only on ad hoc checks in `PluginContainer`.
- [x] Removed the false impression that regex filtering in `PluginContainer` is the main security boundary; the host now documents the real boundary as iframe sandbox plus host-side validation.

## Verified Context From FDO Review

- The remaining SDK DOM-builder work should be treated as JSX-string generation for a React host, not as generic HTML string generation.
- The remaining SDK documentation work should explicitly separate backend/plugin-host runtime from iframe/UI runtime.
- The remaining package/distribution decisions should stay aligned with FDO as the only supported host rather than optimizing for generic consumers.

## P0: Contract And Runtime Safety

- [x] Make the render lifecycle contract explicit and consistent.
  Current state: `FDOInterface.render()` is typed as synchronous, `FDO_SDK` wraps render output with `JSON.stringify()`, `PluginRegistry.callRenderer()` is synchronous, and `@handleError()` previously turned `render()` into an async function.
  Completed: the SDK now documents and enforces a synchronous string-based contract for `render()` and optional `renderOnLoad()`, while transport serialization is handled explicitly by SDK methods.

- [x] Stop mutating `render()` and `renderOnLoad()` inside the `FDO_SDK` constructor.
  Completed: transport serialization now lives in explicit SDK methods instead of constructor-time lifecycle mutation.

- [x] Add integration tests for the actual plugin-host message flow.
  Completed: the SDK now has an integration-style test that instantiates a real plugin subclass, sends `PLUGIN_INIT` and `PLUGIN_RENDER`, and validates the serialized response contract through `Communicator`, `PluginRegistry`, and `FDO_SDK` together.

- [x] Define failure behavior for plugin initialization and rendering.
  Completed: lifecycle transport failures now degrade predictably. `PLUGIN_INIT` returns empty capabilities plus an `error` message on failure, and `PLUGIN_RENDER` returns fallback error UI plus an `error` message.

## P0: Storage And Isolation

- [x] Replace singleton global store patterns with plugin-scoped storage.
  Completed: `PluginRegistry.useStore()` now resolves plugin-scoped store instances, JSON persistence is namespaced by plugin ID, and JSON storage requires an explicit host-provided storage root instead of silently defaulting to `process.cwd()`.

- [x] Remove synchronous filesystem writes from the default JSON store path.
  Completed: `StoreJson` now persists via queued async atomic writes, logs write failures consistently, and applies corrupted-JSON recovery by backing up malformed content and resetting in-memory state.

- [x] Add a store interface with lifecycle hooks and capabilities.
  Completed: stores can now expose lifecycle hooks (`init`, `flush`, `dispose`, optional migration/version hooks) and capability metadata; `PluginRegistry` executes lifecycle hooks for scoped store instances.

## P1: Package And Distribution Quality

- [x] Add an explicit `exports` map in `package.json`.
  Completed: the package now exposes an explicit root entry and package metadata path through `exports`.

- [x] Lock the package to the one distribution mode FDO actually uses.
  Completed: package/runtime signaling now aligns to one Node/CommonJS distribution path for FDO plugins (`"type": "commonjs"`, root `exports` with `require`, webpack output library set to `commonjs2`), and docs explicitly state there is no browser-global SDK contract.

- [x] Review bundle size against the current FDO host implementation before changing packaging boundaries.
  Completed: dependency/boundary review is now documented in `docs/BUNDLE_BOUNDARY_REVIEW.md`, including an FDO runtime-aligned decision to keep current dependency boundaries in this pass (with explicit non-blocking optimization candidates) rather than applying blind externalization/splitting.

- [x] Add a CI release verification step.
  Completed: CI now runs `npm test`, `npm run build`, and `npm run verify:pack` (which executes `npm pack --dry-run --json` and asserts tarball contents include `dist/` while excluding development-only paths such as `src/`, `tests/`, `.github/`, and `coverage/`).

## P1: API Design And Type Quality

- [x] Make public types stricter and host-aware.
  Completed: runtime-critical public contracts now use typed IPC envelopes and responses, typed handler signatures, typed render payloads, stricter store generics (`unknown` defaults), and aligned lifecycle interface signatures.

- [x] Split ambient browser globals from core SDK exports.
  Completed: host-provided globals now live in a dedicated ambient module and are referenced separately from the core runtime entry.

- [x] Add schemas or validation for plugin metadata and host messages.
  Completed: the SDK now validates plugin metadata, serialized render payloads, inbound host message envelopes, and `UI_MESSAGE` payloads at runtime before acting on them.

## P1: DOM Builder Safety And Maintainability

- [x] Document the real render contract: the SDK emits JSX-like strings for the FDO React host, not plain server-rendered HTML.
  Current state: the SDK reads like an HTML string builder, but the FDO app sanitizes plugin output, wraps it in a fragment, Babel-transforms it, and renders it as a React component inside the iframe.
  Completed: SDK docs now explicitly describe the React-hosted iframe render pipeline so plugin authors and AI tools target the actual host contract rather than raw `innerHTML`.

- [x] Add escaping and syntax-safety rules for JSX string generation.
  Completed: JSX escaping is now centralized in `DOM` for attribute values and text-node contexts (including quotes, braces, angle brackets, ampersands, and script-like content), with regression coverage added in `DOM`/`DOMText` tests.

- [x] Normalize JSX prop and event serialization through one serializer.
  Completed: JSX prop/event serialization now flows through `DOM` serializers (`createAttributes`/`createOnAttributes`) with canonical alias normalization (`class` -> `className`, `for` -> `htmlFor`, `readonly` -> `readOnly`) and shared escaping rules.

- [x] Remove copy-pasted `customAttributes` merging across DOM helper classes.
  Completed: `customAttributes` merge behavior is now centralized in `DOM.applyCustomAttributes(...)` and reused by `DOMNested`, `DOMSemantic`, `DOMTable`, and `DOMMedia`.

- [x] Validate heading levels and element-specific invariants.
  Current state: `DOMText.createHText()` accepts any number and emits `h${level}` without range checks.
  Completed: `DOMText.createHText()` now enforces integer levels `1..6` and throws a clear error for invalid inputs; regression tests cover below-range, above-range, and non-integer values.

- [x] Clarify whether the DOM builder is trusted-markup-only or safe-by-default.
  Current state: the API accepts raw child strings everywhere, which is flexible but ambiguous in a JSX compilation pipeline.
  Completed: docs now explicitly define the contract: generic DOM helpers consume trusted JSX-like child markup, while `DOMText` helpers are the safe-text path for untrusted/user content.

## P1: Logging And Observability

- [x] Make logging destination explicit and configurable.
  Completed: logger now supports configurable log root (`FDO_SDK_LOG_ROOT`) and writes to plugin-scoped directories with plugin/component/session metadata attached to log records.

- [x] Add correlation IDs and structured lifecycle events.
  Completed: logger now supports structured `event(...)` records with correlation IDs, and communicator/registry lifecycle paths emit structured events for init/render/handler/IPC flows.

- [x] Add a host-facing diagnostics API.
  Completed: SDK now exposes a reserved diagnostics handler (`PluginRegistry.DIAGNOSTICS_HANDLER` / `__sdk.getDiagnostics`) returning typed health state, capability metadata, and recent notifications for host-side inspection without log scraping.

## P2: Documentation And AI Readability

- [x] Add an architecture document for maintainers and AI coding tools.
  Completed: architecture documentation now defines runtime model, lifecycle flow, message boundaries, serialization responsibilities, storage model, and extension/internal boundaries.

- [x] Add a "safe plugin authoring" guide.
  Completed: SDK now includes an author-facing guide that separates backend vs iframe runtime assumptions and documents safe logging, metadata, storage, and error-path practices.

- [x] Document supported extension points and anti-patterns.
  Completed: SDK now includes a dedicated extension-points guide covering supported lifecycle/handlers/stores/UI extension mechanisms and explicit anti-patterns across runtime, storage, and contract boundaries.

- [x] Add API stability rules.
  Completed: API stability levels now distinguish stable/provisional/internal surfaces, define change rules, and identify contract source files for AI tooling.

## P2: Example And Reference Quality

- [x] Verify all examples against the current public API in CI.
  Completed: example compilation is now enforced through `test:examples`, included in workflows and prepublish checks to prevent API drift in examples.

- [x] Convert examples into scenario-based reference fixtures.
  Completed: canonical fixtures now exist under `examples/fixtures/` for minimal, error-handling, storage, and advanced UI scenarios, each with concise pattern intent; examples docs now point AI/plugin authors to this fixture set first.

- [x] Add operator-style golden-path fixtures and helper patterns for DevOps/SRE plugins.
  Completed: the SDK now provides curated operator fixtures for Kubernetes and Terraform plus a generic custom-tool fixture, along with transport helpers, operator presets, capability bundles, and missing-capability diagnostics for AI-friendly production authoring flows.

## P3: Future Hardening

- [x] Add plugin API version negotiation.
  Completed: `PLUGIN_INIT` now accepts optional `content.apiVersion`; the SDK validates it and enforces major-version compatibility against `FDO_SDK.API_VERSION`, returning a stable init error response on mismatch.

- [x] Add deprecation infrastructure.
  Completed: added structured deprecation utilities (`emitDeprecationWarning`, `formatDeprecationMessage`) with once-per-id emission semantics, plus an SDK-hosted deprecated alias (`PluginRegistry.configureCapabilityPolicy`) that points callers to `configureCapabilities`.

- [x] Add capability-based permissions.
  Completed: privileged operations are now capability-gated and auditable. Host grants are configured through `PLUGIN_INIT.content.capabilities`/`PluginRegistry.configureCapabilities`, `useStore("json")` requires `storage.json`, `runWithSudo(...)` requires `sudo.prompt`, and diagnostics now expose grants plus usage/denial counters.
