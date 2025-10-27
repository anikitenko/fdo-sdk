# API Contracts - Plugin Example Implementations

**Feature**: Plugin Example Implementations  
**Date**: 2025-10-27

## Overview

This feature creates example plugin implementations that demonstrate existing SDK APIs. Since no new APIs are being created, there are no new API contracts to define.

## Existing SDK APIs Used by Examples

The examples demonstrate usage of existing FDO SDK APIs:

### Core Plugin API
- `FDO_SDK` base class (from `src/index.ts`)
- `FDOInterface` interface (from `src/index.ts`)
- `PluginMetadata` type (from `src/types.ts`)

### Plugin Registry API
- `PluginRegistry.registerPlugin()` - Auto-called on plugin instantiation
- `PluginRegistry.registerHandler()` - Register custom message handlers
- `PluginRegistry.useStore()` - Access storage backends

### Storage API
- `StoreDefault` - In-memory key-value store
- `StoreJson` - File-based persistent store
- `StoreType` interface methods: `get()`, `set()`, `remove()`, `clear()`, `has()`, `keys()`

### DOM Generation API
- `DOM` base class - Core HTML generation
- `DOMText` - Text element generation
- `DOMButton` - Button element generation
- `DOMInput` - Input element generation
- `DOMLink` - Link element generation
- `DOMNested` - Container element generation
- `DOMMisc` - Miscellaneous elements

### Mixin API
- `QuickActionMixin` - Adds `defineQuickActions()` method
- `SidePanelMixin` - Adds `defineSidePanel()` method

### Logging API
- `this.log()` - Info logging
- `this.error()` - Error logging

## Contract Documentation

All existing API contracts are documented in:
- SDK source code with JSDoc comments
- TypeScript type definitions (`.d.ts` files)
- Existing SDK documentation

## No New Contracts

This feature does not introduce any new APIs or contracts. It purely demonstrates usage of existing, stable SDK APIs through example implementations.
