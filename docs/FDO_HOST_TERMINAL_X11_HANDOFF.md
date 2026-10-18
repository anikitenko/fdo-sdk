# FDO host wiring: interactive PTY and X11

The SDK facade is implemented; the sibling FDO host has **not** been modified. `ssh.exec()` and `ssh.start()` retain their existing contracts. The following changes are required in FDO before `ssh.openTerminal()` works. File paths below are relative to the inspected sibling FDO checkout. This is an implementation map, not a claim that the new IPC operations already exist.

## 1. Permissions and profile policy

Update `src/utils/hostServices/capabilities.json`, `contracts.cjs`, the host capability parser/preflight, authoring documentation and consent UI to recognize:

- `ssh.terminal.open`: requires `ssh.use`, `secrets.use`, `secrets.consume`; explicitly permits arbitrary shell input.
- `ssh.x11.forward`: additionally requires `ssh.terminal.open` and separately approved per-profile/mode forwarding consent.

In `profileValidation.js`, vault profile schema/migrations and **Settings → Credentials & SSH**, introduce explicit interactive and X11-mode authorization, default false/empty on all existing profiles. Do not reinterpret `allowAllCommands`, a command allowlist, Git consumer authorization or `ssh.exec` as interactive consent. Preserve command consumers and existing profiles. Show that interactive input bypasses command review/allowlists by design and therefore needs a stronger grant. Trusted X11 consent must explain local display/input access. A requested mode must be approved exactly. A persisted host policy can record consent; it must never store a cookie in plugin data.

In `service.cjs` add an interactive authorization branch separate from the current `createLiveSSH` command-authorizer. Resolve the profile and credential references using the trusted endpoint's plugin identity, verify installation/grants, interactive consumer consent and pinned endpoint/key revision, and only then consume credentials. For X11, also verify the grant, mode-specific host consent and local-display preflight. Extend profile listing policy to include explicitly interactive-authorized profiles without enabling command execution or changing Git-only profile behavior. Never accept a worker-supplied plugin ID or arbitrary display, socket path, credentials or environment map.

## 2. Host provider and display service

The inspected provider is bundled `ssh2` ^1.17.0. `ssh.cjs` currently requests `exec(...,{pty:false})` and immediately sends stdin EOF. Leave that implementation intact. Add an independent terminal service using `client.shell({term,rows,cols,width:0,height:0}, {x11?}, callback)`, `channel.write`, `channel.setWindow(rows,columns,0,0)` and `channel.end`. Do not call end on session creation. Close the dedicated SSH connection on terminal teardown.

Copy/adapt the tested host-only references [sshTerminal.cjs](../examples/host/sshTerminal.cjs) and [x11Forwarding.cjs](../examples/host/x11Forwarding.cjs) into `src/utils/hostServices/`. They accept an already authenticated dedicated client; they do not replace the service's independent request validation, credential loading, per-plugin handle limits, profile revision checks or teardown registry. Do not install these adapters in a plugin or expose their configuration through the UI bridge.

Create/authenticate the client using the same profile endpoint, host `credentialsFor` consumer and `trusted(rawKey, enrolledFingerprint)` verification from `ssh.cjs`; require host-key verification before accepting ready. Keep handshake timeout/keepalive policy. Do not pool across workers or consumers. Release credentials after authentication/teardown and invalidate an opening connection when a profile/credential/grant changes. Register resource ownership **before** opening; a worker death before open acknowledgement must still destroy the pending client. Never reconnect or retry an uncertain shell start.

Example main-process factory shape (host functions shown here must be implemented in FDO):

```typescript
async function openTerminalForEndpoint(endpoint, options) {
  validateTerminalOptionsStrictly(options); // reject unknown keys, enforce SDK and host ceilings
  const lease = reserveTerminal(endpoint, options); // authentic identity + profile revision + quota
  try {
    const authorized = authorizeInteractive(endpoint, options);
    const local = options.x11 ? await displays.prepare(authorized, options.x11.mode) : undefined;
    lease.trackDisplay(local); // release even if authentication/open fails
    const client = await connectPinnedSSH(authorized, lease.abortSignal);
    lease.trackClient(client);
    return await openSSHTerminal({
      client, options, localX11: local,
      authorize: mode => reauthorizeLease(lease, mode),
      onDispose: () => lease.release(),
    });
  } catch (error) {
    lease.release();
    throw toSafeHostServiceError(error);
  }
}
```

`displays.prepare` is a required new host service, not an SDK API. Read local DISPLAY/XAUTHORITY and platform configuration only in the host; parse strictly rather than executing shell fragments. Discover a running authenticated local display, retrieve its authorization through a safe host API or fixed xauth executable/arguments with bounded output/time, and test local reachability. The reference supports only MIT-MAGIC-COOKIE-1 with 16-byte cookies. Reject other auth protocols/platform transports until implemented. Preserve authenticated local transport; prefer Unix sockets on supported systems. If an explicitly configured loopback TCP display is needed, require cookie authentication and never use `xhost +`, disabled access control, public listeners or a remote-accessible server.

For untrusted forwarding, require verified X SECURITY support and create a restricted authorization with a bounded lifetime and revocation callback. Only then may the host descriptor contain `securityAuthorization: 'untrusted'`. A normal trusted cookie plus this string is **not** isolation. No such generation/probing service exists in the inspected host; initially return `X11_UNSUPPORTED` for untrusted mode. Trusted mode must also fail until local discovery and authentication are implemented. No silent trusted fallback. `local.connect()` must open a new local socket per authenticated incoming channel; its promise includes connection establishment and has a deadline. `local.dispose()` revokes session-specific authorizations and releases host state; do not revoke unrelated desktop credentials. No cookies or local addresses cross the endpoint boundary.

Install the X11 listener before requesting the shell. `createX11Forwarding` generates a spoof cookie per terminal, puts only that cookie in the SSH request and checks incoming setup packets before any local connect. Reject channels without authorization, after session close, on cap/deadline or after revocation. Do not trust the incoming origin address as identity. Destroy both sockets on any failure; keep the setup deadline through connect and initial writes. Clear cookie buffers, reject late channels, release generated X authorizations, and destroy the dedicated SSH client. The helper contains no persistent storage or logging. Future use of connection pooling would require a separate, correctly routed channel-authorization design.

## 3. Authenticated endpoint operations and worker adapter

Extend the operation allowlist in `workerBridge.cjs` and endpoint dispatch in `service.cjs`; retain `watch/start/next/return/result/cancel` for existing APIs. Use **distinct** terminal operations and a terminal handle kind so a status/execution handle cannot be replayed as a terminal. Proposed exact wire operations:

| Operation | Payload | Reply |
| --- | --- | --- |
| `terminal.open` | `SSHTerminalOpenOptions` | `{handle}` after PTY/shell and requested X11 success |
| `terminal.next` | `{handle}` | `{done:true}` or `{done:false,value:{sequence,dataBase64}}` |
| `terminal.write` | `{handle,dataBase64}` | `{accepted:true}` after write callback/drain |
| `terminal.resize` | `{handle,rows,columns}` | `{accepted:true}` |
| `terminal.eof` | `{handle}` | `{accepted:true}` |
| `terminal.result` | `{handle}` | `SSHTerminalResult` or safe rejection |
| `terminal.cancel` | `{handle}` | `SSHCancelResult`, retained idempotent acknowledgement |
| `terminal.close` | `{handle}` | `{closed:true}`; idempotent, also closes X11 |

Use random host-issued handles stored within the authenticated endpoint/worker, not a global bearer-handle map. Bind type, identity, worker generation, profile ID/revision and grants. Reject unknown, cross-plugin, expired, cross-kind and foreign-worker handles; retain a bounded same-endpoint close/cancel tombstone long enough for racing acknowledgements. `terminal.open` is dispatched once; losing its reply does not authorize re-execution. Request IDs can be deduplicated within bounded pending/open state, but must never cause a second shell.

Validate exact keys and types in the main process, including after worker decoding. Use canonical base64 over JSON IPC; cap encoded input at 43692 ASCII characters, validate padding/canonical form and decoded byte length <=32768 before allocation/dispatch. Return at most 32768 raw bytes per output packet. `workerLiveSource.js` decodes to a fresh `Uint8Array` and encodes input similarly; never expose a raw Node Buffer JSON object as terminal text. Binary-safe structured clone is also possible, but both ends must use one documented format. Base64 itself is not secret protection; never log bodies.

Extend `WORKER_LIVE_SOURCE` with `openHostSSHTerminal(options)`. It calls `terminal.open` once, constructs a one-consumer pull iterator, starts `terminal.result` immediately (attach a rejection handler), and supplies write/resize/endInput/close/cancel closures. Each `next` requests one packet. Its `return` performs `terminal.close`, unlike existing execution-output `return` semantics. Memoize cancel and close replies. A terminated endpoint must reject/wake every outstanding request/next/result, including opening calls. Never send an iterable or promise through IPC.

In `src/utils/plugins/security/pluginRuntimeSecurity.js` bootstrap add the optional adapter:

```typescript
registry.configureHostServices({
  request: requestHostService,
  watchSSHStatus: watchHostSSHStatus,
  startSSHExecution: startHostSSHExecution,
  openSSHTerminal: openHostSSHTerminal,
});
```

These names are host bootstrap functions; only `openSSHTerminal` is the new SDK configuration property. Keep configuration before plugin initialization and keep the private endpoint out of `window.createBackendReq`. The plugin UI may invoke its own narrow backend handlers, never this service endpoint or a generic arbitrary-input operator action.

Update host `contracts.cjs` error allowlists, worker error envelopes, diagnostics and docs with the new codes listed in [the public guide](./SSH_TERMINALS.md). Never forward provider exception text. Offer a host readiness signal for terminal renderer, terminal adapter and supported X11 modes independently; SDK version alone is insufficient. An old host must return `UNAVAILABLE` without fallback to exec/start/system ssh.

## 4. Resource ownership and renderer

Add a host session registry indexed by endpoint, profile revision and view lease. The reference provider enforces byte queues, open/idle/absolute timeouts, channel limits and cleanup after its client is handed over. FDO must also impose four sessions per worker/16 per host, bounded pending opens and overall memory budgets, finite control/write/result request lifetimes, and cleanup before authentication completes. The SDK has 32 pending input/control operations and 64 KiB input limits; the host must independently enforce them. Do not share the existing execution queue's truncation/drop policy with terminals.

Pause application output at 64 KiB and hard-fail above 256 KiB. Inspected `ssh2/lib/Channel.js` fixes PACKET_SIZE at 32 KiB, MAX_WINDOW at 2 MiB and channel/extended-data high-water marks at 2 MiB; its public client API has no window tuning option. Reserve conservative provider-buffer memory per terminal and X11 channel in addition to the application queue, including pending writes and local socket buffers. Enforce a global forwarded-channel/memory quota before accepting each channel (for example 32 forwarded channels and a conservative 256 MiB provider reservation budget); the per-terminal gate cap alone is insufficient. If smaller channel windows are necessary, implement and test that change in the host provider rather than promising a configuration option that does not exist. Account for provider buffers and one incoming SSH packet beyond the threshold. Return credits after packet consumption, not after enqueueing into another IPC queue. A stalled view must leave input/cancel/close and deadlines functional. Keep enough of the bridge's existing 32 pending request slots reserved for control operations; cap outstanding `terminal.next` and `terminal.result` per handle at one and prevent request flooding from starving closure. Do not let long-poll reads monopolize a serialized UI handler.

The minimal plugin's lease expires in 30 seconds, holds one packet until emulator acknowledgement and returns short open/cancel acknowledgements. Production FDO must have an authenticated view-release/lease notification to the backend/host; a DOM removal by itself is not a host cleanup signal. On explicit close, view release/lease expiry, worker exit/error, transport disconnect, plugin unload, profile edit/deletion, credential rotation, display change or grant revocation: invalidate ownership, stop input delivery, abort pending opens, close PTY and every X11/local socket, end pending readers/results, clear queues/timers, release authorization and settle cancellation evidence. Do not wait for JS garbage collection. Host shutdown needs an awaitable cleanup barrier before destroying workers. Preserve a completed exit result when cancellation races it.

The reference resets idle on accepted input/control activity. Integrate host-authenticated lease renewal separately if desired; never reset idle from remote output alone. Apply lower policy ceilings in Settings; do not overstate channel closure as remote termination. The reference signals INT then closes on cancel and reports unknown termination; no remote process supervisor ships here.

For renderer support, extend FDO's actual iframe library injection, asset bundling, CSP and types, with a vetted terminal emulator and its stylesheet. There is no existing terminal emulator to reuse: `BuildOutputTerminalComponent` uses `AnsiOutput` for SGR build logs, and injected ACE is only an editor. The example's proposed `window.FDOTerminal` wrapper and keyboard/resize/focus/disposal requirements are specified in [SSH_TERMINALS.md](./SSH_TERMINALS.md). Keep new library dependencies host-owned and document the injection before enabling plugin UI. Implement UTF-8 byte decoding in the renderer or pass raw bytes to the emulator. Never decode separate chunks independently or parse terminal output as HTML. Disable privileged OSC integrations by default. Add no X11 cookie/local socket API to this wrapper; graphical windows appear on the local X server.

## 5. Verify and roll out

SDK/unit validation commands:

```sh
npm test
npm run test:examples
npm run verify:docs
npm run build
```

Real SSH loopback test, from the SDK checkout with the inspected sibling host dependencies installed:

```sh
node tests/integration/ssh-terminal.cjs
# Alternate ssh2 installation:
FDO_SSH2_MODULE=/absolute/path/to/ssh2 node tests/integration/ssh-terminal.cjs
```

The loopback script runs an ephemeral localhost-only SSH server with ephemeral host keys and test-only credentials, verifies the pinned host key, PTY/input/resize/exit and real X11 request/channel handling. Its local display is simulated. It is not a real graphical application, OpenSSH-server configuration, installed profile/permission/UI test or untrusted SECURITY test. Unit tests mock host transports/providers and exercise cookie setup parsing, denial, backpressure, missing prerequisites, teardown and races. Do not describe either suite as desktop X11 acceptance.

Before enabling in packaged FDO, add tests through `service.cjs`, `workerBridge.cjs`, `workerLiveSource.js` and the real iframe renderer: explicit grants/denial, command-only/Git-only profiles denied, pinned-key mismatch, foreign/kind/worker handle replay, revocation during open and while idle, request flooding, slow/no consumers, malformed/split UTF-8, binary/control/ANSI data, paste, IME, resize, focus, leases, abort before/after start, lost acknowledgements, deadlines, shutdown and zero leaked resources. Existing exec/start suites must pass unchanged.

On a controlled real SSH server, launch nano, vi and less, enter password/input prompts, send Ctrl+C/Ctrl+D and resize. Test nonzero exit, EOF without exit, disconnect and a surviving background workload; UI must not claim all processes stopped. For X11 test real xeyes/xclock under Xorg/Xwayland, XQuartz and the selected Windows X server, authenticated local transport, disabled remote X11Forwarding, missing xauth/display, malformed/replayed cookies, handshake fragmentation, revoked/expired generated auth, channel caps and multiple windows. Inspect IPC, persistent plugin data and logs for cookie absence. Untrusted mode acceptance requires verifying restrictions against other display clients, not merely opening a window. Until those pass, list desktop platforms and untrusted mode as unverified/unsupported, independently of terminal availability.

Roll out the updated SDK into FDO's worker build first, then permissions/profile policy, terminal provider/bridge, renderer, and terminal-only plugin UI. Enable trusted X11 only after display preflight and explicit consent exist; enable untrusted only after the SECURITY adapter and acceptance tests exist. Update installed SDK docs/authoring skills and Remote Commands' own skill to teach the new independent flow while preserving its reviewed noninteractive batch path. Use the repository release workflow; no automatic grant migration, publishing, deployment or version bump is performed by this SDK change.
