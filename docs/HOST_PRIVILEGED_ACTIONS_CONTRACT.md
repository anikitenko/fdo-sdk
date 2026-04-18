# Host Privileged Actions Contract

This document defines the SDK-side contract for host-mediated privileged operations.

## Goal

Allow narrowly scoped privileged operations without granting plugins broad filesystem escape from `PLUGIN_HOME`.

## Current Actions

- `system.clipboard.read`
- `system.clipboard.write`
- `system.hosts.write`
- `system.fs.mutate`
- `system.process.exec`
- `system.workflow.run`

Validated by SDK helper:

- `validateHostPrivilegedActionRequest(...)`
- helpers for developer UX:
  - `createClipboardReadActionRequest(request)`
  - `createClipboardWriteActionRequest(request)`
  - `createFilesystemScopeCapability(scopeId)`
  - `createHostsWriteActionRequest(request)`
  - `createFilesystemMutateActionRequest(request)`
  - `createProcessScopeCapability(scopeId)`
  - `createProcessExecActionRequest(request)`
  - `createClipboardReadRequest(reason?)`
  - `createClipboardWriteRequest(text, reason?)`
  - `requestClipboardRead(reasonOrOptions?, options?)`
  - `requestClipboardWrite(text, reasonOrOptions?, options?)`
  - `formatPrivilegedActionError(response, options?)`
  - `getInlinePrivilegedActionErrorFormatterSource()`

## Request Shape

```ts
{
  action: "system.clipboard.read",
  payload: {
    reason?: string
  }
}
```

```ts
{
  action: "system.clipboard.write",
  payload: {
    text: string,
    reason?: string
  }
}
```

```ts
{
  action: "system.hosts.write",
  payload: {
    records: Array<{
      address: string;   // IPv4/IPv6
      hostname: string;  // DNS-style host token
      comment?: string;
    }>,
    dryRun?: boolean,
    tag?: string
  }
}
```

## Recommended Response Envelope

Hosts should return a stable envelope with correlation for all privileged actions:

```ts
type PrivilegedActionResponse =
  | { ok: true; correlationId: string; result?: unknown }
  | { ok: false; correlationId: string; error: string; code?: string };
```

## Plugin-Side Usage Pattern

```ts
const request = createFilesystemMutateActionRequest({
  action: "system.fs.mutate",
  payload: {
    scope: "etc-hosts",
    dryRun: true,
    operations: [{ type: "writeFile", path: "/etc/hosts", content: "# managed", encoding: "utf8" }]
  }
});

const response = await requestPrivilegedAction(request, {
  correlationIdPrefix: "etc-hosts",
});

if (response?.ok) {
  // success path
} else {
  const message = formatPrivilegedActionError(response, {
    context: "Filesystem mutate action failed",
  });
  // deterministic error path with correlationId + error + code + process details when present
}
```

For `renderOnLoad()` string runtimes, use the inline-source helper:

```ts
const formatPrivilegedActionErrorSource = getInlinePrivilegedActionErrorFormatterSource();
return `
(() => {
  const formatPrivilegedActionError = ${formatPrivilegedActionErrorSource};
  // use formatPrivilegedActionError(response, { context, fallbackCorrelationId })
})();
`;
```

If you need the stable request envelope without sending it yet:

```ts
const payload = createPrivilegedActionBackendRequest(request, {
  correlationIdPrefix: "etc-hosts",
});
```

If your iframe UI fetches that envelope through `UI_MESSAGE`, prefer the canonical pipeline helper:

```ts verify
import { requestPrivilegedActionFromEnvelope } from "@anikitenko/fdo-sdk";

async function runPrivilegedPipeline() {
  const envelopeOrRequest = await window.createBackendReq("UI_MESSAGE", {
    handler: "plugin.buildPrivilegedRequest",
    content: {},
  });

  const { response, errorMessage } = await requestPrivilegedActionFromEnvelope(envelopeOrRequest, {
    context: "Privileged action failed",
  });

  if (!response.ok) {
    console.error(errorMessage);
  }
}
```

If you need low-level control, call `extractPrivilegedActionRequest(...)` + `window.createBackendReq("requestPrivilegedAction", requestPayload)` manually.

The helper safely unwraps all currently supported shapes:

```ts
input.result.request
input.request
direct request
```

Compatibility fallback if you are not using the helper yet:

```ts
const requestPayload = envelope?.result?.request ?? envelope?.request ?? envelope;
const correlationId = envelope?.result?.correlationId ?? envelope?.correlationId;
```

The stable rule for envelope-based handlers is:

- backend handler may return `{ correlationId, request }`
- `UI_MESSAGE` transport may wrap that again as `{ ok, result: { correlationId, request } }`
- raw host privileged-action bridge should receive `request`
- preserve `correlationId` in UI diagnostics separately if you need it for fallback/error display

Deprecated behavior:

- passing the full backend envelope directly into `requestPrivilegedAction` is deprecated
- this compatibility may exist temporarily in some hosts, but SDK examples should not rely on it
- a future major release may remove compatibility for forwarding raw envelope objects

```ts
{
  action: "system.fs.mutate",
  payload: {
    scope: string, // host-defined scope id, e.g. "etc-hosts"
    operations: Array<
      | { type: "mkdir"; path: string; recursive?: boolean; mode?: number }
      | { type: "writeFile"; path: string; content: string; encoding?: "utf8" | "base64"; mode?: number }
      | { type: "appendFile"; path: string; content: string; encoding?: "utf8" | "base64" }
      | { type: "rename"; from: string; to: string }
      | { type: "remove"; path: string; recursive?: boolean; force?: boolean }
    >,
    dryRun?: boolean,
    reason?: string
  }
}
```

```ts
{
  action: "system.process.exec",
  payload: {
    scope: string,      // host-defined scope id, e.g. "docker-cli"
    command: string,    // absolute executable path
    args?: string[],
    cwd?: string,       // absolute path
    env?: Record<string, string>,
    timeoutMs?: number,
    input?: string,
    encoding?: "utf8" | "base64",
    dryRun?: boolean,
    reason?: string
  }
}
```

```ts
{
  action: "system.workflow.run",
  payload: {
    scope: string,      // host-defined scope id, e.g. "terraform"
    kind: "process-sequence",
    title: string,
    summary?: string,
    dryRun?: boolean,
    steps: Array<{
      id: string,
      title: string,
      phase?: "inspect" | "preview" | "mutate" | "apply" | "cleanup",
      command: string,  // absolute executable path
      args?: string[],
      cwd?: string,
      env?: Record<string, string>,
      timeoutMs?: number,
      input?: string,
      encoding?: "utf8" | "base64",
      reason?: string,
      onError?: "abort" | "continue"
    }>,
    confirmation?: {
      message: string,
      requiredForStepIds?: string[]
    }
  }
}
```

## Capability Requirement

- For `system.clipboard.read`, host should require:
  - broad feature capability: `system.clipboard.read`
- For `system.clipboard.write`, host should require:
  - broad feature capability: `system.clipboard.write`
- Host should only execute this action when capability `system.hosts.write` is granted for that plugin.
- For `system.fs.mutate`, host should require both:
  - broad feature capability: `system.hosts.write` (or host-defined equivalent for privileged FS API)
  - scope capability: `system.fs.scope.<scope-id>`
- For `system.process.exec`, host should require both:
  - broad feature capability: `system.process.exec`
  - scope capability: `system.process.scope.<scope-id>`
- For `system.workflow.run`, first-slice host policy should reuse the same capability pair:
  - broad feature capability: `system.process.exec`
  - scope capability: `system.process.scope.<scope-id>`

## Security Requirements For Hosts

- use the Electron clipboard API only in the trusted host process or another explicitly trusted host boundary
- do not grant plugins raw clipboard access without host mediation
- consider clipboard read more sensitive than clipboard write and gate it independently
- log/audit clipboard reads with plugin identity, correlation id, and reason when available
- log/audit clipboard writes with plugin identity, correlation id, and reason when available
- enforce explicit user confirmation for non-dry-run writes
- avoid shell interpolation; write through structured file logic
- constrain writes to `/etc/hosts` only
- support tagged sections to avoid uncontrolled file mutation
- log/audit each request and outcome with plugin identity and correlation id
- for `system.workflow.run`, log/audit:
  - workflow correlation id
  - workflow id
  - plugin identity
  - scope id
  - workflow title/kind
  - per-step stepId/title/status
  - per-step correlation id when available
  - confirmation decision for approval-gated steps
- keep an allowlist mapping from `scope` -> permitted absolute roots and operation types
- reject any operation whose target path is outside the mapped scope roots
- keep an allowlist mapping from `scope` -> permitted executable absolute paths, cwd roots, env keys, timeout policy, and argument patterns
- reject any process execution request outside the mapped command policy
- reject any workflow step outside the mapped process policy for the selected scope

## Workflow Response Expectations

For `system.workflow.run`, hosts should return:

- the stable privileged response envelope with workflow-level `correlationId`
- a normalized workflow summary
- per-step results with typed process result data where available:
  - `command`
  - `args`
  - `cwd`
  - `exitCode`
  - `stdout`
  - `stderr`
  - `durationMs`
  - `dryRun`

When a workflow is partial or failed, hosts should preserve:

- failed `stepId`
- failed step `title`
- step-level `correlationId` when available
- stable `error` and `code`

This is required so hosts and SDK-side diagnostics helpers can render useful failure summaries without log scraping.

## Recommended Host Scope Model

1. Define host policy scopes (for example `etc-hosts`, `usr-local-bin`), each with:
   - allowed absolute root paths
   - allowed operation set
   - confirmation policy
2. Grant plugins explicit scope capabilities using `system.fs.scope.<scope-id>`.
3. Evaluate every `system.fs.mutate` operation against the selected scope before any write.
4. Keep plugin runtime sandbox (`PLUGIN_HOME`) unchanged; privileged writes stay host-mediated only.

## Docker-Style Plugin Guidance

For plugins that behave more like Docker Desktop:

1. Prefer `system.process.exec` over raw shell access.
2. Grant:
   - `system.process.exec`
   - `system.process.scope.docker-cli`
3. Host policy for `docker-cli` should allow only:
   - exact executable paths such as `/usr/local/bin/docker` or host-specific equivalents
   - approved subcommands / argument shapes
   - bounded execution time
   - explicit cwd rules
4. Do not expose unrestricted shell evaluation as a plugin capability.

## General Operator Plugin Guidance

This process-scope model is not Docker-specific.

The same host-mediated pattern should be used for:

- Kubernetes dashboards (`system.process.scope.kubectl`)
- Helm managers (`system.process.scope.helm`)
- Terraform/operator consoles (`system.process.scope.terraform`)
- other serious local operations tooling

AI assistants and plugin authors should prefer:

- scoped privileged actions
- exact tool-family scopes
- allowlisted binaries and argument policies

AI assistants and plugin authors should avoid recommending:

- generic shell execution
- unrestricted process spawning
- broad "admin" or "root" style plugin permissions
