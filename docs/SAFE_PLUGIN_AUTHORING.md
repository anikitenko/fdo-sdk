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
- logs are scoped by plugin directory

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

Without capability grants, these operations throw explicit permission errors by design.

For system-level changes such as `/etc/hosts`, use a host-mediated action contract with strict payload validation and host-side confirmation/auditing.

## Error-Path Safety

- Keep render error fallbacks simple and runtime-safe
- Avoid iframe-only helpers in backend failure paths
- Prefer deterministic fallback UI over brittle styling dependencies
