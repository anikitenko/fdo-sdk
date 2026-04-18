# API Stability Rules

This document defines which SDK surfaces are stable contracts versus internal implementation details.

## Stability Levels

- Stable:
  - safe for plugin authors and AI tooling to depend on
  - breaking changes require semver-major
- Provisional:
  - usable but evolving
  - may change in semver-minor with migration notes
- Internal:
  - no compatibility guarantee
  - may change at any time

## Stable Surfaces

- Root package public exports from `src/index.ts`
- Root package distribution contract:
  - consume via `@anikitenko/fdo-sdk` package entry
  - runtime artifact is Node/CommonJS-oriented bundle (`dist/fdo-sdk.bundle.js`)
  - no browser-global SDK contract
- `FDO_SDK` lifecycle methods:
  - `init()`
  - `render()`
  - `renderOnLoad()`
  - `serializeRender()`
  - `serializeRenderOnLoad()`
- Render-on-load authoring helpers:
  - `defineRenderOnLoad(...)`
  - `resolveRenderOnLoadSource(...)`
  - `listRenderOnLoadTemplates(...)`
  - `getRenderOnLoadTemplate(...)`
  - `getRenderOnLoadMonacoTypeDefinitions(...)`
  - `getRenderOnLoadMonacoHints(...)`
- Fixture runtime matrix helpers:
  - `getFixtureRuntimeMatrix(...)`
  - `listFixtureRuntimeMatrixCases(...)`
  - `getFixtureRuntimeMatrixCase(...)`
- Handshake compatibility helpers:
  - `evaluateSdkHandshakeCompatibility(...)`
  - `isSdkHandshakeCompatible(...)`
- Plugin doctor helpers:
  - `createPluginDoctorReport(...)`
  - `createPluginDoctorPanelModel(...)`
- Optional declared capability surface:
  - `declareCapabilities()`
- Public plugin contracts:
  - `FDOInterface`
  - `PluginMetadata`
  - exported `types` module contracts
- `PluginRegistry` public methods:
  - `registerHandler`
  - `useStore`
  - `registerStore`
  - `configureStorage`
  - `configureCapabilities`
- Documented decorator behavior (`handleError`)
- Runtime contract validators exported from `src/utils/contracts.ts`
- Privileged action helper exports:
  - `createFilesystemScopeCapability`
  - `createHostsWriteActionRequest`
  - `createFilesystemMutateActionRequest`
  - `createWorkflowRunActionRequest`
  - `validatePrivilegedActionRequest`
- Workflow helper exports:
  - `createScopedWorkflowRequest`
  - `requestScopedWorkflow`

## Provisional Surfaces

- Store lifecycle capability metadata shape
- Advanced store migration/version hook behavior
- Deprecation utility message formatting details (`formatDeprecationMessage`)
- Example plugin implementations under `examples/`

## Internal Surfaces

- Private/static registry fields
- Communicator internals and transport plumbing
- Store internals prefixed with `_` fields
- Logger backend wiring details
- Any file/function not exported from root package entry

## Change Rules

- Stable surface changes:
  - maintain backward compatibility in minors/patches
  - add migration notes for any semantic shift
- Provisional surface changes:
  - allowed in minors with explicit release notes
- Internal changes:
  - unrestricted unless they alter documented stable behavior

## Migration And Versioning Loop

Treat migration and semver as one required release loop:

1. Run migration dry-run on real plugin targets:
   - `fdo sdk migrate --target ./plugins`
   - or `fdo-sdk migrate --target ./plugins`
2. Apply codemods (`--write`) and re-run tests/validation.
3. Choose semver bump by compatibility impact:
   - patch for non-contract fixes
   - minor for additive changes/deprecations with migration notes
   - major for breaking contract changes/removals
4. Ensure changelog/release notes include explicit migration guidance.
5. Validate the host (FDO) is running the intended SDK version before sign-off.

## Guidance For AI Tooling

Treat these files as source-of-truth contracts first:

1. `README.md`
2. `docs/RENDER_RUNTIME_CONTRACT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/API_STABILITY.md`
5. `src/index.ts` exported symbols

Avoid inferring public contracts from private fields or test-only helpers.
