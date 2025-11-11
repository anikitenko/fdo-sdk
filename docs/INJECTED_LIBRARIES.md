# Injected Libraries and Helpers

This document describes all the libraries, CSS frameworks, and helper functions that are automatically available in your FDO plugins. These are injected by the FDO application host and can be used without any additional imports.

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
