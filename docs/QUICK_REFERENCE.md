# Quick Reference: Injected Libraries

This is a quick reference for developers who want to quickly look up available libraries and their basic usage.

## Window Helpers (Always Available)

```typescript
// Backend Communication
const response = await window.createBackendReq('methodName', { data });

// DOM Utilities
window.waitForElement('#my-element', (el) => { /* ... */ });
window.applyClassToSelector('my-class', '#target');
window.executeInjectedScript('console.log("hello")');

// Event Management
window.addGlobalEventListener('click', handler);
window.removeGlobalEventListener('click', handler);
```

## CSS Libraries (Already Loaded)

### Pure CSS
```html
<div class="pure-g">
  <div class="pure-u-1-2">Column 1</div>
  <div class="pure-u-1-2">Column 2</div>
</div>
<button class="pure-button pure-button-primary">Click</button>
```

## JavaScript Libraries

### Notyf (Notifications)
```javascript
const notyf = new Notyf();
notyf.success('Success!');
notyf.error('Error!');
```

### Highlight.js (Syntax Highlighting)
```html
<pre><code class="language-javascript">
const code = "example";
</code></pre>
<script>hljs.highlightAll();</script>
```

### FontAwesome (Icons)
```html
<i class="fas fa-home"></i>        <!-- Solid -->
<i class="far fa-star"></i>        <!-- Regular -->
<i class="fab fa-github"></i>      <!-- Brands -->
```

### ACE Editor (Code Editor)
```javascript
const editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/javascript");
editor.setValue("const x = 1;");
```

### Split Grid (Resizable Panels)
```javascript
Split({
  columnGutters: [{ track: 1, element: document.querySelector('.gutter') }]
});
```

## Full Documentation

For complete documentation with examples, see [INJECTED_LIBRARIES.md](./INJECTED_LIBRARIES.md)
