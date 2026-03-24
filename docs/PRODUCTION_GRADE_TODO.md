# Production-Grade TODO

This backlog is based on the current SDK implementation as of 2026-03-24. It focuses on making the package durable in production, reusable across plugins, and easier for AI tooling to reason about safely.

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
  Status note: this host contract has been verified in FDO and reflected in FDO's AI coding guidance, but the SDK docs themselves still need to say it explicitly.
  Action: document this explicitly so plugin authors and AI tools know they are targeting a React-hosted JSX DSL, not raw `innerHTML`.

- [ ] Add escaping and syntax-safety rules for JSX string generation.
  Current state: text content and attribute values are interpolated directly into markup strings that are later compiled as JSX.
  Risk: plugin-generated content can break parsing, render incorrectly, or create unsafe code-generation edges.
  Action: centralize escaping for text nodes and JSX attribute values, then add tests for quotes, braces, angle brackets, ampersands, and script-like content.

- [ ] Normalize JSX prop and event serialization through one serializer.
  Current state: event handlers and props are generated ad hoc across the DOM helpers.
  Action: define the exact FDO JSX contract once, including prop names such as `className` and `htmlFor`, and have all DOM helper classes delegate to it.

- [ ] Remove copy-pasted `customAttributes` merging across DOM helper classes.
  Current state: `DOMNested`, `DOMSemantic`, `DOMTable`, and `DOMMedia` repeat the same merge logic in many methods.
  Action: move this into a shared helper on `DOM` so new element types stay consistent and easier for humans and AI tools to extend safely.

- [ ] Validate heading levels and element-specific invariants.
  Current state: `DOMText.createHText()` accepts any number and emits `h${level}` without range checks.
  Action: guard invalid levels and document behavior for unsupported element variants.

- [ ] Clarify whether the DOM builder is trusted-markup-only or safe-by-default.
  Current state: the API accepts raw child strings everywhere, which is flexible but ambiguous in a JSX compilation pipeline.
  Action: either document that callers are responsible for supplying trusted JSX-safe content, or provide safe text APIs plus explicit raw-markup escape hatches.

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

- [ ] Convert examples into scenario-based reference fixtures.
  Action: keep one minimal plugin, one error-handling plugin, one storage plugin, and one advanced UI plugin, each with a short explanation of the intended pattern.

## P3: Future Hardening

- [ ] Add plugin API version negotiation.
  Action: use `FDO_SDK.API_VERSION` as an actual compatibility gate instead of a static constant only.

- [ ] Add deprecation infrastructure.
  Action: provide a structured way to mark APIs as deprecated, emit warnings, and point plugin authors to replacements.

- [ ] Add capability-based permissions.
  Action: make privileged features such as sudo prompts, storage access, and host integrations opt-in and auditable by the FDO application.
