# Host Privileged Actions Contract

This document defines the SDK-side contract for host-mediated privileged operations.

## Goal

Allow narrowly scoped privileged operations without granting plugins broad filesystem escape from `PLUGIN_HOME`.

## Current Actions

- `system.hosts.write`
- `system.fs.mutate`
- `system.process.exec`

Validated by SDK helper:

- `validateHostPrivilegedActionRequest(...)`
- helpers for developer UX:
  - `createFilesystemScopeCapability(scopeId)`
  - `createHostsWriteActionRequest(request)`
  - `createFilesystemMutateActionRequest(request)`
  - `createProcessScopeCapability(scopeId)`
  - `createProcessExecActionRequest(request)`

## Request Shape

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
const correlationId = "privileged-action-" + Date.now();
const response = await window.createBackendReq("requestPrivilegedAction", {
  correlationId,
  request: createFilesystemMutateActionRequest({
    action: "system.fs.mutate",
    payload: {
      scope: "etc-hosts",
      dryRun: true,
      operations: [{ type: "writeFile", path: "/etc/hosts", content: "# managed", encoding: "utf8" }]
    }
  })
});

if (response?.ok) {
  // success path
} else {
  // deterministic error path with correlationId + error + code
}
```

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

## Capability Requirement

- Host should only execute this action when capability `system.hosts.write` is granted for that plugin.
- For `system.fs.mutate`, host should require both:
  - broad feature capability: `system.hosts.write` (or host-defined equivalent for privileged FS API)
  - scope capability: `system.fs.scope.<scope-id>`
- For `system.process.exec`, host should require both:
  - broad feature capability: `system.process.exec`
  - scope capability: `system.process.scope.<scope-id>`

## Security Requirements For Hosts

- enforce explicit user confirmation for non-dry-run writes
- avoid shell interpolation; write through structured file logic
- constrain writes to `/etc/hosts` only
- support tagged sections to avoid uncontrolled file mutation
- log/audit each request and outcome with plugin identity and correlation id
- keep an allowlist mapping from `scope` -> permitted absolute roots and operation types
- reject any operation whose target path is outside the mapped scope roots
- keep an allowlist mapping from `scope` -> permitted executable absolute paths, cwd roots, env keys, timeout policy, and argument patterns
- reject any process execution request outside the mapped command policy

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
