# Render Runtime Contract

This document defines the real runtime contract for FDO plugins built with `@anikitenko/fdo-sdk`.

## Short Version

- Your plugin class runs in the plugin backend/runtime.
- Your plugin UI runs in a sandboxed iframe host managed by FDO.
- `render()` returns UI source for the FDO iframe pipeline.
- That output is not the same thing as raw `innerHTML` inserted directly into the host page.
- SDK DOM helpers generate raw HTML strings intended for that iframe-hosted render pipeline.

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

For DOM helpers specifically:

- helper APIs may accept compatibility aliases like `className`, `htmlFor`, and `readOnly`
- emitted helper output should still use raw HTML attribute names like `class`, `for`, and `readonly`
- when both forms are supplied, the native HTML form wins explicitly so output does not depend on object key iteration order

## JSX-Compatibility Rules For `render()`

In practice, the FDO host transform treats `render()` output as JSX-compatible UI source, not as unconstrained raw `innerHTML`.

That means some markup that would be valid in loose HTML can still fail in the host render pipeline.

Common failure cases:

- raw void tags such as `<br>` instead of `<br />`
- raw `<style>` blocks inside `render()`
- literal JavaScript/object syntax inside `<code>` blocks without escaping JSX-sensitive characters
- other raw text that contains unescaped `{` / `}` in JSX-visible positions
- display-only strings that match host fail-fast guard patterns, for example sensitive runtime tokens such as `process.` or other blocked runtime-access markers
- raw JSON or object-literal content embedded directly into JSX-visible markup, especially inside `<pre>` blocks

Practical rules:

- prefer JSX-safe void tags such as `<br />`
- avoid inline `<style>` blocks in `render()`; prefer DOM helpers plus `renderHTML(...)`, host CSS classes, or inline element styles when needed
- if you show code samples in `<code>` or `<pre>` blocks, escape literal braces as `&#123;` and `&#125;`
- avoid embedding raw guard-sensitive runtime tokens in display text when a plain-language description is enough
- if you want to show structured JSON results, render a safe placeholder first and populate the result panel after iframe initialization through backend/UI calls
- do not assume "browser HTML parsing would accept this" means the FDO host transform will accept it

Example: use JSX-safe markup

```ts
render(): string {
  return `
    <div>
      <strong>Status</strong><br />
      Ready
    </div>
  `;
}
```

Example: escape code-sample braces

```ts
render(): string {
  return `
    <pre><code class="language-javascript">function greet(name) &#123;
  return "Hello";
&#125;</code></pre>
  `;
}
```

Do not rely on this shape:

```ts
render(): string {
  return `
    <style>
      .demo { padding: 20px; }
    </style>
    <pre><code>function greet(name) { return "Hello"; }</code></pre>
  `;
}
```

Another practical example:

```ts
render(): string {
  return `
    <p>Declared capabilities: broad host tool execution plus the narrow Docker CLI scope.</p>
  `;
}
```

Prefer that over embedding raw display text such as:

```ts
render(): string {
  return `
    <p><code>["system.process.exec", "system.process.scope.docker-cli"]</code></p>
  `;
}
```

Even though that second example is only display text, some host fail-fast guards may conservatively match the `process.` token and reject the render source.

For JSON/result panels, prefer this shape:

```ts
render(): string {
  return `
    <pre id="result-box">Snapshot will load after initialization...</pre>
  `;
}

renderOnLoad(): string {
  return `
    (() => {
      const output = document.getElementById("result-box");
      // fetch data through UI_MESSAGE and then:
      output.textContent = JSON.stringify({ ok: true }, null, 2);
    })();
  `;
}
```

Do not rely on embedding raw JSON directly in `render()`:

```ts
render(): string {
  return `
    <pre>{ "ok": true }</pre>
  `;
}
```

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

If helper-generated output uses goober-backed styles/classes, `renderHTML(...)` is mandatory on the final render output. Without it, the helper-generated class names can be present while the extracted CSS is missing from the returned UI string.

Practical rule:

- helper-composed styled output: `return helper.renderHTML(content)`
- plain manual JSX-like markup with no helper-generated styling: return the markup directly

## Trusted Markup vs Safe Text

The DOM builder supports two different content models:

- trusted markup composition: generic helpers like `DOM.createElement(...)` accept `children` as already-formed JSX-like fragments
- safe text composition: `DOMText` APIs escape JSX-sensitive characters for text-node contexts

Practical rule:

- use `DOMText.createText(...)` and related `DOMText` methods for user-provided or untrusted text
- use raw `children` in generic DOM helpers only for trusted plugin-authored markup fragments

The SDK does not treat arbitrary raw `children` strings as a security boundary by itself. Host-side iframe sandboxing and message validation remain the boundary.

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

### Third-Party Imports In UI Runtime

`render()` and `renderOnLoad()` run inside the FDO iframe runtime wrapper. They are not a general npm module loader.

Rules:

- Do not assume arbitrary third-party `import`/`require` works in iframe UI code.
- Use only host-injected globals and helpers documented by FDO/SDK.
- If a new UI library is needed, it must be added by FDO host injection policy first, then documented.

Backend/runtime plugin code (outside iframe UI) can still import normal npm modules as part of the plugin build artifact.

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
- When DOM helpers generate styled output, call `renderHTML(...)` on the final helper markup before returning from `render()`.
- Do not move UI-runtime assumptions into backend/bootstrap code.

## Guidance For AI Tools

When generating or refactoring FDO plugins:

- do not describe the plugin UI as only "plain HTML"
- do not claim unrestricted React/Electron/Node access from UI code
- preserve the current workspace's render convention
- distinguish backend runtime from iframe runtime explicitly
