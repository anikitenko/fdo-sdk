# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Build Commands
```bash
npm run build         # Build webpack bundle (UMD format, outputs to dist/)
npm run build:types   # Generate TypeScript declarations (outputs to dist/@types/)
```

### Testing
```bash
npm test                 # Run Jest tests
npm run test:coverage    # Run tests with coverage report
npm run coverage:open    # Open coverage report in browser
```

The test suite enforces 80% coverage threshold for branches, functions, lines, and statements.

### Development Workflow
When making changes:
1. Run `npm test` to ensure tests pass
2. Run `npm run build` to verify the bundle compiles
3. Run `npm run build:types` to generate TypeScript declarations

## Architecture Overview

### Core Concepts

This is an **SDK for building plugins** for the FlexDevOps (FDO) desktop application. Plugins run in Electron worker threads and communicate with the main application via IPC. The SDK provides:

1. **Server-side HTML generation**: Plugins generate HTML strings on the backend (in worker threads), which are then displayed in a WebView UI
2. **DOM builder classes**: Type-safe, server-side HTML generation with CSS-in-JS via goober
3. **IPC communication layer**: Message-based communication between plugin workers and the FDO host application
4. **Lifecycle management**: Plugin initialization, rendering, and event handling

### Plugin Architecture

**Plugin Execution Model:**
- Plugins extend `FDO_SDK` base class and implement `FDOInterface`
- Each plugin runs in an Electron worker thread (isolated from main process)
- Communication flows: FDO Host ↔ Communicator (IPC) ↔ PluginRegistry ↔ Plugin Instance
- UI is rendered server-side as HTML strings, injected into a WebView in the host app

**Key Classes:**
- `FDO_SDK`: Base class all plugins extend; provides lifecycle hooks (`init()`, `render()`, `renderOnLoad()`)
- `Communicator`: Handles IPC messages between worker thread and main process using Electron's `process.parentPort`
- `PluginRegistry`: Singleton that manages plugin instances, message handlers, and storage backends
- `DOM*` classes: Server-side HTML builders (DOMTable, DOMInput, DOMNested, DOMText, DOMSemantic, etc.)

**Message Flow:**
1. Host sends message to worker → `Communicator` receives via `process.parentPort`
2. `Communicator` emits event → `PluginRegistry` routes to appropriate handler
3. Plugin handler executes → Returns response → `Communicator` sends back to host
4. For UI events: User clicks button → Host sends `UI_MESSAGE` → Plugin handler updates state → New HTML returned

### Storage Architecture

Two built-in storage backends accessible via `PluginRegistry.useStore()`:
- `StoreDefault`: In-memory key-value store (lost on restart)
- `StoreJson`: File-based JSON storage with atomic writes using `write-file-atomic`

Storage is namespaced by plugin and supports both sync and async operations.

### DOM Generation Pattern

**Server-side rendering workflow:**
1. Plugin creates DOM builder instances (`new DOMText()`, `new DOMTable()`, etc.)
2. Calls builder methods to create elements with options (classes, styles, attributes, handlers)
3. Calls `DOM.renderHTML(elements)` to extract goober CSS and wrap content
4. Returns complete HTML string from `render()` method
5. Host injects HTML into WebView and applies extracted CSS

**Client-side helpers:**
The FDO host injects libraries and helpers into the WebView at runtime:
- JS libraries: Notyf, Highlight.js, ACE Editor, Split Grid, FontAwesome
- CSS frameworks: Pure CSS, Highlight.js themes, Notyf styles
- Window helpers: `createBackendReq()`, `waitForElement()`, `addGlobalEventListener()`, etc.

These are available in event handlers and `renderOnLoad()` scripts but NOT during server-side `render()`.

### Error Handling System

The SDK provides an `@handleError` decorator for automatic error handling:
- Catches errors in decorated methods
- Stores errors in a CircularBuffer (fixed-size, prevents memory leaks)
- Supports custom error UI rendering for `render()` methods
- Returns standardized `ErrorResult<T>` with `success`, `error`, `result` fields

Managed by `NotificationManager` singleton for error history and debugging.

## Important Patterns

### Plugin Structure
```typescript
export default class MyPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = { /* ... */ };
    
    get metadata(): PluginMetadata { return this._metadata; }
    
    init(): void {
        // Register message handlers here
        PluginRegistry.registerHandler("myAction", this.handleAction.bind(this));
    }
    
    render(): string {
        // Server-side HTML generation - return HTML string
        // Use DOM builder classes for type-safe HTML
        return DOM.renderHTML([/* DOM elements */]);
    }
    
    renderOnLoad(): string {
        // Return JavaScript code to execute when UI loads
        // Has access to window.* injected libraries
        return `() => { /* client-side JS */ }`;
    }
}
```

### Message Handler Registration
Handlers must be registered in `init()`, not `render()`:
```typescript
init(): void {
    PluginRegistry.registerHandler("handlerName", async (data) => {
        // Handler logic
        return { success: true, result: data };
    });
}
```

Handlers are called when UI sends messages via `window.createBackendReq("handlerName", data)`.

### UI Extension Points
Plugins can extend the FDO UI with:
- **Quick Actions**: Context menu items via `QuickActionMixin` and `defineQuickActions()`
- **Side Panel Items**: Sidebar entries via `SidePanelMixin` and `defineSidePanel()`

Both require implementing specific interfaces and registering handlers for their `message_type` values.

### Testing Considerations
- Tests use Jest with ts-jest preset
- Mock Electron's `process.parentPort` when testing Communicator
- Mock file system for StoreJson tests
- DOM builders output HTML strings - test with string assertions or HTML parsers
- Coverage threshold enforced at 80% - add tests for new features

## File Organization

```
src/
├── index.ts              # Main exports and global type declarations
├── FDO_SDK.ts            # Base plugin class (exported from index.ts)
├── Communicator.ts       # IPC message handling
├── PluginRegistry.ts     # Plugin instance and handler management
├── DOM*.ts               # Server-side HTML builders (Table, Input, Text, etc.)
├── Store*.ts             # Storage backends (Default, Json)
├── Logger.ts             # Winston-based logging
├── decorators/           # ErrorHandler decorator
└── utils/                # Atomic file writes, CircularBuffer, etc.

tests/                    # Jest tests (mirror src/ structure)
examples/                 # Numbered plugin examples (01-07) + legacy examples
docs/                     # INJECTED_LIBRARIES.md, QUICK_REFERENCE.md, error-handling.md
```

## Build Output

- `dist/fdo-sdk.bundle.js`: UMD bundle (main entry point, unminified for debugging)
- `dist/@types/`: TypeScript declaration files
- `dist/dom-metadata.json`: Extracted DOM class metadata (generated by webpack plugin)

The bundle uses `typeof self !== "undefined" ? self : this` as globalObject for compatibility with both browser and worker contexts.

## External Dependencies

Key runtime dependencies plugins can use:
- `electron`: For Electron API access (process.parentPort for IPC)
- `goober`: CSS-in-JS (used internally by DOM classes)
- `winston`: Logging (used by Logger class)
- `write-file-atomic`: Atomic file writes (used by StoreJson)

Note: Node.js built-ins (fs, path, os, etc.) are externalized in webpack config and resolved at runtime.

## Notes for AI Agents

- **Rendering context matters**: `render()` runs server-side (no `window`), `renderOnLoad()` and event handlers run client-side (have `window.*`)
- **Handler binding**: Always `.bind(this)` when passing class methods to `registerHandler()`
- **Storage keys**: Use namespaced keys like `"pluginName:category:key"` to avoid collisions
- **Error decorator**: Use `@handleError()` on methods that can fail; it returns `ErrorResult<T>` format
- **CSS extraction**: Call `DOM.renderHTML()` to extract goober-generated CSS; don't manually concatenate `<style>` tags
- **Injected libraries**: When plugin code references `window.Notyf`, `window.hljs`, etc., these exist in the WebView, not during server-side render
- **Testing async handlers**: Use `await` in tests when calling handlers registered with PluginRegistry
- **Webpack externals**: Don't try to bundle Electron or Node.js built-ins; they're resolved at runtime in the worker thread environment
