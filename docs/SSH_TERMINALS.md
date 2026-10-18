# Interactive SSH terminals and optional X11

`ssh.openTerminal(options, signal?)` adds a separately authorized PTY shell. `ssh.exec()` and `ssh.start()` remain noninteractive, with their existing capture, timeout and command-policy behavior. There is no fallback between these APIs and no automatic retry after an uncertain start. SDK installation alone does not enable a terminal: FDO must install `openSSHTerminal`, authenticated IPC operations, lifecycle cleanup and a terminal renderer. See the [exact host handoff](./FDO_HOST_TERMINAL_X11_HANDOFF.md).

## Backend API

Declare `createSSHCapabilityBundle({terminal: true})`. Add `x11: true` only if the plugin offers forwarding; this requests a separate `ssh.x11.forward` grant. Declarations never approve grants. Existing bundles retain their permissions. Terminal operations require `ssh.use`, `ssh.terminal.open`, `secrets.use`, `secrets.consume`, and explicit host profile authorization for arbitrary interactive input. `ssh.exec` and an allowlisted command are insufficient. Host settings must make that distinction visible before granting access.

```typescript
const session = await this.ssh.openTerminal({
  profileId, term: 'xterm-256color', rows: 24, columns: 80,
  idleTimeoutMs: 300_000, sessionTimeoutMs: 3_600_000,
}, abortController.signal);
// Consume concurrently with result; publishBytes must wait for renderer acknowledgement.
const outputDone = (async () => {
  for await (const {sequence, data} of session.output) await publishBytes(sequence, data);
})();
try {
  await session.write('nano notes.txt\r');
  await session.resize(40, 120);
  const [result] = await Promise.all([session.result, outputDone]);
  showExit(result);
} finally {
  await session.close();
}
```

`profileId`, the controller, renderer publication and exit UI are supplied by the plugin. Public types are `SSHTerminalOptions`, `SSHTerminalOpenOptions`, `SSHTerminalSession`, `SSHTerminalOutput`, `SSHTerminalResult` and `HostSSHTerminalSession`. No session ID, cookie, local display or socket is exposed by the SDK session object.

| Operation | Meaning |
| --- | --- |
| `output` | Single-consumer async iterable of `{sequence, data: Uint8Array}`; no prefetch in SDK |
| `write(string or Uint8Array)` | UTF-8 text or exact bytes; acknowledgement means host write/drain, not remote execution |
| `resize(rows, columns)` | Ordered with input; sends SSH window change, not a shell command |
| `endInput()` | Idempotent SSH stdin EOF/half-close; does not close output or prove shell termination |
| `result` | Confirmed shell exit/status, channel closure, cancellation, or safe typed failure |
| `close()` | Idempotent release of terminal and forwarding; not a remote kill acknowledgement |
| `cancel()` | Idempotent termination request; separate `{remoteProcessStopped: boolean or null}` evidence |
| Abort signal | Reject pending open with `CANCELLED`, close a late acknowledged session; active abort requests cancellation |

Ctrl+C is input byte `0x03` (`write('\x03')`), interpreted by remote PTY settings; it is not a session cancellation request. Ctrl+D is terminal input `0x04`, distinct from SSH EOF. Do not locally echo input; the remote PTY normally controls echo, including password prompts. PTY output typically combines stdout and stderr. Any separate provider extended data is merged by the host in observation order; there is no separate stderr API for this terminal.

`result.reason` is `exited`, `closed` or `cancelled`. An exited result requires an actual SSH exit status or exit signal. A closed result has null exit code, signal and termination evidence. `remoteProcessStopped` refers to the shell/workload for which affirmative evidence exists, never all child jobs. Closing a socket, sending a signal, timing out, or losing the view cannot establish that evidence. Cancellation racing an already settled result preserves it. A supervisor protocol would be needed for guaranteed descendant termination. Failures such as disconnect and deadlines reject `result` with `HostServiceError`; attach handlers immediately while consuming output. A result may settle before its queued output is drained.

## Bytes, ordering and pressure

Output preserves every byte, including ANSI/VT sequences; the SDK neither strips escape sequences nor renders HTML. Each event contains 1–32768 bytes with a contiguous zero-based sequence. The SDK copies byte arrays at its boundary. Ordering is the host's observed channel order. Input writes, resize and EOF are serialized in call order. One output `next()` may be outstanding; concurrent reads reject with `BACKPRESSURE`.

Prefer passing raw bytes to the emulator. If converting to text, use one incremental UTF-8 decoder for the entire merged stream, never decode each packet independently:

```typescript
const decoder = new TextDecoder('utf-8', {fatal: false});
for await (const event of session.output) {
  await consumeText(decoder.decode(event.data, {stream: true}));
}
await consumeText(decoder.decode());
```

Malformed UTF-8 becomes replacement characters only at this decoding boundary; binary input/output remains exact. Text input encodes each `write(string)` separately; do not split a UTF-16 surrogate pair across calls. Use raw bytes for other encodings. Do not apply text/UTF-8 processing to X11 protocol data.

The SDK admits at most 32 pending input/control operations and 64 KiB of pending input, each write <=32 KiB. It rejects excess before dispatch; the rejected operation was not accepted and must not be silently ignored. A failed dispatched write can have an ambiguous remote prefix: close the session and report the failure, never replay it. No SDK output queue or total transcript capture exists. The host reference uses a 64 KiB output high-water mark, 256 KiB hard application output queue limit and 32 KiB packets. Inspected ssh2 1.17 additionally uses a 2 MiB channel window and 2 MiB stream high-water marks; these are provider buffers outside the application queue, not a promised 256 KiB total session budget. There is no public window-size tuning option in the inspected client API; budget those buffers or change the host provider deliberately. The host pauses upstream reads and grants credits only as consumers acknowledge bytes. If lossless delivery cannot be maintained, fail with `BACKPRESSURE` and close the session; never drop or truncate a terminal sequence and continue.

The example holds one output packet until the iframe acknowledges emulator consumption, then pulls the next. Repeated polls return the same sequence; the view must deduplicate. Never acknowledge on receipt alone, or use an unbounded polling/push queue. Keep output draining independent of input/cancel operations; blocking on `next()` or `result` must not occupy the host operation scheduler. All bridge queues, event counts, bytes, requests and handles need their own host bounds.

Defaults: idle five minutes, absolute session one hour; SDK request ceilings are one hour idle and 24 hours absolute. Dimensions are 1–1000 each; terminal names are 1–64 restricted ASCII characters. The host can impose lower limits and must explain its effective policy in Settings. Idle time resets on accepted keyboard/control activity and view lease renewal, not on remote output; output-only loops must not extend sessions forever. A missing view lease expires in 30 seconds. Suggested limits are four terminals per worker, 16 per host and eight X11 channels per terminal. Host handshake/open and control deadlines remain independent of idle/session timers.

Safe new codes are `BACKPRESSURE`, `SESSION_CLOSED`, `IDLE_TIMEOUT`, `SESSION_LIMIT`, `X11_UNSUPPORTED`, `X11_UNAVAILABLE`, `X11_AUTH_UNAVAILABLE` and `X11_FORWARDING_DENIED`, in addition to existing host-service codes. No provider error text, output, credentials, cookie, path or display details belong in these errors or logs.

## Terminal UI and example

Inspection found `BuildOutputTerminalComponent`/`AnsiOutput` in FDO: a React build-output viewer supporting SGR styles, not cursor addressing, alternate screens, input, or PTY emulation. ACE is an editor; neither it nor `<pre>` supports nano/vi/less. The [injected library inventory](./INJECTED_LIBRARIES.md) has no terminal emulator. This SDK adds no terminal-emulator npm dependency.

[The minimal plugin](../examples/18-interactive-ssh-plugin.ts) keeps session objects in its backend, returns short open acknowledgements, sends one acknowledged output packet at a time, bounds keyboard traffic and uses a 30-second view lease. It demonstrates terminal-only mode and a separately selected X11 mode. It intentionally reports a missing renderer on existing hosts. It is an instructional single-view plugin; production Remote Commands should incorporate the same flow into its existing view lifecycle, not replace its reviewed batch executor.

FDO must inject and document a new terminal renderer. The example's **proposed**, not currently installed, `window.FDOTerminal` wrapper contract is:

- `create(element, {term, rows, columns})` returns `write(Uint8Array, consumedCallback)`, `onData(callback)`, `onResize(callback)`, `focus()`, `getSize()` (actual `{rows,columns}`), `reset()` and `dispose()`.
- Event subscriptions return `{dispose()}`. `onData` produces terminal input strings; the host renderer handles keys, modifiers, paste, IME and terminal modes. It must support binary byte writes and callback backpressure.
- FDO may implement this with a vetted VT emulator and a resize addon in its own iframe injection pipeline; include its styles there. Do not assume arbitrary imports work inside a serialized `renderOnLoad` callback.
- Fit to the visible content area using ResizeObserver, coalesce pending size changes, and send the actual rows/columns after session readiness. Preserve focus across output; focus only on explicit open/click, never steal it from other controls. Provide visible focus, accessible labeling, selection/copy and deliberate paste behavior. Do not capture global shortcuts outside the focused terminal. Keep keyboard input disabled until the session is ready, and bind queued input to the specific session generation so it cannot reach a later session.
- Default-deny remote clipboard writes (e.g. OSC 52), automatic link navigation and privileged escape-sequence integrations. Remote output is untrusted terminal data, never HTML.
- On view release, dispose keyboard/resize listeners, observers, subscriptions and emulator; explicitly release the backend lease. Pagehide is best-effort; the host must independently close sessions on teardown/revocation/disconnect. Never depend on DOM or iterator finalizers for host cleanup.

## Optional graphical applications

```typescript
const session = await this.ssh.openTerminal({profileId, x11: {mode: 'untrusted'}});
// Only after separate host consent and successful negotiation:
await session.write('xeyes\r');
// The windows appear on the local X server, outside the FDO iframe.
```

Omit `x11` to leave it off. Selecting a mode requests it exactly; never downgrade untrusted to trusted or continue terminal opening with forwarding silently disabled after a denied request. The user can explicitly open a new terminal without forwarding. Display discovery, local socket addressing, local authorization and spoof cookies are strictly host-owned. The host transport exposes no cookie, authorization reference or local display address to the UI or plugin persistence/logs. Real local authorization never reaches the remote server. An unrestricted remote shell can itself print remote data, including its per-session spoof authorization; lossless PTY streaming cannot promise to censor that remote-generated text. The spoof authorization is session-scoped and cannot authenticate directly to the local X server. Do not persist or log terminal output by default. Host profile credentials and pinned host keys are reused, without granting plaintext `secrets.get`.

Real SSH X11 forwarding requires an `x11-req` and handling incoming `x11` channels. The [host reference gate](../examples/host/x11Forwarding.cjs) verifies a random per-session spoof MIT-MAGIC-COOKIE-1 authorization in each fragmented X11 setup packet before connecting to the local display, then substitutes the host-held local authorization. It handles byte order, length/protocol checks, setup deadlines, channel caps, bidirectional piping and teardown. It is not `DISPLAY` injection, SSH TCP port forwarding, or an `xhost +` workaround. It requires a dedicated SSH connection per terminal because incoming X11 channels are connection-scoped. The real local cookie never goes to the remote server. See [RFC 4254 §6.3](https://www.rfc-editor.org/rfc/rfc4254.html#section-6.3).

Trusted forwarding grants remote X clients broad access to the local display and potentially other clients' input or data. Untrusted forwarding needs an actual restricted authorization generated and enforced by the local X SECURITY extension (and expiry/revocation), typically via host-owned xauth tooling. `ssh2` exposes forwarding requests but has no OpenSSH `-X` isolation mode switch. A spoof cookie alone provides authentication, not untrusted isolation. The reference helper accepts a host assertion of an actual generated untrusted authorization; the supplied host integration must return `X11_UNSUPPORTED` until it implements and verifies that facility. Never set that assertion from a plugin field. See [X SECURITY](https://xorg.freedesktop.org/archive/X11R7.7/doc/xextproto/security.html) and [OpenSSH forwarding semantics](https://man.openbsd.org/ssh.1).

| Platform/prerequisite | Requirement and current verification |
| --- | --- |
| Linux desktop | Local Xorg or compatible Xwayland display with authenticated local socket and MIT cookie; headless hosts require a separately provisioned display |
| macOS | Running XQuartz and usable host-owned display socket/authorization; Electron startup environment may lack DISPLAY; discover in host settings |
| Windows | An X server with authenticated local transport usable by the host; platform adapter required, no unauthenticated TCP fallback |
| Remote server | SSH X11 forwarding allowed (e.g. X11Forwarding), xauth path/tooling where required, X11 application installed, PTY/shell permitted |
| Untrusted mode | Local X SECURITY plus a generated restricted authorization and lifetime management; unsupported by default |
| Actual tests | Node mock suites and real loopback ssh2 integration on macOS, using a simulated local X server; no XQuartz/Xorg/Windows GUI or packaged-host testing |

Missing/unsupported display or provider maps to `X11_UNAVAILABLE`/`X11_UNSUPPORTED`; missing authorization/tooling maps to `X11_AUTH_UNAVAILABLE`; rejected SSH negotiation maps to `X11_FORWARDING_DENIED`. Host preflight must check prerequisites before starting the shell, and a negotiation failure must release all allocated state. The combined ssh2 shell callback cannot always distinguish PTY/shell denial from X11 request denial; with X11 requested the reference adapter returns `X11_FORWARDING_DENIED` without leaking provider diagnostics. Server-side investigation remains a host diagnostic task.

X11 forwarding does not automatically support native Wayland applications; applications must use an X11 backend. It does not embed windows inside FDO. Embedding requires a separate remote-display/compositing solution. SFTP, agent forwarding, arbitrary TCP forwarding, native Wayland transport, guaranteed descendant termination, and automatic reconnect/resume are outside this API.
