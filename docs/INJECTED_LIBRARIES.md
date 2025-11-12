# Injected Libraries and Helpers - Comprehensive AI-Ready Documentation

This document provides comprehensive information about all libraries, CSS frameworks, and helper functions that are automatically injected and available in FDO plugins. These resources are provided by the FDO application host environment and require **no imports or installations** - they are ready to use immediately in your plugin's render() output.

## Important Notes for AI Assistants

- **No imports needed**: All libraries listed here are pre-loaded in the browser environment
- **Usage context**: These are available in HTML/JavaScript rendered by your plugin's `render()` method
- **TypeScript support**: Type definitions are included in the SDK for `window.Notyf`, `window.hljs`, `window.ace`, and `window.Split`
- **Window object**: Helper functions are available on the global `window` object
- **Backend communication**: Use `PluginRegistry.registerHandler()` in `init()` and `window.createBackendReq()` in frontend code

## Table of Contents

- [CSS Libraries](#css-libraries)
- [JavaScript Libraries](#javascript-libraries)
- [Window Helper Functions](#window-helper-functions)
- [Usage Examples](#usage-examples)

## CSS Libraries

The following CSS libraries are automatically loaded in your plugin environment:

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

These helper functions are automatically injected into the `window` object and are available for use in your plugins' frontend JavaScript code (within `<script>` tags in your `render()` output).

### Communication Pattern

**Backend (Plugin Class):**
```typescript
import { PluginRegistry } from "@anikitenko/fdo-sdk";

class MyPlugin extends FDO_SDK {
    init(): void {
        // Register handlers in init(), NOT in render()
        PluginRegistry.registerHandler('handlerName', async (data) => {
            // Process data
            return { result: 'success', data: processedData };
        });
    }
}
```

**Frontend (In render() output):**
```html
<script>
    async function callBackend() {
        const result = await window.createBackendReq('handlerName', { 
            param: 'value' 
        });
        console.log(result); // { result: 'success', data: ... }
    }
</script>
```

### `createBackendReq(type, data)`

Creates a request to your plugin's backend handler. This is the primary mechanism for frontend-backend communication.

**Signature:**
```typescript
window.createBackendReq: (type: string, data?: any) => Promise<any>
```

**Parameters:**
- `type` (string, required): The handler name registered via `PluginRegistry.registerHandler()`
- `data` (any, optional): The data to send to the backend handler

**Returns:** `Promise<any>` - The value returned by the backend handler

**Important Notes:**
- Handlers must be registered in `init()` using `PluginRegistry.registerHandler(name, handler)`
- The handler name must exactly match the `type` parameter
- Handlers should be async functions or return Promises for async operations
- Always wrap in try-catch for error handling

**Example:**
```javascript
// Frontend call
try {
    const result = await window.createBackendReq('getUserData', { 
        userId: 123 
    });
    console.log(result.user); // Use the returned data
} catch (error) {
    console.error('Backend request failed:', error);
}
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

1. **Use TypeScript types:** The SDK provides TypeScript definitions for all window helper functions
2. **Error handling:** Always wrap backend requests in try-catch blocks
3. **Element waiting:** Use `waitForElement` instead of `setTimeout` for DOM-dependent code
4. **Cleanup:** Remove event listeners when they're no longer needed
5. **CSP Compliance:** Be aware of Content Security Policy restrictions in the plugin environment

## Additional Resources

- [Pure CSS Documentation](https://purecss.io/)
- [Highlight.js Documentation](https://highlightjs.org/)
- [Notyf Documentation](https://github.com/caroso1222/notyf)
- [FontAwesome Icons](https://fontawesome.com/icons)
- [Split Grid Documentation](https://github.com/nathancahill/split/tree/master/packages/splitjs)
- [ACE Editor Documentation](https://ace.c9.io/)

## SDK Core Patterns for AI Assistants

### Complete Plugin Structure

```typescript
import { 
    FDO_SDK, 
    FDOInterface, 
    PluginMetadata,
    PluginRegistry,
    DOMTable,
    DOMText,
    // ... other DOM helpers as needed
} from "@anikitenko/fdo-sdk";

export default class MyPlugin extends FDO_SDK implements FDOInterface {
    // 1. METADATA: Required, defines plugin information
    private readonly _metadata: PluginMetadata = {
        name: "My Plugin",
        version: "1.0.0",
        author: "Your Name",
        description: "Plugin description",
        icon: "🚀" // Can be emoji, path to image, or FA icon class
    };

    // 2. METADATA GETTER: Required
    get metadata(): PluginMetadata {
        return this._metadata;
    }

    // 3. INIT METHOD: Required - called once when plugin loads
    // NO PARAMETERS - the FDOInterface signature is init(): void
    init(): void {
        this.log("Plugin initialized!");
        
        // Register ALL backend handlers here
        PluginRegistry.registerHandler('handlerName', async (data) => {
            try {
                // Handle the request
                const result = await this.someBackendMethod(data);
                return { success: true, data: result };
            } catch (error) {
                this.error(error as Error);
                return { success: false, error: error.message };
            }
        });
    }

    // 4. RENDER METHOD: Required - returns HTML string
    render(): string {
        // Can use DOM helpers for type-safe HTML generation
        const domText = new DOMText();
        const heading = domText.createHeading("Hello World", 1);
        
        // Or return raw HTML
        return `
            <div class="my-plugin">
                ${heading}
                <button onclick="callBackend()">Click Me</button>
            </div>
            <script>
                async function callBackend() {
                    const result = await window.createBackendReq('handlerName', {
                        action: 'test'
                    });
                    console.log(result);
                }
            </script>
        `;
    }

    // 5. OPTIONAL: renderOnLoad() - returns JavaScript function as string
    // This function runs after the DOM is fully loaded
    renderOnLoad(): string {
        return `() => {
            console.log('Plugin UI loaded');
            // Initialization code here
        }`;
    }

    // 6. HELPER METHODS: Private methods for backend logic
    private async someBackendMethod(data: any): Promise<any> {
        // Backend logic here
        return { processed: data };
    }
}
```

### Handler Registration Pattern

**CORRECT:**
```typescript
init(): void {
    // Register in init()
    PluginRegistry.registerHandler('myHandler', async (data) => {
        return { result: 'processed' };
    });
}
```

**INCORRECT:**
```typescript
render(): string {
    // ❌ NEVER register handlers in render()
    PluginRegistry.registerHandler('myHandler', ...);
    return '<div>...</div>';
}
```

### Storage Patterns

```typescript
import { PluginRegistry, StoreType } from "@anikitenko/fdo-sdk";

// In init() or handler
init(): void {
    // Get storage backend (default: in-memory, or 'json' for file-based)
    const store: StoreType = PluginRegistry.useStore('json');
    
    // Store operations
    store.set('myKey', { data: 'value' });
    const data = store.get('myKey');
    store.remove('myKey');
    store.clear();
    
    // Check existence
    if (store.has('myKey')) {
        console.log('Key exists');
    }
    
    // Get all keys
    const keys = store.keys();
}
```

### DOM Helper Usage

```typescript
import { 
    DOMTable, 
    DOMText, 
    DOMButton, 
    DOMInput, 
    DOMLink,
    DOMMedia,
    DOMSemantic,
    DOMNested,
    DOMMisc
} from "@anikitenko/fdo-sdk";

render(): string {
    const domText = new DOMText();
    const domButton = new DOMButton("btn-id", {});
    const domTable = new DOMTable();
    
    // Create elements
    const heading = domText.createHeading("Title", 1, {
        classes: ['main-title'],
        style: { color: 'blue' }
    });
    
    const button = domButton.createButton(
        "Click Me",
        () => { console.log('clicked'); },
        { classes: ['pure-button', 'pure-button-primary'] }
    );
    
    // Table creation
    const headerRow = domTable.createTableRow([
        domTable.createTableHeader(["Name"]),
        domTable.createTableHeader(["Value"])
    ]);
    const thead = domTable.createTableHead([headerRow]);
    
    const dataRow = domTable.createTableRow([
        domTable.createTableCell(["Data 1"]),
        domTable.createTableCell(["Value 1"])
    ]);
    const tbody = domTable.createTableBody([dataRow]);
    
    const table = domTable.createTable([thead, tbody], {
        classes: ['pure-table', 'pure-table-bordered']
    });
    
    return `
        ${heading}
        ${button}
        ${table}
    `;
}
```

### Quick Actions and Side Panel (Mixins)

```typescript
import { 
    FDO_SDK, 
    FDOInterface,
    QuickActionMixin,
    SidePanelMixin,
    QuickAction,
    SidePanelConfig,
    PluginRegistry
} from "@anikitenko/fdo-sdk";

// Apply mixins using type intersection
interface MyPlugin extends QuickActionMixin, SidePanelMixin {}

class MyPlugin extends FDO_SDK implements FDOInterface {
    // Apply mixins
    constructor() {
        super();
        Object.assign(this, QuickActionMixin);
        Object.assign(this, SidePanelMixin);
    }

    init(): void {
        // Register handlers for quick actions
        PluginRegistry.registerHandler('quickAction1', async () => {
            return { message: 'Quick action executed' };
        });
    }

    // Define quick actions
    defineQuickActions(): QuickAction[] {
        return [
            {
                name: "Quick Action 1",
                message_type: "quickAction1",
                subtitle: "Does something quickly",
                icon: "⚡"
            }
        ];
    }

    // Define side panel
    defineSidePanel(): SidePanelConfig {
        return {
            icon: "📋",
            label: "My Plugin",
            submenu_list: [
                {
                    id: "item1",
                    name: "Menu Item 1",
                    message_type: "menuAction1"
                }
            ]
        };
    }

    render(): string {
        return '<div>Plugin content</div>';
    }
}
```

### Error Handling Pattern

```typescript
import { ErrorHandler } from "@anikitenko/fdo-sdk";

class MyPlugin extends FDO_SDK {
    init(): void {
        PluginRegistry.registerHandler('riskyOperation', async (data) => {
            try {
                const result = await this.performRiskyOperation(data);
                return { success: true, result };
            } catch (error) {
                // Log error using SDK logger
                this.error(error as Error);
                
                // Return error response
                return { 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        });
    }

    // Use @ErrorHandler decorator for automatic error handling
    @ErrorHandler()
    private async performRiskyOperation(data: any): Promise<any> {
        // This method is wrapped with error handling
        // Errors are automatically logged
        throw new Error('Something went wrong');
    }
}
```

### Common Patterns Summary

1. **Plugin Structure**: Class extends `FDO_SDK` and implements `FDOInterface`
2. **Metadata**: Required `_metadata` property and `metadata` getter
3. **Lifecycle**: `init()` with no parameters, `render()` returns HTML string
4. **Handlers**: Register in `init()` with `PluginRegistry.registerHandler(name, handler)`
5. **Frontend-Backend**: Use `window.createBackendReq(handlerName, data)` in rendered JS
6. **Storage**: Use `PluginRegistry.useStore('json')` for persistence
7. **DOM Creation**: Use DOM helper classes for type-safe HTML generation
8. **Styling**: Use Pure CSS classes, goober CSS-in-JS, or inline styles
9. **Notifications**: Use `new Notyf()` in rendered JavaScript
10. **Code Display**: Use `hljs.highlightAll()` or `ace.edit()` for code

### TypeScript Configuration for Plugins

When developing plugins, use this tsconfig.json:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules"]
}
```

## Updated Additional Resources

- [Pure CSS Documentation](https://purecss.io/)
- [Highlight.js Documentation](https://highlightjs.org/)
- [Notyf Documentation](https://github.com/caroso1622/notyf)
- [FontAwesome Icons](https://fontawesome.com/icons)
- [Split Grid Documentation](https://github.com/nathancahill/split/tree/master/packages/splitjs)
- [ACE Editor Documentation](https://ace.c9.io/)
- [FDO SDK GitHub Repository](https://github.com/anikitenko/fdo-sdk)
- [FDO SDK Homepage](https://plugins.fdo.alexvwan.me)
