# SDK for FlexDevOPs Application modules

## Overview

The FDO SDK provides a toolkit for building application modules (plugins) for the FlexDevOps (FDO) desktop application ecosystem.

The important runtime detail is that FDO plugins do not render by dropping raw HTML directly into the host DOM. A plugin's `render()` output is consumed by the FDO iframe host pipeline, transformed, and mounted inside a React-hosted sandboxed iframe. In practice, the SDK's DOM helpers generate JSX-like UI strings for that host pipeline.

Plugin development therefore spans two different runtimes:

- Plugin backend/runtime: your plugin class, handlers, storage, logging, and initialization run in the plugin process.
- Plugin UI/runtime: rendered UI code runs inside the sandboxed iframe host, where FDO injects browser-side helpers and selected UI libraries.

The supported lifecycle contract is synchronous:

- `init()` performs setup
- `render()` returns a UI string
- `renderOnLoad()` optionally returns an on-load string
- the SDK serializes those values for host transport separately

Plugin metadata is also part of the host contract. In particular, `metadata.icon` must be a valid BlueprintJS v6 icon name because FDO uses BlueprintJS v6 in the host application.

For the detailed render/runtime contract, see [docs/RENDER_RUNTIME_CONTRACT.md](./docs/RENDER_RUNTIME_CONTRACT.md).

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
- **System Integration**: Logging, file operations, and privilege elevation

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

See `examples/example_plugin.ts` for a basic plugin example.

See `examples/dom_elements_plugin.ts` for comprehensive examples of using the new DOM element creation capabilities including tables, media, semantic HTML, lists, and form controls.

## Storage Notes

- `PluginRegistry.useStore("default")` returns an in-memory store scoped to the active plugin.
- `PluginRegistry.useStore("json")` returns a JSON-backed store scoped to the active plugin.
- JSON persistence now requires an explicit storage root from the host via `PluginRegistry.configureStorage({ rootDir })` or the `FDO_SDK_STORAGE_ROOT` environment variable.
- If no storage root is configured, requesting the JSON store throws instead of silently writing to `process.cwd()`.

## Logging Notes

- Log files are written under a configurable root directory via `FDO_SDK_LOG_ROOT` (or fallback `./logs`).
- Logs are namespaced by plugin scope in per-plugin subdirectories.
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

Example:

```typescript
init(): void {
  this.info("Plugin init started", { plugin: this.metadata.name });
  const correlationId = this.event("plugin.init.custom", { phase: "start" });
  this.debug("Custom init event emitted", { correlationId });
}
```

## Host Diagnostics Notes

- The SDK exposes a reserved diagnostics handler: `PluginRegistry.DIAGNOSTICS_HANDLER` (`"__sdk.getDiagnostics"`).
- Hosts can query runtime health/capabilities/notifications via a `UI_MESSAGE` request without adding custom plugin handlers.

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
npm run build        # Build webpack bundle (automatically runs build:types first)
npm run build:types  # Generate TypeScript declarations only
```

### Testing

```bash
npm test             # Run Jest tests
npm run test:coverage # Run tests with coverage report
npm run coverage:open # Open coverage report in browser
```

### Publishing

The package includes a `prepublishOnly` script that automatically runs tests and builds before publishing to ensure quality.

#### Release Automation

- CI (`.github/workflows/ci.yml`) runs on PRs and on pushes to `main`.
- Release automation (`.github/workflows/release-please.yml`) runs on `main` and:
  - opens/updates a release PR with version and changelog changes
  - creates a `v*` git tag when that release PR is merged
- `CHANGELOG.md` is updated automatically by release-please during release PR updates.
- Publish (`.github/workflows/publish.yml`) runs on `v*` tag push and publishes to npm with provenance.

Typical fully automated flow:

1. Merge feature/fix PRs to `main`.
2. Merge the generated release PR.
3. Tag-triggered publish runs automatically.

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
- See [docs/EXTENSION_POINTS.md](./docs/EXTENSION_POINTS.md) for supported plugin extension points and anti-patterns

## License

ISC
