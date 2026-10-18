# Universal secrets and builtin SSH

The SDK exposes `this.secrets` and `this.ssh` in plugin backend code. The FDO host must supply a backend transport using `PluginRegistry.configureHostServices(...)` before plugin initialization. Until then, calls fail closed. The SDK does not persist secrets, load encryption keys, or open SSH sockets itself. Host support is required for these APIs to work.

These services are separate from `PluginRegistry.useStore(...)`. JSON storage is suitable for nonsecret preferences and connection profile IDs. Do not put secret values in it.

## Capabilities

Declare permissions through the existing `declareCapabilities()` hook. Declaration requests host grants; it does not grant them. The host authorizes them, configures the worker's granted capabilities, and independently checks each service operation. SDK checks are a convenience, not a security boundary.

| Capability | Operation |
| --- | --- |
| `secrets.use` | Base permission to access the secret store; grants no operation by itself |
| `secrets.set` | Create or replace a secret |
| `secrets.get` | Read a plaintext secret into plugin backend memory |
| `secrets.delete` | Delete a secret |
| `secrets.list` | List names and update timestamps, never values |
| `secrets.consume` | Allow an authorized host service to consume a referenced secret (requires `secrets.use`) |
| `ssh.use` | Base permission to access SSH services; grants no operation by itself |
| `ssh.exec` | Execute a remote command on an authorized host profile |
| `ssh.terminal.open` | Open a PTY shell with separately approved arbitrary input; requires secret consumption grants and host interactive profile consent |
| `ssh.x11.forward` | Additionally authorize a selected X11 mode; display and cookies stay host-owned |
| `ssh.status.watch` | Monitor authenticated SSH reachability with freshness; also requires secret consumption grants |
| `ssh.profiles.list` | List authorized SSH command profile IDs and labels, plus optional host, port, username, authentication type and trusted host-key fingerprint; excludes credentials, secret references and command policies |

Every secret operation requires **`secrets.use` plus the specific operation capability**: for example, reading requires `secrets.use` + `secrets.get`, and listing requires `secrets.use` + `secrets.list`. Neither the base permission alone nor an operation alone is sufficient. Permission to write never implicitly permits reading or deletion.

SSH follows the same two-level model: execution requires `ssh.use` + `ssh.exec`, and profile listing requires `ssh.use` + `ssh.profiles.list`. Neither the base permission alone nor an operation alone is sufficient. Execution additionally requires `secrets.use` + `secrets.consume` for credential references. It does not require `secrets.get`. `secrets.consume` authorizes host-side use of references without returning plaintext. Profile listing is independent of execution.

`createSecretsCapabilityBundle(["get", "list"])` returns `secrets.use`, `secrets.get`, and `secrets.list` (sorted and deduplicated). `createSSHCapabilityBundle()` includes `ssh.use`, `ssh.exec`, `ssh.profiles.list`, `secrets.use`, and `secrets.consume`.

```typescript
import {
  FDO_SDK, createCapabilityBundle,
  createSecretsCapabilityBundle, createSSHCapabilityBundle,
} from "@anikitenko/fdo-sdk";

class OperationsPlugin extends FDO_SDK {
  declareCapabilities() {
    return createCapabilityBundle([
      ...createSecretsCapabilityBundle(["set", "delete"]),
      ...createSSHCapabilityBundle(),
    ]);
  }

  init(): void {
    // Register backend handlers here. Lifecycle hooks remain synchronous.
  }

  render(): string { return "<div>Remote operations</div>"; }

  async inspectServer() {
    const profiles = await this.ssh.listProfiles();
    if (!profiles.length) throw new Error("Configure an SSH connection in FDO first.");
    return this.ssh.exec({ profileId: profiles[0].id, command: "uptime" });
  }
}
```

## Secrets

`set(key, value)` creates or replaces a UTF-8 string. Tokens, passwords, PEM private keys, passphrases, and JSON-serialized credential objects all fit the same API. Empty strings are valid. `get(key)` returns a string or `null` for an absent key; locked or unavailable storage rejects instead. `delete(key)` reports whether an entry existed. `list()` returns `{ key, updatedAt }[]`.

Keys are case-sensitive opaque names: 1–128 ASCII letters, digits, dots, underscores or hyphens, beginning with a letter or digit. Keys must not contain confidential data, since names are visible as metadata. `ref(key)` returns `{ kind: "secret", key }` without contacting the host or granting access. References resolve only in the authenticated caller's namespace. They are not globally usable bearer tokens.

Raw secret entry should preferably use a host-owned credential UI. If backend plugin code receives or reads a secret, that code can access its plaintext; secure storage does not sandbox it from that plugin. Never return secret values in UI handler responses or include them in logs or diagnostics. The SDK exposes no iframe secret transport.

## SSH

`ssh.listProfiles()` returns command-authorized profile summaries with `id` and `label`, plus optional `host`, `port`, `username`, `authenticationType` (`password` or `privateKey`) and `trustedHostKey`. Each optional field is validated independently and absent on older hosts. Credentials, secret reference keys, authentication objects and command policies are excluded by the SDK allowlist. Listing still requires only `ssh.use` + `ssh.profiles.list`, with no new permission or secret read grant. The fingerprint is public trust metadata, not a private key. These summaries are not an inventory of Git-only profiles: the current host filters this action to the `ssh.exec` consumer. `ssh.exec({ profileId, command, timeoutMs?, maxOutputBytes? })` executes one noninteractive remote shell command. Defaults are a 30-second command deadline and 1 MiB combined stdout/stderr capture. The host may impose lower ceilings. Results contain `stdout`, `stderr`, `exitCode`, `signal`, `durationMs`, and `truncated`. A nonzero remote exit is a successful transport result; transport and service failures reject.

Profiles belong to the host. The exported `SSHConnectionProfile` describes an id, label, host, port, username, authentication references, and a trusted SHA256 host-key fingerprint. Password and private-key authentication are supported by the contract. Profiles must be authorized for the caller, with credential references resolved in its namespace. Profile creation, credential entry and host-key enrollment occur through host-owned flows in this initial API.

The host should bundle `ssh2`, so users need no installed SSH executable on Windows, macOS or Linux. Remote command syntax still depends on the remote shell. A command string is shell input: do not concatenate untrusted input. The host must apply its own command policy and reject unauthorized targets and commands. Do not automatically retry commands that might have already executed.

This initial API supports buffered execution. Interactive PTY terminals and optional X11 forwarding now have separate additive adapters and grants; see [Interactive SSH](./SSH_TERMINALS.md). SFTP and agent integration remain outside this API. The host must enforce deadlines and dispose channels/connections on worker teardown. Closing a channel does not guarantee the remote process has stopped.

## Live connection status and command execution

Optional host adapters now support `this.ssh.watchStatus(profileId)` (an async status iterable) and `this.ssh.start(options)` (live output events, a buffered result promise and explicit cancellation). Declare `createSSHCapabilityBundle({ monitorStatus: true })` to request monitoring in addition to existing SSH grants. Hosts without these adapters reject with `UNAVAILABLE`; `exec()` remains buffered and has no caller cancellation. Monitoring has the separate `ssh.status.watch` grant plus `ssh.use`, `secrets.use` and `secrets.consume`. These are additive SDK contracts that require host wiring, not features automatically enabled on an existing FDO installation.

See the [Remote Commands host handoff](./FDO_HOST_REMOTE_COMMANDS_HANDOFF.md) for exact adapter contracts, event consumption, freshness, termination evidence, byte budgets, JSON save acknowledgements and acceptance checks. Fresh status is an observation of SSH reachability, not a guarantee of future VM availability. Cancellation/timeout can close a channel without proving remote process termination. Default capture remains 1 MiB combined; callers can request another limit subject to host ceilings. Output sequences reflect host observation order across streams.

## Reusing SSH profiles for Git

FDO now reuses plugin-owned SSH profiles for Git through the existing `requestOperatorTool("git", payload)` path. Configure the profile's Git consumer, exact repository paths and read/push policy in Settings → Credentials & SSH. Reuse is within the same plugin namespace; cross-plugin sharing is not supported. It never copies credentials into plugin code or repository settings.

### Authorization and profile ownership

| Consumer | Required permissions and policy | Current integration |
| --- | --- | --- |
| List SSH command profiles | `ssh.use` + `ssh.profiles.list`; caller-owned, command-authorized profiles only | `this.ssh.listProfiles()` with optional safe metadata |
| Execute a remote shell command | `ssh.use` + `ssh.exec`, `secrets.use` + `secrets.consume`, profile/target/command policy | `this.ssh.exec(...)` |
| Local Git operator execution | `system.process.exec` + `system.process.scope.git`, host executable/argument/cwd/env policy | Existing operator preset |
| Profile-backed Git | Both process grants above, `ssh.use` + `ssh.exec`, `secrets.use` + `secrets.consume`, Git-consumer/repository/operation policy | Existing operator preset with current FDO host wiring |

The current host requires six grants for profile-backed Git, including `ssh.exec` as the child of `ssh.use`. This does not bypass consumer or command policy: a Git-only profile still cannot execute general shell commands. Neither `ssh.exec` nor the process scope alone grants repository access. `secrets.get` and `ssh.profiles.list` are not needed for Git authentication. No `this.git`, `git.*` capability family or Git-specific host service action ships in this SDK. A future typed Git API is a separate proposal, not a prerequisite for current Git reuse.

Declare the current Git permissions without requesting unnecessary profile listing or plaintext reads:

```typescript
import { createCapabilityBundle, createOperatorToolCapabilityPreset } from "@anikitenko/fdo-sdk";

// Return from declareCapabilities(). The host approves each grant independently.
const capabilities = createCapabilityBundle([
  ...createOperatorToolCapabilityPreset("git"),
  "ssh.use", "ssh.exec", "secrets.use", "secrets.consume",
]);
```

The host selects a profile from the effective repository URL and exact repository policy, not a plugin-supplied profile override. Two repositories on the same server and username can use different keys; one profile may authorize multiple repositories. Missing and ambiguous matches reject. Configure those bindings in Settings; `this.ssh.listProfiles()` does not list Git-only bindings and must not be used as a Git repository picker.

Keep profile IDs stable within their owner namespace. Resolve the ID against the authenticated caller and the intended consumer every time; an ID is not an access token. The host may keep authorization policy alongside a profile, but this SDK's `SSHConnectionProfile` type has no consumer-policy fields. Do not silently reinterpret a profile ID from a different plugin. Cross-plugin profile/secret sharing requires a future explicit ownership and grant contract; v1 supports reuse by authorized consumers within one plugin namespace only.

Profile creation, edits, deletion, secret selection and trust enrollment remain host-owned UI flows. No SDK profile CRUD API ships in v1. An edited host, port, username, credential reference or trust key must invalidate affected cached authentication/session state and undergo authorization again. Removing a profile or secret, revoking grants or unloading the plugin must prevent subsequent use; the host must define how it terminates active operations. Never pool authenticated connections across plugin identities or consumers with different grants. Serialize profile revisions or snapshot them per operation so a concurrent edit cannot mix old trust with new credentials.

### Git transport integration

The current host supplies a bundled binary-safe streaming helper backed by `ssh2` for profile-backed Git. Git invokes the host-controlled helper through its transport integration. Operation-scoped authenticated handles identify the authorized work; SSH credentials stay in the host and never enter Git arguments, environment variables, configuration or temporary private-key files. Plugin code must not set `GIT_SSH_COMMAND` or implement its own helper. This SDK supplies the existing operator request API; it does not ship the helper or open Git transport streams itself.

Do not implement Git transport using `this.ssh.exec()`: its UTF-8, buffered, output-limited result is intended for command output and cannot carry Git's bidirectional binary protocol. A Git transport needs binary-safe streaming, stdin EOF/half-close handling, backpressure, separate stderr, exit status, cancellation, deadlines and disconnect cleanup. Map read/fetch to the approved read-side Git service and push to the approved write-side service. Never let a transport caller turn that mapping into unrestricted remote command execution.

The current FDO plugin operator path uses an installed, allowlisted Git executable with the host's pinned SSH helper; an external SSH executable is not required for profile mode. Git itself is a separate prerequisite for plugin CLI operations. FDO GitOps has its own bundled Git runtime and does not automatically consume plugin profiles. Do not infer plugin Git availability from GitOps or SDK installation.

### Targets, trust and credential compatibility

A selected profile must match the effective Git destination after URL resolution: hostname, port and SSH username. Account for `ssh://` URLs, scp-style remotes, aliases, nondefault ports and URL rewrites. Reject conflicting destinations instead of sending a profile's credentials to whatever a repository config specifies. Authorize repository paths and read/write intent separately. Treat submodules, recursive operations, Git LFS and other auxiliary transfers as new destinations needing their own authorization; they do not inherit blanket credential access.

Protect the transport selection from repository configuration, environment overrides, custom remote helpers, hooks and caller-supplied SSH commands. Sanitize host-injected Git execution settings; isolate the approved transport from untrusted local configuration. Any future use of `GIT_SSH_COMMAND` must quote correctly on the actual platform and must not interpolate secrets or untrusted command fragments. Credentials must not be persisted into repository URLs, `.git/config`, temporary private-key files or trace logs by this integration.

Use the same enrolled host-key trust policy for Git as for command execution. Trust is bound to the endpoint and enrolled key, not just a display label. A key change requires a deliberate host trust flow for every affected consumer; never disable verification to make Git work. Do not implicitly inherit user SSH config, jump hosts, proxy commands or agent forwarding. Such features need explicit future contracts and policy. Authentication support depends on the server and the chosen Git transport; a password or key accepted for a shell account is not necessarily accepted by a Git provider.

A server may allow Git service commands while denying a general shell. For example, `git-shell` is designed for restricted Git access. Do not test profile validity by requiring `uptime`, an interactive shell, or a successful `ssh -T` exit. Validate the intended operation and interpret the server's actual result. [Git restricted-shell documentation](https://git-scm.com/docs/git-shell).

Git over HTTPS uses API tokens or other HTTPS credentials from the universal secret store through a separately authorized consumer; an SSH profile does not describe HTTPS authentication. This release adds no HTTPS Git credential helper.

### Current host behavior and verification

Profile mode is persistent after enrolling a Git-authorized profile. Removing the last profile must not silently fall back to machine SSH credentials. SSH-capable plugins without enrollment fail closed; only an explicit host Settings opt-out enables legacy authentication. Legacy behavior is separate and must not expose saved profile credentials.

The current host supports authorized URL/named-remote Git operations, including clone/fetch/push, pull, submodules and selected LFS commands under operation-specific policy. Use supported syntax and an allowlisted Git executable/cwd; arbitrary config, custom environment/stdin, force/deletion/mirror pushes and SSH overrides are rejected. Auxiliary repositories require separate profile matching. LFS HTTPS origins are restricted by host policy. The supported forms evolve in FDO, so use the installed host's contract and starter template rather than inferring unrestricted Git support from the SDK preset.


For packaged-host acceptance, verify clone/fetch/push against a controlled SSH Git server on packaged Windows, macOS and Linux hosts. Cover restricted Git-only accounts, encrypted private keys, wrong/missing/changed host keys, mismatched URL/profile endpoints, repository read versus push permissions, malicious repository transport settings, unauthorized submodule destinations, concurrent operations and profile edits, revocation/deletion, binary integrity, backpressure, helper handle replay, timeouts and cleanup. Confirm that private keys and passphrases never appear in process arguments, environment, Git config, temporary files, logs or UI responses. These are host integration checks, not assertions made by the SDK unit tests.

## Minor release scope and migration

This is an additive SDK feature suitable for a minor release when included with the associated implementation. Public additions are `this.secrets`, `this.ssh`, `SecretStore`, `SSHClient`, `HostServiceError`, `PluginRegistry.configureHostServices`, capability bundle helpers and their exported types. Existing privileged-action envelopes retain their behavior. The Remote Commands follow-up also strengthens JSON flush failure reporting as documented in the linked handoff.

Existing plugins need no changes unless adopting the new services. Adopting plugins must declare base and operation permissions, obtain host grants, and call services from backend handlers while keeping lifecycle hooks synchronous. Never migrate ordinary JSON store contents wholesale into secret storage or derive new grants from old storage/process grants. Explicitly move only user-selected secrets through an authorized host flow and remove plaintext copies as appropriate.

Older hosts can continue running existing plugins, but cannot execute the new service APIs until their backend transport is installed. New capabilities must be recognized by the host's capability parser and consent UI. The current SDK handshake does not advertise host readiness for these services: a new SDK version or successful SDK handshake alone is insufficient. Before enabling feature UI, the host must provide its own readiness/availability signal or handle unavailable service calls explicitly. Do not silently fall back to plaintext storage or unrestricted system SSH.

Release notes must distinguish the implemented SDK facade and protocol from the required FDO host encryption/network implementation. Current FDO hosts can reuse profiles through the existing Git operator API. No dedicated Git client, transport helper or new Git permission family ships inside this SDK package; these host features require a compatible FDO version. Interactive SSH and optional X11 use the separate adapter documented in [Interactive SSH](./SSH_TERMINALS.md); SFTP and agent forwarding remain outside v1. Streaming events, cancellation and connection monitoring use the optional live adapters documented above; they do not change the buffered v1 request/reply actions. End-to-end cross-platform claims require packaged host verification.

Use the repository's Release Please workflow for the version and changelog update. A conventional `feat` commit describes the additive feature; do not mark it as a breaking change or manually promise Git integration in the release title. The safe profile metadata fields are an additive extension to the SDK 1.8 service contract; older hosts returning only id/label remain compatible. Let Release Please determine the actual next version from the release baseline and commit history.

## Backend transport protocol v1

Configure one transport per isolated plugin worker/runtime. The host must bind it to a trusted plugin identity from worker bootstrap, never an identity supplied by the plugin or derived from mutable metadata. `PluginRegistry.clearPlugin()` clears the adapter; the host must also revoke its endpoint and close in-flight work. Reconfiguration invalidates in-flight SDK responses. The base transport has an asynchronous `request(HostServiceRequest)` method; optional live adapters extend it as described above. It resolves with the result object below, without a privileged-action envelope.

| Action | Payload | Result |
| --- | --- | --- |
| `secrets.set` | `{ key, value }` | `{ stored: true }` |
| `secrets.get` | `{ key }` | `{ value: string or null }` |
| `secrets.delete` | `{ key }` | `{ deleted: boolean }` |
| `secrets.list` | `{}` | `{ entries: SecretMetadata[] }` |
| `ssh.profiles.list` | `{}` | `{ profiles: SSHProfileSummary[] }` |
| `ssh.exec` | `{ profileId, command, timeoutMs, maxOutputBytes }` | `SSHExecResult` |

Failures reject with a safe `code`: `ACCESS_DENIED`, `UNAVAILABLE`, `LOCKED`, `TIMEOUT`, `CANCELLED`, `HOST_KEY_REJECTED`, `CONNECTION_FAILED`, or `INVALID_REQUEST`. The SDK wraps provider failures in `HostServiceError`, preserving only these codes and suppressing arbitrary provider messages. Unknown failures become `UNAVAILABLE`. Validation and local capability failures also reject before dispatch. SDK validation errors never interpolate secret values or host response data.

No request accepts a plugin ID, filesystem path, encryption key or raw SSH authentication material. The host must validate all requests independently, reject unknown fields, limit secret size and namespace quotas, enforce capabilities using its own policy, and avoid logging secret request/response bodies. This interface is intentionally backend-only; never route it through `window.createBackendReq` or the generic UI privileged-action handler.

See [the host implementation handoff](./FDO_HOST_SECRETS_SSH_HANDOFF.md) for the corresponding host work.
