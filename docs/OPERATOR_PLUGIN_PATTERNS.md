# Operator Plugin Patterns

This guide defines the recommended SDK pattern for serious operational plugins.

## Target Plugin Classes

The SDK supports plugins that behave more like operational consoles than small UI widgets.

Examples:

- Docker Desktop analogue
- Kubernetes dashboard
- Helm release manager
- Terraform/operator console
- local cluster or environment controller

## Recommended Model

Use three layers:

1. Iframe UI runtime for interaction and presentation
2. Plugin backend/runtime for orchestration logic
3. Host-mediated privileged actions for sensitive execution

Do not collapse those layers into unrestricted shell execution from plugin code.

## Execution Pattern

For tool execution, prefer:

- broad capability: `system.process.exec`
- narrow capability: `system.process.scope.<scope-id>`
- action: `system.process.exec`

Examples of scope ids:

- `docker-cli`
- `kubectl`
- `helm`
- `terraform`

The SDK now exposes both generic and curated authoring helpers:

- generic:
  - `createScopedProcessExecActionRequest(scopeId, payload)`
  - `requestScopedProcessExec(scopeId, payload, options?)`
- curated presets for common DevOps/SRE tooling:
  - `getOperatorToolPreset(presetId)`
  - `listOperatorToolPresets()`
  - `createOperatorToolCapabilityPreset(presetId)`
  - `createOperatorToolActionRequest(presetId, payload)`
  - `requestOperatorTool(presetId, payload, options?)`

Curated preset ids currently include:

- `docker-cli`
- `kubectl`
- `helm`
- `terraform`
- `ansible`
- `aws-cli`
- `gcloud`
- `azure-cli`
- `podman`
- `kustomize`
- `gh`
- `git`
- `vault`
- `nomad`

Reference fixtures:

- `examples/fixtures/operator-kubernetes-plugin.fixture.ts`
- `examples/fixtures/operator-terraform-plugin.fixture.ts`
- `examples/fixtures/operator-custom-tool-plugin.fixture.ts`

Use the curated fixtures for known tool families and the custom-tool fixture for host-specific scopes.

The host should map each scope to:

- allowed executable absolute paths
- allowed working directory roots
- allowed environment variable keys
- argument policy
- timeout ceiling
- confirmation policy

## Plugin-Side Request Pattern

```ts
import {
  createPrivilegedActionBackendRequest,
  createProcessExecActionRequest,
  isPrivilegedActionErrorResponse,
  isPrivilegedActionSuccessResponse,
  requestPrivilegedAction,
} from "@anikitenko/fdo-sdk";

const request = createProcessExecActionRequest({
  action: "system.process.exec",
  payload: {
    scope: "docker-cli",
    command: "/usr/local/bin/docker",
    args: ["ps", "--format", "json"],
    timeoutMs: 5000,
    dryRun: true,
    reason: "list running containers",
  },
});

const response = await requestPrivilegedAction(request, {
  correlationIdPrefix: "docker-cli",
});

if (isPrivilegedActionSuccessResponse(response)) {
  // response.result
} else if (isPrivilegedActionErrorResponse(response)) {
  // response.error + response.code
}
```

If you need the transport payload without sending it immediately, use:

```ts
const payload = createPrivilegedActionBackendRequest(request, {
  correlationIdPrefix: "docker-cli",
});

// payload = { correlationId, request }
```

For serialized `renderOnLoad()` handlers, prefer the self-contained `requestPrivilegedAction(...)` helper over manually building `window.createBackendReq("requestPrivilegedAction", ...)`.

## Capability Presets

For common tool families, prefer SDK capability presets over manually repeating strings:

```ts
import { createOperatorToolCapabilityPreset } from "@anikitenko/fdo-sdk";

const capabilities = createOperatorToolCapabilityPreset("terraform");
// ["system.process.exec", "system.process.scope.terraform"]
```

The generic bundle helpers follow the same pattern when the scope is host-specific:

```ts
import { createProcessCapabilityBundle } from "@anikitenko/fdo-sdk";

const capabilities = createProcessCapabilityBundle("internal-runner");
// ["system.process.exec", "system.process.scope.internal-runner"]
```

For unknown or host-specific tool families, use the generic scoped helper pattern:

```ts
import { createProcessScopeCapability } from "@anikitenko/fdo-sdk";

const capabilities = [
  "system.process.exec",
  createProcessScopeCapability("internal-runner"),
];
```

## Tool-Family Request Helpers

For common DevOps/SRE tools, the curated helper path keeps request code short and AI-friendly:

```ts
import { requestOperatorTool } from "@anikitenko/fdo-sdk";

const response = await requestOperatorTool("kubectl", {
  command: "/usr/local/bin/kubectl",
  args: ["get", "pods", "-A"],
  timeoutMs: 5000,
  dryRun: true,
});
```

For custom scopes that are not part of the curated preset set, keep using the generic helper:

```ts
import { requestScopedProcessExec } from "@anikitenko/fdo-sdk";

const response = await requestScopedProcessExec("internal-runner", {
  command: "/usr/local/bin/internal-runner",
  args: ["status"],
  timeoutMs: 3000,
  dryRun: true,
});
```

## Missing Capability Diagnostics

When a plugin is denied by SDK capability checks, prefer structured remediation over raw string matching:

```ts
import { parseMissingCapabilityError } from "@anikitenko/fdo-sdk";

try {
  // operator request path
} catch (error) {
  const diagnostic = parseMissingCapabilityError(error);
  if (diagnostic) {
    // diagnostic.capability
    // diagnostic.category
    // diagnostic.remediation
  }
}
```

This is especially useful for distinguishing:

- missing broad capability: `system.process.exec`
- missing narrow scope capability: `system.process.scope.<scope-id>`

## Why This Pattern

This gives plugin authors enough power to build real operator workflows while keeping the host as the security boundary.

It is better than:

- unrestricted `child_process`
- shell interpolation
- broad "admin" plugin permission
- direct writes outside `PLUGIN_HOME`

## AI Guidance

AI assistants should recommend:

- scoped process execution for Docker/Kubernetes/Helm/Terraform style plugins
- scoped filesystem mutation for controlled external writes
- deterministic response envelope handling
- explicit capability guidance

AI assistants should avoid recommending:

- generic shell execution
- unrestricted process spawning
- broad "root" style plugin permissions
