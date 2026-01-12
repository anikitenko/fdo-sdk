## Injected Libraries and Host-provided Helpers

This SDK renders HTML strings server-side. The FDO host application injects several libraries and helper functions into the client-side runtime (the WebView/UI where your rendered HTML runs). You can access them via `window.*` in event handlers or your `renderOnLoad()` script.

### Availability
- The following globals exist only in the UI context (browser/WebView), not during server-side render.
- Use them inside DOM event handlers (e.g., `onClick`) or code returned by `renderOnLoad()`.

### JavaScript Libraries
- Notyf (toast notifications): `window.Notyf`
- Highlight.js (syntax highlighting): `window.hljs`
- ACE Editor: `window.ace`
- Split Grid (resizable CSS grid gutters): `window.Split(options)`
- FontAwesome (icons) is available via injected styles. Use standard `<i class="fa ...">`.

Goober (CSS-in-JS) is used by the SDK during server-side rendering and is not exposed on `window`.

### Host Helper APIs on window
The host injects these helpers for plugin UI code:
- `window.createBackendReq(type: string, data?: any): Promise<any>`
- `window.addGlobalEventListener(eventType: keyof WindowEventMap, callback: (event: Event) => void): void`
- `window.removeGlobalEventListener(eventType: keyof WindowEventMap, callback: (event: Event) => void): void`
- `window.waitForElement(selector: string, callback: (element: Element) => void, timeout?: number): void`
- `window.executeInjectedScript(scriptContent: string): void`
- `window.applyClassToSelector(className: string, selector: string): void`

### Quick usage examples

Notifications (Notyf):
```javascript
const notyf = new window.Notyf({ duration: 2500, dismissible: true });
notyf.success("Saved!");
notyf.error({ message: "Something went wrong", className: "my-error" });
```

Syntax highlighting (Highlight.js):
```javascript
window.hljs.highlightAll(); // after you insert code blocks into the DOM
```

ACE Editor:
```javascript
const editor = window.ace.edit("editor", { theme: "ace/theme/monokai" });
editor.getSession().setMode("ace/mode/json");
editor.setValue("{\n  \"hello\": \"world\"\n}", -1);
```

Split Grid:
```javascript
const instance = window.Split({
  columnGutters: [{ element: document.querySelector(".gutter-col-1"), track: 1 }],
  minSize: 100,
  onDrag: (_dir, _track, css) => console.log(css),
});
// instance.addColumnGutter(el, 2); instance.destroy();
```

Backend requests from UI:
```javascript
async function loadData() {
  const res = await window.createBackendReq("fetchSomething", { id: 42 });
  console.log("Backend response:", res);
}
```

Global listeners and DOM helpers:
```javascript
function onResize(e) { console.log("resized", e); }
window.addGlobalEventListener("resize", onResize);
window.waitForElement("#mount", (el) => el.classList.add("ready"));
window.applyClassToSelector("highlight", "pre code");
```

Execute dynamic script in page:
```javascript
window.executeInjectedScript(`
  console.log("Hello from injected script");
`);
```

### Notes
- Treat these as ambient globals provided by the host. You do not need to import them.
- Prefer calling them from `renderOnLoad()` or event handlers returned by your DOM builders (`onClick`, `onChange`, etc.).

# Injected Libraries and Helpers

This document describes all the libraries, CSS frameworks, and helper functions that are automatically available in your FDO plugins. These are injected by the FDO application host and can be used without any additional imports.

## Table of Contents

- [CSS Libraries](#css-libraries)
- [JavaScript Libraries](#javascript-libraries)
- [Window Helper Functions](#window-helper-functions)
- [Usage Examples](#usage-examples)

## CSS Libraries

The following CSS libraries are automatically loaded in your plugin environment:

### CSS Modules / Importing CSS as Objects (host-dependent)

If the host UI build enables CSS Modules (or CSS imports), you can import styles and reference class names programmatically:

```javascript
// Example (host must have a CSS loader or equivalent compile-time hook)
import styles from "./panel.css"; // default export of an object produced by the host

function renderPanel() {
  return `
    <div class="${styles.container}">
      <button class="${styles.button}">Click</button>
    </div>
  `;
}
```

Notes and limitations:
- Availability depends on the host build tooling, not the SDK. This SDK’s webpack config does not process `.css` files. The host transforms CSS to a JSON-like JS object (`export default {...}`).
- The imported object maps selectors to nested style objects (SCSS-like) that can be passed into the SDK’s goober wrapper via `DOM.createClassFromStyle(...)`.
- SCSS syntax is not parsed; instead, plain CSS is converted into an object with limited SCSS-like nesting semantics (see below).
- Since plugins render HTML strings server-side, the generated class from `createClassFromStyle()` will inject CSS at render time. If you rely on host-provided global CSS, you can still use className strings directly.

#### Supported CSS in imports (host transformation)
The host’s CSS transformer (based on MDN property metadata and HTML tag lists) converts plain CSS into a nested object with SCSS-like semantics:

- Top-level class selectors:
  - `.button { color: red; }` → `styles.button = { color: 'red' }`
- Class composition:
  - `.button.primary { ... }` → merged under base: `styles.button['&.primary'] = { ... }`
- Pseudo-classes/elements:
  - `.button:hover { ... }` → `styles.button[':hover'] = { ... }`
  - `.toggle::before { ... }` → `styles.toggle['::before'] = { ... }`
- Attribute selectors and combinators:
  - `.toggle:checked + .label { ... }` → `styles.toggle[':checked + .label'] = { ... }`
  - `.item > .icon { ... }` will be preserved; depending on structure it may appear as a standalone key if it cannot be merged safely into a base.
- Nested-looking rules are inferred:
  - Keys that look like class names inside an object get prefixed as variants: `styles.base['&.modifier'] = {...}`
- `@import` is supported and resolved/merged by the host before export.
- Comments are stripped, whitespace normalized, and missing `;` before `}` is auto-fixed for compressed inputs.

Limitations:
- Media queries, keyframes, and at-rules:
  - `@media`, `@keyframes`, and other `@...` blocks are preserved as top-level entries and are not deeply merged into base classes. Programmatic consumption may be awkward; prefer static/global CSS for complex responsive rules or define variants via goober.
- Comma-separated selectors:
  - Rules like `.a, .b { ... }` are not split; they may appear as a single combined key. Prefer one selector per block for predictable structure.
- Non-class bases:
  - ID and tag selectors are preserved but merging behavior focuses on class-based bases; nested heuristics prioritize class selectors.
- This is not a full CSS/SCSS parser:
  - The object format aims to be ergonomic for goober, not a perfect AST. Avoid exotic selector tricks when you plan to consume styles programmatically.

#### Consuming imported CSS with the SDK
You can pass the imported style object (or any nested variant) directly to the SDK’s goober wrapper to obtain a runtime class:

```typescript
import styles from "./toggle.css";
import { DOM, DOMNested } from "@anikitenko/fdo-sdk";

const dom = new DOM();
const boxClass = dom.createClassFromStyle(styles.toggle);             // base
const boxChecked = dom.createClassFromStyle({                         // base + pseudo
  ...styles.toggle,
  ...styles.toggle[":checked"], // example if exists
});

const container = new DOMNested().createBlockDiv(
  [
    // ...
  ],
  {
    classes: [boxClass], // apply generated class
  }
);
```

### Pure CSS (purecss.io)

A set of small, responsive CSS modules that you can use in every web project.

**Available Classes:**
- `.pure-g` - Grid container
- `.pure-u-*` - Grid units (e.g., `.pure-u-1-2` for 50% width)
- `.pure-button` - Button styles
- `.pure-form` - Form layouts
- `.pure-table` - Table styles
- `.pure-menu` - Menu/navigation styles

**Example:**
```html
<div class="pure-g">
    <div class="pure-u-1-2">Half width column</div>
    <div class="pure-u-1-2">Half width column</div>
</div>
```

### Highlight.js

Syntax highlighting for code blocks with the "VS" theme.

**Usage:**
```html
<pre><code class="language-javascript">
const hello = "world";
</code></pre>
<script>hljs.highlightAll();</script>
```

**Available via:**
- CSS: Pre-loaded VS theme
- JS: `window.hljs` object

### Notyf

Modern notification library for displaying toast messages.

**Available via:**
- CSS: Pre-loaded styles
- JS: `window.Notyf` class

**Example:**
```javascript
const notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' }
});
notyf.success('Operation successful!');
notyf.error('Something went wrong!');
```

## JavaScript Libraries

### FontAwesome

Complete icon library with all icon sets (solid, regular, brands).

**Available Sets:**
- FontAwesome Solid
- FontAwesome Regular
- FontAwesome Brands

**Usage:**
```html
<i class="fas fa-home"></i>
<i class="far fa-star"></i>
<i class="fab fa-github"></i>
```

### Split Grid

Advanced grid splitter for creating resizable layouts.

**Available via:** `window.Split` function

**Example:**
```javascript
Split({
    columnGutters: [{
        track: 1,
        element: document.querySelector('.gutter-col-1'),
    }],
    rowGutters: [{
        track: 1,
        element: document.querySelector('.gutter-row-1'),
    }]
});
```

### Goober

Lightweight CSS-in-JS library (already exposed via SDK's DOM classes).

**Available via:** `window.goober`

**Note:** While goober is loaded, the SDK's DOM classes provide a more convenient interface for styling. Refer to the SDK documentation for usage.

### ACE Editor

Powerful code editor component.

**Available via:** `window.ace`

**Example:**
```javascript
const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/javascript");
```

## Window Helper Functions

These helper functions are automatically injected into the `window` object and are available for use in your plugins.

### `createBackendReq(type, data)`

Creates a request to your plugin's backend handler.

**Parameters:**
- `type` (string): The function name to call on the backend
- `data` (any, optional): The data to send to the backend

**Returns:** `Promise<any>` - The response from the backend

**Example:**
```javascript
const result = await window.createBackendReq('getUserData', { userId: 123 });
console.log(result);
```

### `waitForElement(selector, callback, timeout)`

Waits for an element to appear in the DOM.

**Parameters:**
- `selector` (string): CSS selector for the element
- `callback` (function): Callback function called when element is found
- `timeout` (number, optional): Timeout in milliseconds (default: 5000)

**Example:**
```javascript
window.waitForElement('#my-dynamic-element', (element) => {
    console.log('Element found:', element);
    element.style.color = 'red';
}, 10000);
```

### `executeInjectedScript(scriptContent)`

Executes a script in the plugin context.

**Parameters:**
- `scriptContent` (string): The JavaScript code to execute

**Example:**
```javascript
window.executeInjectedScript(`
    console.log('This code runs in the plugin context');
    // Your dynamic script here
`);
```

### `addGlobalEventListener(eventType, callback)`

Adds a global event listener to the window.

**Parameters:**
- `eventType` (string): The event type (e.g., 'click', 'keydown')
- `callback` (function): The event handler function

**Example:**
```javascript
window.addGlobalEventListener('resize', (event) => {
    console.log('Window resized:', window.innerWidth, window.innerHeight);
});
```

### `removeGlobalEventListener(eventType, callback)`

Removes a global event listener from the window.

**Parameters:**
- `eventType` (string): The event type
- `callback` (function): The event handler function to remove

**Example:**
```javascript
const handleResize = (event) => {
    console.log('Resize event');
};

window.addGlobalEventListener('resize', handleResize);
// Later...
window.removeGlobalEventListener('resize', handleResize);
```

### `applyClassToSelector(className, selector)`

Applies a CSS class to an element matching the selector.

**Parameters:**
- `className` (string): The CSS class name to add
- `selector` (string): CSS selector for the target element

**Example:**
```javascript
window.applyClassToSelector('highlight', '#my-element');
```

## Usage Examples

### Example 1: Creating a Notification System

```javascript
export default class NotificationPlugin extends FDO_SDK {
    render() {
        return `
            <div>
                <button onclick="showSuccess()">Show Success</button>
                <button onclick="showError()">Show Error</button>
            </div>
            <script>
                const notyf = new Notyf({
                    duration: 3000,
                    position: { x: 'right', y: 'top' }
                });
                
                function showSuccess() {
                    notyf.success('Operation completed successfully!');
                }
                
                function showError() {
                    notyf.error('An error occurred!');
                }
            </script>
        `;
    }
}
```

### Example 2: Code Editor with Syntax Highlighting

```javascript
export default class CodeEditorPlugin extends FDO_SDK {
    render() {
        return `
            <div id="editor" style="height: 400px;"></div>
            <script>
                window.waitForElement('#editor', (element) => {
                    const editor = ace.edit("editor");
                    editor.setTheme("ace/theme/monokai");
                    editor.session.setMode("ace/mode/javascript");
                    editor.setValue("// Start coding...");
                });
            </script>
        `;
    }
}
```

### Example 3: Responsive Grid Layout

```javascript
export default class GridLayoutPlugin extends FDO_SDK {
    render() {
        return `
            <div class="pure-g">
                <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                    <div class="pure-button">Column 1</div>
                </div>
                <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                    <div class="pure-button">Column 2</div>
                </div>
                <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                    <div class="pure-button">Column 3</div>
                </div>
            </div>
        `;
    }
}
```

### Example 4: Backend Communication

```javascript
export default class DataPlugin extends FDO_SDK {
    async fetchData() {
        const data = await window.createBackendReq('getData', { 
            filter: 'active' 
        });
        return data;
    }
    
    render() {
        return `
            <div id="data-container">Loading...</div>
            <script>
                window.waitForElement('#data-container', async (element) => {
                    try {
                        const data = await window.createBackendReq('getData', { 
                            filter: 'active' 
                        });
                        element.innerHTML = JSON.stringify(data, null, 2);
                    } catch (error) {
                        element.innerHTML = 'Error loading data';
                    }
                });
            </script>
        `;
    }
}
```

### Example 5: Split Panel Layout

```javascript
export default class SplitPanelPlugin extends FDO_SDK {
    render() {
        return `
            <style>
                .grid {
                    display: grid;
                    grid-template-columns: 1fr 10px 1fr;
                    height: 400px;
                }
                .gutter {
                    background-color: #ccc;
                    cursor: col-resize;
                }
                .panel {
                    padding: 20px;
                    overflow: auto;
                }
            </style>
            <div class="grid">
                <div class="panel">Left Panel</div>
                <div class="gutter gutter-col-1"></div>
                <div class="panel">Right Panel</div>
            </div>
            <script>
                Split({
                    columnGutters: [{
                        track: 1,
                        element: document.querySelector('.gutter-col-1'),
                    }]
                });
            </script>
        `;
    }
}
```

## Best Practices

- **Separate SSR from UI code**: The SDK builds HTML on the server. Only reference `window.*` from event handlers or `renderOnLoad()`, never from `render()`.
- **Prefer renderOnLoad for orchestration**: Keep inline handlers small; do heavier client logic in `renderOnLoad()` and call it from handlers.
- **Use backend IPC for side effects**: From the UI, prefer `createBackendReq("action", payload)` for filesystem/process work. Always `try/catch` and show a toast on error.
- **Debounce/throttle listeners**: When attaching global listeners (e.g., resize/scroll), debounce to avoid heavy UI work.
- **Highlight.js after DOM updates**: Call `hljs.highlightAll()` once your code blocks are inserted or changed.
- **ACE editor sizing**: Ensure the editor container has an explicit height and call `editor.resize()` if the container resizes.
- **Split grid lifecycle**: Create a single `Split(...)` instance per view and call `instance.destroy()` when replacing the layout.
- **Accessibility first**:
  - Always provide `alt` for images.
  - Use semantic tags (`main`, `nav`, `header`, `footer`) from `DOMSemantic`.
  - Use labels and `aria-*` attributes for inputs and interactive controls.
- **Sanitize dynamic HTML**: Children passed to DOM builders are inserted as-is. Sanitize or escape any user-generated content before injecting.
- **Prefer classes over inline styles**: Use the SDK’s goober integration (`style` -> class) rather than large inline `style` strings for better reuse and readability.
- **Deterministic selectors**: Use stable `id`/`className` if your `renderOnLoad()` or handlers query elements later; avoid random IDs when you need to re-select.
- **Storage**:
  - Use `PluginRegistry.useStore("default" | "json")` for simple persistence.
  - Do not store secrets in the JSON store; keep sensitive data in memory only.
- **Error handling pattern**:
  - Wrap UI `await` calls with `try/catch` and notify via Notyf.
  - On the server side, use the `@handleError` decorator to standardize responses and error UIs.
- **IPC handlers**:
  - Keep handlers fast and return structured results `{ success, result | error }`.
  - Offload long-running work, stream progress if needed via additional messages.
- **Security**:
  - Never pass untrusted code to `executeInjectedScript`.
  - Don’t interpolate unsanitized strings into `<script>` blocks or event handlers.
- **CSS extraction note**: `DOM.renderHTML()` injects extracted CSS. Ensure your host interprets it as a normal `<style>` block; avoid exotic templating in style tags.

## Additional Resources

- [Pure CSS Documentation](https://purecss.io/)
- [Highlight.js Documentation](https://highlightjs.org/)
- [Notyf Documentation](https://github.com/caroso1222/notyf)
- [FontAwesome Icons](https://fontawesome.com/icons)
- [Split Grid Documentation](https://github.com/nathancahill/split/tree/master/packages/splitjs)
- [ACE Editor Documentation](https://ace.c9.io/)
