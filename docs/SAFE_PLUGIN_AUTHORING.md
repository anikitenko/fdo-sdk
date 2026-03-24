# Safe Plugin Authoring

This guide is for plugin authors building on `@anikitenko/fdo-sdk`.

## Runtime Separation

- Backend runtime:
  - plugin class lifecycle (`init`, handlers, storage, logging)
- Iframe UI runtime:
  - rendered UI source and browser-side helpers

Do not assume iframe-only globals are available in backend/bootstrap paths.

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

## Error-Path Safety

- Keep render error fallbacks simple and runtime-safe
- Avoid iframe-only helpers in backend failure paths
- Prefer deterministic fallback UI over brittle styling dependencies
