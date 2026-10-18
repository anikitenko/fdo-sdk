# Remote Commands: SDK and FDO integration

The SDK now exposes optional connection monitoring and streaming execution adapters in addition to buffered `ssh.exec`. These additions require a new SDK build and FDO implementation; installing the SDK alone does not enable them. Existing 1.8.1 hosts/plugins retain buffered behavior. This document is the implementation handoff for FDO and the Remote Commands plugin. No host or plugin UI implementation is included in this SDK repository.

## Host bootstrap contract

Configure adapters in the isolated backend worker before plugin initialization:

```typescript
PluginRegistry.configureHostServices({
  request: requestHostService, // existing HostServiceRequest/result transport
  watchSSHStatus: async ({ profileId }) => statusBridge.subscribe(profileId),
  startSSHExecution: async options => executionBridge.start(options),
});
```

`statusBridge` and `executionBridge` above are host implementations, not SDK exports. Exact TypeScript signatures are `HostServicesConfiguration` and `HostSSHExecution` in `src/types.ts`. Optional adapters are discovered by their presence; absent adapters reject with `HostServiceError.code === "UNAVAILABLE"`. Never silently run a buffered command as a fallback from `start`, because this can duplicate execution.

Adapters carry async iterables and promises inside the worker. Do not send these objects over IPC. Implement authenticated request IDs, subscription/execution IDs, ordered event delivery, terminal replies and explicit unsubscribe/cancel messages on the existing worker bridge. A suitable host-internal mapping is:

| Worker operation | Host responsibility |
| --- | --- |
| watch status `{ profileId }` | Authorize, allocate subscription ID, return initial status, stream heartbeats/transitions |
| status iterator `return()` | Unsubscribe that ID and release monitor references |
| start execution `{ profileId, command, timeoutMs, maxOutputBytes }` | Authorize, allocate execution ID, start once, return event iterable/result promise/cancel closure |
| execution output | Route `{ sequence, stream, data }` to its execution ID |
| execution terminal reply | Resolve result with `SSHExecResult`, or reject with a safe code |
| output iterator `return()` | Release output subscription; continue bounded capture/draining until terminal result |
| execution `cancel()` | Send cancellation for that execution ID, return `{ remoteProcessStopped }` |

IDs are host allocated, scoped to authenticated plugin/worker identity and invalidated on teardown. A guessed ID must not allow observation or cancellation of another plugin's work. Install output routing before starting the command so early output cannot be lost. Bound queues and pending work. A slow or absent consumer must never create an unbounded queue or block command deadline/cancellation. Retain at most the approved capture budget, drain excess, and end the event iterator independently of whether its consumer awaits the result. Terminal events must wake pending `next()` calls. Keep `cancel()` idempotent through completion/cancellation races, and retain the terminal acknowledgement for the scoped handle until cleanup.

The SDK invalidates stale responses and requests best-effort cleanup when host configuration is cleared/replaced. The host must independently release monitors, wake iterators, settle pending promises, and close channels/sockets on worker disconnect, plugin unload, profile change/deletion, credential rotation and grant revocation. View closure requires an explicit plugin-to-backend cancellation request if work should stop; a DOM disappearing is not that request. Worker teardown must not depend on JavaScript iterator finalizers running.

## Connection feed and grants

Add `ssh.status.watch` to capability discovery, installation/consent, preflight and revocation. The SDK helper `createSSHCapabilityBundle({ monitorStatus: true })` includes it; the default bundle is unchanged. Monitoring requires `ssh.use`, `ssh.status.watch`, `secrets.use`, `secrets.consume`, plus host authorization for the selected command profile. It authenticates using host-held credential references and verifies the pinned host key. It must not execute an arbitrary shell command as a health check or grant access to Git-only profiles. Streaming start/cancel uses the existing SSH execution grant set and command policy; no plaintext `secrets.get` grant is required.

`watchSSHStatus` returns an async iterable of:

```typescript
type Status = { profileId: string; state: "unknown" | "connecting" | "connected" | "disconnected";
  checkedAt: string | null; staleAfterMs: number };
```

Send an initial observation promptly, transitions immediately, and timestamped heartbeats while subscribed. `checkedAt` is an ISO timestamp of an actual host observation, not a cached command completion time. Null is allowed only for `unknown`. `staleAfterMs` is a positive integer. Bound polling/handshake deadlines and monitor counts; use SSH keepalives and explicit liveness checks, reference-count shared authorized monitors, and stop probes when no subscriptions remain. Return `unknown` until a real observation exists. A connected observation means the host observed authenticated SSH reachability at that time. It cannot guarantee that the VM or every service remains available. Never derive this feed from the previous command's exit code; a nonzero exit does not imply a connection failure.

Remote Commands must show the observation time and freshness. Set status to unknown/stale when `checkedAt + staleAfterMs` expires, on feed error/end, or when the view/backend loses its subscription. Only show “SSH connected” while observations are fresh. A stale/future timestamp must not keep a green badge indefinitely; account for clock skew or display unknown. Keep a command's last-attempt outcome separately. FDO must reauthorize active subscriptions when grants/profiles change and stop delivery on revocation.

## Live execution, cancellation, timeouts and capture

`startSSHExecution` returns `{ events, result, cancel }`. `events` yields `{ sequence, stream: "stdout" | "stderr", data }`; sequence starts at zero and increases contiguously across both streams. Decode each stream incrementally so UTF-8 characters split across network chunks survive. Sequence establishes host observation order only; independent stdout/stderr pipes cannot establish exact remote write order. Do not infer order by concatenating the two buffered result strings. `result` retains the buffered `SSHExecResult` shape for compatibility, including prominent `truncated` feedback.

The default combined stdout/stderr budget remains 1 MiB; plugins can request another positive safe integer via `maxOutputBytes`. The host applies its own ceilings. Count UTF-8 bytes across both streams, retain/emit only the approved prefix, drain excess output, and set `truncated: true` if anything was discarded. Apply one shared capture budget: event delivery and the final buffered copy represent the same captured bytes, not two independently allowed prefixes. Keep the encoded delivered strings within the budget, including replacement characters for malformed UTF-8. The SDK validates event sequences and combined delivered byte limits and rejects oversized final results. No unlimited capture is promised. Once the budget is exhausted, execution may continue with live elapsed-time feedback until it completes or is cancelled.

Remote Commands can continue to offer 1–120 seconds, but this is a plugin choice; the SDK accepts positive safe integers and defaults to 30 seconds. Enforce handshake and command deadlines independently in the host and apply lower policy ceilings when necessary. Explain the effective host policy in FDO settings/UI. On timeout, close the channel, attempt termination according to host policy, drain/release resources, settle result with `TIMEOUT`, and end events. Never automatically retry a command, including after a lost start acknowledgement.

`cancel()` requests termination and returns `{ remoteProcessStopped: true | false | null }`. Return true only with affirmative evidence that the intended process/workload stopped; channel/socket closure or an SSH signal request alone is insufficient. Null means unknown. Keep process termination evidence and the cancellation acknowledgement distinct from the command's transport result. For an active execution stopped by cancellation, reject `result` with `CANCELLED`; if it already finished, preserve its terminal result. A cancellation racing completion must not overwrite a completed result. Provider errors must be mapped to safe SDK codes; never expose provider messages or log command/output bodies by default.

If FDO needs guaranteed remote workload termination, it needs a separately designed remote supervisor/job protocol that owns process groups and can query job state. The SSH channel API alone cannot provide that guarantee. Do not label timeout, view closure or an unknown cancellation acknowledgement “remote process stopped.”

Plugin backend usage (consume output and result concurrently):

```typescript
const execution = await this.ssh.start({ profileId, command, timeoutMs: 60_000 });
// Store the handle in the backend under a plugin-owned run ID so the Cancel handler can use it.
const outputDone = (async () => {
  for await (const event of execution.events) {
    // Forward a bounded batch to the plugin view; render command output as text.
    publishOutput(event);
  }
})();
const [result] = await Promise.all([execution.result, outputDone]);
// Use result.truncated prominently. Do not append the buffered streams again after live output.
// In the Cancel handler: await execution.cancel(), then display its termination evidence.
```

Catch errors around this code, await/handle both tasks, release run handles in `finally`, and stop subscriptions when the plugin view is closed. Do not serialize the SDK execution object into the iframe. `events` allows one consumer; breaking its loop closes only the output subscription. Call `cancel()` explicitly to request termination. A result can complete before the consumer drains its bounded queued events.

## Persistent JSON acknowledgement

FDO must configure a writable, host-owned persistent root with `PluginRegistry.configureStorage({ rootDir })` (or `FDO_SDK_STORAGE_ROOT`) before the plugin selects JSON storage. Grant both `storage` and `storage.json`. Keep identity/scoped paths stable across restarts. Missing configuration and missing grants already fail explicitly; never substitute the memory store and acknowledge a persistent save.

The revised SDK JSON store still queues writes without making `set()` async, but `flush()` and `dispose()` now reject when the latest queued snapshot could not be written. Failures are also logged to FDO diagnostics. The queue remains usable: a later successful full snapshot clears the write error, and a subsequent flush can succeed. This is a change from 1.8.1, which logged and swallowed write failures. A successful flush confirms the queued atomic write completed; it is not a guarantee against all future disk loss or external modification. Preserve diagnostics rather than exposing raw disk errors/paths to the view.

A save handler must acknowledge only after the public lifecycle barrier:

```typescript
try {
  const store = PluginRegistry.useStore("json");
  store.set("remoteCommands", settings);
  if (!store.flush) throw new Error("Persistent storage acknowledgement is unsupported.");
  await store.flush();
  return { saved: true };
} catch {
  return { saved: false, error: "Settings could not be saved. Check storage configuration, grants and FDO diagnostics." };
}
```

The identifiers `settings` and the surrounding handler are supplied by the plugin. Show the rejected-save state explicitly and retain unsaved edits. On older SDKs, a flush acknowledgement can still hide disk failures; do not claim the stronger contract until the host/plugin actually uses this updated build. Host shutdown should await lifecycle completion before terminating the worker, and surface flush failures. The existing registry's synchronous teardown initiates cleanup but does not itself provide an awaitable host shutdown barrier.

## Acceptance checks in FDO

Verify fresh initial status, heartbeat loss, reconnect, stale UI and teardown without shell probes. Test missing grants, cross-plugin IDs, revocation during monitoring/execution, pinned-key mismatch and credential rotation. Confirm output arrives before completion; exercise stdout/stderr ordering, split and malformed UTF-8, exact combined caps, truncation, slow/no consumers and commands that exceed deadlines. Test cancel before/after completion, timeout, disconnect and view closure; ensure no command retry and no false termination claim. Exercise missing/unwritable roots, disk full, flush rejection, later recovery and restart persistence. Test packaged Windows/macOS/Linux SSH without an external SSH executable. SDK mock tests cannot establish host/network integration.
