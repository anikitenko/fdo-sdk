# SDK for FlexDevOPs Application modules

## Overview

The FDO SDK provides a toolkit for building application modules (plugins) for the FlexDevOps (FDO) desktop application ecosystem.

The important runtime detail is that FDO plugins do not render by dropping raw HTML directly into the host DOM. A plugin's `render()` output is consumed by the FDO iframe host pipeline, transformed, and mounted inside a React-hosted sandboxed iframe. In practice, the SDK's DOM helpers generate JSX-like UI strings for that host pipeline.

Plugin development therefore spans two different runtimes:

- Plugin backend/runtime: your plugin class, handlers, storage, logging, and initialization run in the plugin process.
- Plugin UI/runtime: rendered UI code runs inside the sandboxed iframe host, where FDO injects browser-side helpers and selected UI libraries.

Third-party import rule:
 
- Backend/runtime plugin code can import npm dependencies that are bundled into the plugin artifact.
- Iframe UI/runtime code (`render()` output and `renderOnLoad()` code) must not rely on arbitrary `import`/`require` of npm packages at runtime.
- In iframe UI/runtime, use host-injected globals documented by FDO/SDK (for example `Notyf`, `hljs`, `ace`, `Split`, and `window.*` helpers).
- Treat non-injected third-party UI imports as unsupported unless FDO host explicitly adds and documents them.

The supported lifecycle contract is synchronous:

- `init()` performs setup
- `render()` returns a UI string
- `renderOnLoad()` optionally returns an on-load string
- the SDK serializes those values for host transport separately

Plugin metadata is also part of the host contract. In particular, `metadata.icon` must be a valid BlueprintJS v6 icon name because FDO uses BlueprintJS v6 in the host application.

For the detailed render/runtime contract, see [docs/RENDER_RUNTIME_CONTRACT.md](./docs/RENDER_RUNTIME_CONTRACT.md).

Roadmaps:

- production hardening and completed durability work: [docs/PRODUCTION_GRADE_TODO.md](./docs/PRODUCTION_GRADE_TODO.md)
- longer-term platform vision for DevOps/SRE/operator workflows: [docs/REVOLUTIONARY_PLUGIN_SYSTEM_TODO.md](./docs/REVOLUTIONARY_PLUGIN_SYSTEM_TODO.md)
- concrete FDO host/editor/AI handoff for the current Phase 1 golden path: [docs/PHASE_1_FDO_ALIGNMENT_PROMPT.md](./docs/PHASE_1_FDO_ALIGNMENT_PROMPT.md)

## Features

### DOM Element Generation

The SDK provides extensive DOM element creation capabilities through specialized classes:

- **DOMTable**: Create HTML tables with thead, tbody, tfoot, tr, th, td, and caption elements
- **DOMMedia**: Create media elements including images with accessibility support
- **DOMSemantic**: Create semantic HTML5 elements (article, section, nav, header, footer, aside, main)
- **DOMNested**: Create container elements including ordered lists (ol), definition lists (dl, dt, dd), and more
- **DOMInput**: Create form inputs including select dropdowns with options and optgroups
- **DOMText**: Create text elements (headings, paragraphs, spans, etc.)
- **DOMButton**: Create button elements with event handlers
- **DOMLink**: Create anchor elements
- **DOMMisc**: Create miscellaneous elements like horizontal rules

All DOM classes support:
- Custom CSS styling via goober CSS-in-JS in the iframe UI runtime
- Custom classes and inline styles
- Custom HTML attributes
- Event handlers
- Accessibility attributes

### Plugin Framework

- **FDO_SDK Base Class**: Abstract base class with lifecycle hooks (init, render)
- **IPC Communication**: Message-based communication between plugin workers and main application
- **Data Persistence**: Plugin-scoped storage backends (in-memory, JSON file-based)
- **Capability-Gated Integration**: Host-granted capabilities for privileged SDK paths
- **Contract Validation**: Runtime validators for metadata, host/UI envelopes, and privileged action payloads

### Injected Libraries

The FDO application injects several helper functions and UI libraries into the iframe UI runtime:

- **CSS Frameworks**: Pure CSS, Notyf notifications, Highlight.js themes
- **JavaScript Libraries**: FontAwesome icons, Split Grid, Highlight.js, Notyf, ACE Editor, Goober (CSS-in-JS)
- **Helper Functions**: Backend communication, DOM utilities, event management

These injected globals are not guaranteed in backend/bootstrap/error-fallback paths. For complete documentation on available libraries and usage examples, see [Injected Libraries Documentation](./docs/INJECTED_LIBRARIES.md).

## Getting Started

### Installation

```bash
npm install @anikitenko/fdo-sdk
```

This package is intended for FDO plugin development. Import the root package entry from TypeScript plugin code:

```typescript
import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";
```

Distribution mode:

- The published runtime artifact is Node/CommonJS-oriented (`dist/fdo-sdk.bundle.js`).
- The package does not expose a browser-global SDK contract; FDO host/runtime wiring is the supported path.
- `electron` is declared as a peer dependency (not bundled as an SDK runtime dependency).
- `docs/` and `examples/` are included in the published package for offline reference.

### Creating a Plugin

```typescript
import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

export default class MyPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "My Plugin",
        version: "1.0.0",
        author: "Your Name",
        description: "Plugin description",
        icon: "cog"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.log("MyPlugin initialized!");
    }

    render(): string {
        return `<div>Hello World</div>`;
    }
}

new MyPlugin();
```

### Example Usage

See `examples/fixtures/minimal-plugin.fixture.ts` for the primary minimal plugin scaffold.
See `examples/01-basic-plugin.ts` for the teaching-oriented basic lifecycle example.

See `examples/dom_elements_plugin.ts` for comprehensive examples of using the new DOM element creation capabilities including tables, media, semantic HTML, lists, and form controls.

See `examples/08-privileged-actions-plugin.ts` for the low-level host privileged action request flow using `requestPrivilegedAction(...)` with correlation IDs and stable response envelope handling.

See `examples/09-operator-plugin.ts` for a curated operator helper example for a known tool family built on scoped host process execution.

For FDO-side Monaco/editor/AI alignment on these example priorities, use `docs/PHASE_1_FDO_ALIGNMENT_PROMPT.md`.

The SDK also provides curated operator presets for common DevOps/SRE tooling such as Docker, kubectl, Helm, Terraform, Ansible, AWS CLI, gcloud, Azure CLI, Podman, Kustomize, GitHub CLI, Git, Vault, and Nomad, while still supporting generic custom scopes for host-specific tools.

For production-oriented scaffolding, also use these operator fixtures:

- `examples/fixtures/operator-kubernetes-plugin.fixture.ts`
- `examples/fixtures/operator-terraform-plugin.fixture.ts`
- `examples/fixtures/operator-custom-tool-plugin.fixture.ts`

## Capability And Privileged Actions Model

The SDK uses explicit host-granted capabilities from `PLUGIN_INIT.content.capabilities` (validated at runtime).

Core capabilities:

- `storage.json` - required for `PluginRegistry.useStore("json")`
- `sudo.prompt` - required for `runWithSudo(...)`
- `system.hosts.write` - required for host-mediated hosts updates and scoped privileged fs API
- `system.fs.scope.<scope-id>` - host-defined scoped permission for `system.fs.mutate`
- `system.process.exec` - required for host-mediated process execution
- `system.process.scope.<scope-id>` - host-defined scoped permission for `system.process.exec`

Privileged action contracts:

- `system.hosts.write`
- `system.fs.mutate`
- `system.process.exec`

Public helpers exported from root package:

- `validateHostPrivilegedActionRequest(...)`
- `createHostsWriteActionRequest(...)`
- `createFilesystemMutateActionRequest(...)`
- `createFilesystemScopeCapability(...)`
- `createProcessExecActionRequest(...)`
- `createProcessScopeCapability(...)`
- `createPrivilegedActionBackendRequest(...)`
- `requestPrivilegedAction(...)`
- `createScopedProcessExecActionRequest(...)`
- `requestScopedProcessExec(...)`
- `createProcessCapabilityBundle(...)`
- `createWorkflowCapabilityBundle(...)`
- `createFilesystemCapabilityBundle(...)`
- `describeCapability(...)`
- `parseMissingCapabilityError(...)`
- `getOperatorToolPreset(...)`
- `listOperatorToolPresets(...)`
- `createOperatorToolCapabilityPreset(...)`
- `createOperatorToolActionRequest(...)`
- `requestOperatorTool(...)`
- `createWorkflowRunActionRequest(...)`
- `createScopedWorkflowRequest(...)`
- `requestScopedWorkflow(...)`

Design rule:

- plugin runtime filesystem writes remain constrained by host policy (`PLUGIN_HOME`)
- external privileged writes must be host-mediated, scoped, and auditable
- external command execution must be host-mediated, scoped, and auditable
- first-slice scoped workflows reuse existing process capabilities (`system.process.exec` plus `system.process.scope.<scope-id>`) rather than adding a second broad workflow permission

## Operator-Style Plugins

The SDK is intended to support operator-style plugins, not just small UI widgets.

Typical examples:

- Docker Desktop-like plugins
- Kubernetes dashboards
- Helm release managers
- Podman / container-runtime consoles
- Terraform / infrastructure operator panels
- local cluster or dev-environment controllers

Recommended backend model for these plugins:

- plugin UI remains inside the iframe runtime
- operational actions go through host-mediated privileged contracts
- process execution uses `system.process.exec` plus a narrow scope such as `system.process.scope.docker-cli`
- filesystem mutations use `system.fs.mutate` plus a narrow scope such as `system.fs.scope.<scope-id>`

Do not model these plugins around generic unrestricted shell access.

Preferred pattern:

- define a host scope for each tool family
- allow exact executables, cwd roots, env keys, timeout ceilings, and argument patterns
- audit every privileged request with plugin identity and correlation id
- use `requestScopedWorkflow(...)` when a plugin needs a typed multi-step preview/apply or inspect/act flow instead of plugin-private orchestration

Examples of suitable process scopes:

- `system.process.scope.docker-cli`
- `system.process.scope.kubectl`
- `system.process.scope.helm`
- `system.process.scope.terraform`
- `system.process.scope.ansible`
- `system.process.scope.aws-cli`
- `system.process.scope.gcloud`
- `system.process.scope.azure-cli`
- `system.process.scope.podman`
- `system.process.scope.kustomize`
- `system.process.scope.gh`
- `system.process.scope.git`
- `system.process.scope.vault`
- `system.process.scope.nomad`

This keeps the plugin ecosystem expressive enough for serious operational tooling while keeping FDO host as the real security boundary.

For operator UX and diagnostics, the SDK also provides structured capability remediation helpers so hosts, AI tools, and plugins can distinguish missing broad capabilities from missing narrow scope capabilities without ad hoc regex logic.

For a dedicated authoring guide, see [docs/OPERATOR_PLUGIN_PATTERNS.md](./docs/OPERATOR_PLUGIN_PATTERNS.md).

## Storage Notes

- `PluginRegistry.useStore("default")` returns an in-memory store scoped to the active plugin.
- `PluginRegistry.useStore("json")` returns a JSON-backed store scoped to the active plugin.
- JSON persistence now requires an explicit storage root from the host via `PluginRegistry.configureStorage({ rootDir })` or the `FDO_SDK_STORAGE_ROOT` environment variable.
- If no storage root is configured, requesting the JSON store throws instead of silently writing to `process.cwd()`.

## Logging Notes

- Log files are written under a configurable root directory via `FDO_SDK_LOG_ROOT` (or fallback `./logs`).
- In FDO host runtime, log files are written directly into the host-provided plugin log directory.
- Lifecycle/IPC logs now include structured event fields and correlation IDs for host-side aggregation.

Plugin author logging API:

- `this.log(message)` basic log entry
- `this.info(message, ...meta)` info log
- `this.warn(message, ...meta)` warning log
- `this.debug(message, ...meta)` debug log
- `this.verbose(message, ...meta)` verbose log
- `this.silly(message, ...meta)` low-priority trace log
- `this.error(error)` error log
- `this.event(name, payload)` structured event log, returns a correlation ID
- `this.getLogDirectory()` resolved directory for this plugin's log files

Example:

```typescript
init(): void {
  this.info("Plugin init started", { plugin: this.metadata.name });
  const correlationId = this.event("plugin.init.custom", { phase: "start" });
  this.debug("Custom init event emitted", { correlationId });
  this.info(`Log directory: ${this.getLogDirectory()}`);
}
```

In FDO host runtime, logs are typically written under:

- `PLUGIN_HOME/logs/`

Plugin identity is still attached in structured log metadata (`pluginId`, `component`, `sessionId`), but the filesystem layout is flat inside the host-provided log directory.

## Host Diagnostics Notes

- The SDK exposes a reserved diagnostics handler: `PluginRegistry.DIAGNOSTICS_HANDLER` (`"__sdk.getDiagnostics"`).
- Hosts can query runtime health/capabilities/notifications via a `UI_MESSAGE` request without adding custom plugin handlers.
- Diagnostics include capability grant and usage/denial counters for permission auditing.

Example host request payload:

```typescript
{
  message: "UI_MESSAGE",
  content: {
    handler: "__sdk.getDiagnostics",
    content: { notificationsLimit: 20 }
  }
}
```

## Development

### Building

```bash
npm run build        # Build webpack bundle and emit TypeScript declarations
npm run build:bundle # Build runtime bundle only
npm run build:types  # Generate TypeScript declarations only
npm run verify:pack  # Verify declaration artifacts and npm pack contents
```

Build artifacts required for publish:

- `dist/fdo-sdk.bundle.js`
- `dist/dom-metadata.json`
- `dist/@types/**` (including `dist/@types/index.d.ts`)

### Testing

```bash
npm test             # Run Vitest tests
npm run test:coverage # Run tests with coverage report
npm run coverage:open # Open coverage report in browser
```

### Publishing

The package includes strict verification gates before publishing:

- `prepack` runs `build` and `verify:types:local`
- `prepublishOnly` runs tests, example type checks, build, and `verify:pack`

`verify:pack` fails if:

- `dist/@types/index.d.ts` is missing
- no declaration files are present under `dist/@types/`
- `package.json.types` or `exports["."].types` do not resolve to existing files
- `npm pack --dry-run --json` does not include declaration files

#### Release Automation

- CI (`.github/workflows/ci.yml`) runs on PRs and on pushes to `main`.
- Release automation (`.github/workflows/release-please.yml`) runs on `main` and:
  - opens/updates a release PR with version and changelog changes
  - creates a release/tag when that release PR is merged
  - publishes the package to npm with provenance when a new release is created
- `CHANGELOG.md` is updated automatically by release-please during release PR updates.

Typical fully automated flow:

1. Merge feature/fix PRs to `main`.
2. Merge the generated release PR.
3. Release Please creates the release and publishes automatically.

Manual fallback flow:

```bash
npm version patch
git push origin main --follow-tags
```

## Documentation

- Full API documentation is available in the TypeScript declaration files
- All public methods include JSDoc comments with usage examples
- See the `examples/` directory for working plugin implementations
- See [docs/RENDER_RUNTIME_CONTRACT.md](./docs/RENDER_RUNTIME_CONTRACT.md) for backend-vs-iframe runtime rules and render pipeline expectations
- See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for SDK runtime/lifecycle/message/storage architecture
- See [docs/BUNDLE_BOUNDARY_REVIEW.md](./docs/BUNDLE_BOUNDARY_REVIEW.md) for current FDO-aligned dependency/bundle boundary decisions
- See [docs/API_STABILITY.md](./docs/API_STABILITY.md) for stable vs internal API rules and semver expectations
- See [docs/SAFE_PLUGIN_AUTHORING.md](./docs/SAFE_PLUGIN_AUTHORING.md) for backend/UI/runtime-safe authoring practices, logging, and storage usage
- See [docs/OPERATOR_PLUGIN_PATTERNS.md](./docs/OPERATOR_PLUGIN_PATTERNS.md) for Docker/Kubernetes/Helm/Terraform style plugin patterns
- See [docs/EXTENSION_POINTS.md](./docs/EXTENSION_POINTS.md) for supported plugin extension points and anti-patterns
- See [docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md](./docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md) for privileged action request/response contracts, scope model, and host enforcement guidance

## License

ISC
