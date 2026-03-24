# Bundle Boundary Review (FDO-Aligned)

Review date: 2026-03-24

## Scope

This review decides dependency/bundle boundaries for `@anikitenko/fdo-sdk` based on actual FDO runtime usage, not generic npm optimization.

## Current Runtime Facts

- FDO plugins run in a backend/plugin runtime plus iframe UI runtime.
- FDO host injects UI libraries in iframe runtime, but backend plugin runtime still executes SDK lifecycle/storage/logging code.
- The SDK bundle is consumed through package import by plugins, not as a browser-global script.

## Findings

- `electron` and Node built-ins are already externalized in webpack (`commonjs` externals).
- `goober` is used by SDK DOM helpers in backend-side UI source generation and CSS extraction paths.
- Logging stack (`winston` + `winston-daily-rotate-file`) contributes a large dependency surface.
  - Source-map package count snapshot shows heavy transitive weight from logging deps (for example `moment` via rotate-file transport).
- `@expo/sudo-prompt` and `write-file-atomic` are runtime utilities used by exported SDK helpers.

## Boundary Decision

- Keep current runtime boundaries in this pass:
  - keep `electron` as an external import in bundle output
  - keep `goober`, logging stack, storage/write utilities as package dependencies
  - do not split bundle or externalize additional deps until host/runtime behavior changes
- Reason: current FDO plugin runtime relies on this behavior and stability is prioritized over speculative size optimization.

## Follow-up Optimization Candidates (Non-blocking)

- Replace/trim rotating logger dependencies if a lighter logger can preserve required structured-event behavior.
- Consider optionalizing privileged helper dependencies (`@expo/sudo-prompt`) behind a separate subpath export only if FDO plugin loading model supports it.
