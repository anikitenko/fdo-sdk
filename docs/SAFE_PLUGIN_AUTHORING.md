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

## Capability Grants (Host-Managed)

Privileged SDK features are capability-gated. The host should grant capabilities at init-time through `PLUGIN_INIT.content.capabilities`.

- `storage.json`:
  required for `PluginRegistry.useStore("json")`
- `sudo.prompt`:
  required for `runWithSudo(...)`
- `system.hosts.write`:
  reserved for host-mediated `/etc/hosts` updates (do not implement direct filesystem writes in plugins)
- `system.fs.scope.<scope-id>`:
  host-defined scope capability for controlled external filesystem mutations through `system.fs.mutate`
- `system.process.exec`:
  required for host-mediated process execution
- `system.process.scope.<scope-id>`:
  host-defined scope capability for controlled process execution through `system.process.exec`

Without capability grants, these operations throw explicit permission errors by design.

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

This lets plugin authors and AI tooling distinguish:

- missing broad capability such as `system.process.exec`
- missing narrow scope capability such as `system.process.scope.kubectl`

This is the model AI tooling should recommend when a plugin needs to behave like Docker Desktop, a Kubernetes console, or another operational dashboard.

## Error-Path Safety

- Keep render error fallbacks simple and runtime-safe
- Avoid iframe-only helpers in backend failure paths
- Prefer deterministic fallback UI over brittle styling dependencies
