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
