# Safe Plugin Authoring

This guide is for plugin authors building on `@anikitenko/fdo-sdk`.

## Runtime Separation

- Backend runtime:
  - plugin class lifecycle (`init`, handlers, storage, logging)
- Iframe UI runtime:
  - rendered UI source and browser-side helpers

Do not assume iframe-only globals are available in backend/bootstrap paths.

## Markup and Text Safety

- Treat `DOM.createElement(..., ...children)` children as trusted JSX-like markup fragments.
- For untrusted/user-provided text, use `DOMText` helpers (`createText`, `createPText`, `createSpanText`, etc.) so JSX-sensitive characters are escaped.
- Do not pass unsanitized user input as raw child markup into generic DOM helpers.
- DOM helpers emit raw HTML attributes in the final string. Compatibility aliases such as `className`, `htmlFor`, and `readOnly` are accepted on input and normalized to `class`, `for`, and `readonly` in output.
- When both forms are provided, the native HTML form wins explicitly: `class` over `className`, `for` over `htmlFor`, and `readonly` over `readOnly`.

## DOM Helper Rule: `renderHTML()` Is Mandatory For Styled Helper Output

If your `render()` method uses SDK DOM helpers and expects goober-backed styling/classes to appear in the output, you must wrap the final helper markup with `renderHTML(...)`.

Why this is mandatory:

- DOM helpers generate class names through goober
- those class names are not enough by themselves
- the extracted CSS must be emitted into the render output alongside the markup
- `renderHTML(...)` is the SDK helper that emits that CSS and the expected script placeholder boundary

Do this:

```ts
render(): string {
  const semantic = new DOMSemantic();
  const text = new DOMText();

  const content = semantic.createMain([
    text.createHText(1, "Styled helper UI"),
  ]);

  return semantic.renderHTML(content);
}
```

Do not do this for styled helper output:

```ts
render(): string {
  const semantic = new DOMSemantic();
  return semantic.createMain([/* ... */]);
}
```

Best practices:

- build the full helper-composed UI first, then call `renderHTML(...)` once on the final root content
- use the same helper instance for composition and `renderHTML(...)` when practical
- keep `renderHTML(...)` in `render()`, not in `renderOnLoad()`
- if you are returning plain manual JSX-like markup with no DOM-helper styling/classes, `renderHTML(...)` is not required

## Logging In Plugins

Use the built-in `FDO_SDK` logging methods from your plugin class:

- `this.log(message)`
- `this.info(message, ...meta)`
- `this.warn(message, ...meta)`
- `this.debug(message, ...meta)`
- `this.verbose(message, ...meta)`
- `this.silly(message, ...meta)`
- `this.error(error)`
- `this.event(name, payload)` returns a correlation ID
- `this.getLogDirectory()` resolves the current log directory for the plugin

Example:

```typescript
init(): void {
    this.info("Plugin init", { plugin: this.metadata.name });
    const correlationId = this.event("plugin.init.custom", { phase: "start" });
    this.debug("init event emitted", { correlationId });
}
```

Log destination:

- `FDO_SDK_LOG_ROOT` configures log root directory
- default root is `./logs`
- log files are written directly into the configured log directory
- in FDO host runtime this is typically `PLUGIN_HOME/logs/`
- plugin identity is preserved in structured log metadata rather than an extra nested log folder

## Privileged Error Formatting Rule

Do not surface raw `response.error` only. Use the SDK formatter so users see correlation IDs and host process details (`stderr`, `stdout`, `exitCode`, `command`, `cwd`) when present.

Use in normal runtime code:

```ts
const message = formatPrivilegedActionError(response, {
  context: "Operator request failed",
  fallbackCorrelationId: envelopeCorrelationId,
});
```

Use in `renderOnLoad()` string runtimes:

```ts
const formatPrivilegedActionErrorSource = getInlinePrivilegedActionErrorFormatterSource();
return `
(() => {
  const formatPrivilegedActionError = ${formatPrivilegedActionErrorSource};
  // use formatter for all non-ok privileged responses
})();
`;
```

Preferred authoring form when possible:

```ts
renderOnLoad() {
  return defineRenderOnLoad(() => {
    // browser-only UI logic
  }, { language: "typescript" });
}
```

The SDK normalizes this to string source at transport boundary, so host behavior remains compatible while plugin authoring stays typed.

When `renderOnLoad()` needs multiple UI bindings, prefer `defineRenderOnLoadActions(...)` over hand-written long listener strings. It gives typed handler/binding configuration and consistent runtime guard behavior (selector mismatch, unknown handler id, async handler failure).

Production baseline for new plugins:

- Default to `defineRenderOnLoadActions(...)` for event wiring.
- Use `strict: true` so missing selectors and unknown handlers fail fast during development.
- Keep `setup` focused on state/bootstrap only; put user interactions in declarative `bindings`.

```ts
renderOnLoad() {
  return defineRenderOnLoadActions({
    handlers: {
      runStatus: async () => {
        await window.createBackendReq("UI_MESSAGE", {
          handler: "gitOps.v1.runStatus",
          content: {},
        });
      },
    },
    bindings: [
      { selector: "#git-run-status", event: "click", handler: "runStatus", preventDefault: true, required: true },
    ],
    strict: true,
    language: "typescript",
  });
}
```

For host/editor template pickers, use `listRenderOnLoadTemplates(...)` and `getRenderOnLoadTemplate(id)` instead of hardcoded renderOnLoad snippets.

For host UX that needs deterministic “copy exact fix” guidance by error code, use:

- `getDiagnosticFixTemplate(code)`
- `formatDiagnosticExactFix(code)`

These helpers provide stable remediation templates for common failure codes such as capability denial, process spawn/exit failures, empty backend responses, and handshake compatibility issues.

## Metadata Rules

- Define full `metadata` (`name`, `version`, `author`, `description`, `icon`)
- `metadata.icon` must be a valid BlueprintJS v6 icon name
- Prefer setting `metadata.id` for stable plugin-scoped storage/logging paths

## Storage Rules

- Use `PluginRegistry.useStore("default")` for in-memory scoped data
- Use `PluginRegistry.useStore("json")` for persistent scoped data
- Configure JSON storage root:
  - `PluginRegistry.configureStorage({ rootDir })`
  - or `FDO_SDK_STORAGE_ROOT`

If storage root is missing, JSON store requests throw by design.

Initialization order safety (critical):

- Do not call `PluginRegistry.useStore(...)` in class-field initializers.
- Acquire stores lazily (helper getter) or inside `init()`/handlers after metadata is ready.
- Reason: some host/runtime validations read plugin metadata during store acquisition. If store calls run before metadata assignment, startup can fail with errors like `Plugin metadata must be an object.` and terminate the plugin process.

Recommended pattern:

```ts
private sessionStore?: StoreType;

private getSessionStore(): StoreType {
  if (!this.sessionStore) {
    this.sessionStore = PluginRegistry.useStore("default");
  }
  return this.sessionStore;
}

init(): void {
  const store = this.getSessionStore();
  // use store safely here
}
```

## Capability Grants (Host-Managed)

Privileged SDK features are capability-gated. The host should grant capabilities at init-time through `PLUGIN_INIT.content.capabilities`.

- `storage`:
  base storage capability family; required with any concrete storage backend capability
- `storage.json`:
  JSON backend leaf capability; required with `storage` for `PluginRegistry.useStore("json")`
- `system.network`:
  base network capability family; required with concrete network transport capabilities
- `system.network.https`:
  required for outbound HTTPS requests (for example `fetch("https://...")`)
- `system.network.http`:
  required for outbound plaintext HTTP requests (for example `fetch("http://...")`)
- `system.network.websocket`:
  required for outbound `WebSocket` usage
- `system.network.tcp`:
  required for raw TCP socket modules/APIs
- `system.network.udp`:
  required for raw UDP socket modules/APIs
- `system.network.dns`:
  required for DNS modules/APIs
- `sudo.prompt`:
  required for `runWithSudo(...)`
- `system.clipboard.read`:
  required for host-mediated clipboard reads
- `system.clipboard.write`:
  required for host-mediated clipboard writes
- `system.hosts.write`:
  reserved for host-mediated `/etc/hosts` updates (do not implement direct filesystem writes in plugins)
- `system.fs.scope.<scope-id>`:
  host-defined scope capability for controlled external filesystem mutations through `system.fs.mutate`
- `system.process.exec`:
  required for host-mediated process execution
- `system.process.scope.<scope-id>`:
  host-defined scope capability for controlled process execution through `system.process.exec`

Without capability grants, these operations throw explicit permission errors by design.

Best practice for operator-style and privileged plugins:

- declare expected capabilities in code via `declareCapabilities()`
- treat that declaration as an early intent manifest for host preflight and diagnostics
- do not treat declared capabilities as actual grants; the host remains authoritative
- keep runtime `requireCapability(...)` and scoped helper enforcement for real authorization

For system-level changes such as `/etc/hosts`, use a host-mediated action contract with strict payload validation and host-side confirmation/auditing.
For Docker-style plugins, prefer host-mediated `system.process.exec` with a narrow scope such as `system.process.scope.docker-cli` and a host allowlist for exact command paths and argument patterns.

## Operator-Style Plugin Pattern

The SDK supports larger operational plugins as long as they keep the host boundary explicit.

Good examples:

- Docker Desktop analogue
- Kubernetes dashboard / cluster console
- Helm release manager
- Terraform operator console
- local cluster/dev-environment manager

Recommended pattern:

- UI and interaction in the iframe runtime
- backend orchestration in plugin runtime
- privileged execution through host-mediated scoped actions
- no generic unrestricted shell access

Use host-defined scopes per tool family, for example:

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

For common operational tooling, prefer the SDK operator helpers:

- `createOperatorToolCapabilityPreset(...)`
- `createOperatorToolActionRequest(...)`
- `requestOperatorTool(...)`

For host-specific tools that are not part of the curated preset set, use:

- `createProcessScopeCapability(...)`
- `createScopedProcessExecActionRequest(...)`
- `requestScopedProcessExec(...)`

For capability remediation and diagnostics, the SDK now also provides:

- `createProcessCapabilityBundle(...)`
- `createFilesystemCapabilityBundle(...)`
- `describeCapability(...)`
- `parseMissingCapabilityError(...)`
- `runCapabilityPreflight(...)`

This lets plugin authors and AI tooling distinguish:

- missing broad capability such as `system.process.exec`
- missing narrow scope capability such as `system.process.scope.kubectl`

This is the model AI tooling should recommend when a plugin needs to behave like Docker Desktop, a Kubernetes console, or another operational dashboard.

For production-grade UX, operator plugins should also expose:

```ts
declareCapabilities() {
  return createOperatorToolCapabilityPreset("kubectl");
}
```

This allows hosts to compare declared capabilities with granted capabilities during preflight, before a user reaches a rare or deep action path.

Recommended explicit preflight pattern in plugin backend code:

```ts
const declared = this.declareCapabilities();
const report = runCapabilityPreflight({
  declared,
  granted: initCapabilitiesFromHost,
  action: "initialize plugin runtime",
});

if (!report.ok) {
  // surface report.summary + report.remediations in init diagnostics/logs
}
```

`PluginRegistry.callInit()` already logs declared-capability preflight diagnostics, but calling `runCapabilityPreflight(...)` directly is useful when you want a deterministic report object for custom UI, telemetry, or AI-assisted remediation.

## Many-Command Troubleshooting Best Practice

If a plugin needs to run many tool commands, do not default to:

- ten separate UI actions
- raw shell chaining
- ad hoc orchestration in iframe code

Use this rule of thumb:

- one command: `requestOperatorTool(...)`
- several independent commands gathered by one backend method: loop in backend code
- one named troubleshooting or inspect/act runbook: `requestScopedWorkflow(...)`

For example, an AWS troubleshooting plugin may need to run many `aws` CLI commands. Best practice is:

- declare capabilities via `declareCapabilities()`
- use `createOperatorToolCapabilityPreset("aws-cli")`
- keep execution in backend methods and registered handlers
- use a backend loop only when the commands are independent inspections
- switch to `requestScopedWorkflow(...)` when the sequence is one logical operator run with ordered steps, shared summary, and step-level diagnostics

Avoid:

- `sh -c`
- shell interpolation
- unstructured command concatenation
- repeating the same low-level request code in many UI handlers

## Error-Path Safety

- Keep render error fallbacks simple and runtime-safe
- Avoid iframe-only helpers in backend failure paths
- Prefer deterministic fallback UI over brittle styling dependencies
