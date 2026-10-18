# Message for the FDO host implementation agent

Implement host support for the SDK's universal secret storage and builtin SSH helper. Read the SDK's `docs/SECRETS_AND_SSH.md`, `src/utils/hostServices.ts`, and the host-service types in `src/types.ts` first. These files define the exact initial API and protocol. The SDK side is a facade; actual secure persistence and SSH execution must be implemented in FDO.

## Integration and permissions

1. Add an authenticated backend worker-to-host request/reply service. Before plugin initialization, call `PluginRegistry.configureHostServices({ request })` inside that plugin's isolated worker. The adapter must be bound to the trusted worker/plugin identity. It accepts `HostServiceRequest` and returns the action result directly, without the legacy privileged-action envelope. Use unique request IDs, bounded pending requests, disconnect cleanup and sanitized errors. Never derive identity from plugin-provided payload or metadata.
2. Integrate `secrets.set`, `secrets.get`, `secrets.delete`, `secrets.list`, `secrets.use`, `secrets.consume`, `ssh.use`, `ssh.exec`, and `ssh.profiles.list` into capability discovery, plugin installation/consent, grants, preflight and revocation. `declareCapabilities()` requests grants; it does not authorize operations. Reflect granted capabilities through the existing worker capability configuration. Independently enforce host grants on every operation; workers can bypass SDK checks. Revocation must affect existing service access.
3. Treat `secrets.use` as the base capability declaring intent to access the secret store. Each operation ALSO requires its specific capability: `secrets.use` + `secrets.get` for reads, `secrets.use` + `secrets.list` for listing, `secrets.use` + `secrets.set` for writes, and `secrets.use` + `secrets.delete` for deletion. Neither the base capability alone nor the operation alone authorizes access. Apply the same two-level permission model to SSH: `ssh.use` is the base permission, and each operation requires its specific grant too. SSH execution requires `ssh.use` + `ssh.exec`, as well as `secrets.use` + `secrets.consume`, plus profile/target authorization and a command policy. `secrets.consume` is the specific operation for host-side consumption of a secret reference; it does not return plaintext to the plugin. Profile listing requires `ssh.use` + `ssh.profiles.list` and lists only caller-authorized entries. `secrets.get` is not required to use SSH credential references.
4. Keep this bridge out of the iframe and generic UI action path. Add host-owned credential/profile UI. A plugin may receive plaintext through backend `secrets.get` when granted; never expose it through diagnostics or automatically forward it to UI.

SDK declaration example (the bundle helpers automatically include the base permission):

```typescript
import { createCapabilityBundle, createSecretsCapabilityBundle, createSSHCapabilityBundle } from "@anikitenko/fdo-sdk";

// Return this from the plugin's declareCapabilities():
const requestedCapabilities = createCapabilityBundle([
  ...createSecretsCapabilityBundle(["get", "list"]),
  ...createSSHCapabilityBundle(),
]);
// Includes secrets.use, secrets.get, secrets.list, secrets.consume,
// ssh.use, ssh.exec and ssh.profiles.list. The host still decides which requests to grant.
```

## Universal secret service

Implement per-plugin namespaced `set/get/delete/list`, matching the exact payload/result table in `docs/SECRETS_AND_SSH.md`. Support arbitrary UTF-8 strings, including API credentials, passwords, PEM keys, passphrases, and serialized JSON. Missing values return null; empty strings are valid. Locked/unavailable storage must reject, never masquerade as a missing secret.

Use OS-protected encryption at rest on Windows/macOS/Linux, with host-owned key management. Evaluate [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) for the shipped Electron version. On Linux explicitly inspect the selected encryption backend: do not silently accept basic_text or any plaintext fallback. If a secure provider is unavailable or locked, fail closed with a useful host UI remediation. Store only ciphertext and nonsecret metadata, with restrictive permissions and atomic writes. Never place plaintext in SDK JSON storage, source files, environment variables, logs or backups. Protect key/value size limits, quotas, concurrency, replacement and crash consistency.

Treat keys as case-sensitive logical names using the SDK's key grammar, not filesystem paths. Bind namespaces to stable host installation/plugin identity. Define uninstall cleanup and upgrade identity continuity explicitly. No cross-plugin access or shared secrets are part of v1. References are `{ kind: "secret", key }`; resolve them in the authenticated plugin's namespace. Validate stored reference ownership when a profile is created and again when used. Use after deletion must fail; do not retain stale decrypted credentials indefinitely.

## Builtin SSH service

Bundle [`ssh2`](https://github.com/mscdex/ssh2) as a host runtime dependency and package it for Windows, macOS and Linux. Do not require an external ssh executable. Implement `ssh.profiles.list` and `ssh.exec` exactly as specified. Profiles are configured through host-owned flows; the SDK exports `SSHConnectionProfile` as the profile contract. A profile contains id/label, host, port, username, password or private-key references, optional passphrase reference, and a trusted SHA256 host-key fingerprint. Restrict references to the caller's namespace in v1.

Require explicit host-key verification. ssh2's default accepts host keys when no hostVerifier is supplied: always set a verifier and reject missing/mismatched trust. Enroll/change trust through a deliberate host UI flow; changed keys must not be silently accepted. Be precise about fingerprint encoding: OpenSSH SHA256 fingerprints use base64 digest without padding, while ssh2 hostHash provides hexadecimal; normalize before comparing or hash the raw key yourself.

Validate profile ownership, host/port policy, command policy, numeric limits and all payload fields independently. Do not expose unrestricted SSH merely by adding ssh to a local executable allowlist. Remote commands are shell strings; do not imply argv-style injection safety or normalize arbitrary commands into something else.

Enforce separate handshake and command deadlines, host maximum ceilings, and a combined stdout/stderr byte capture limit. Return stdout/stderr, nullable exitCode/signal, durationMs, and truncated. Consume/drain excess output without retaining it and mark truncation. Nonzero command exits return results; timeouts, authentication, connection or host-key failures reject. Never automatically retry mutating commands. Handle null exit status and premature disconnection explicitly. Decode UTF-8 across chunk boundaries correctly. Release channels, sockets, listeners and pending requests on completion, failure, timeout, revocation and plugin/host teardown. Document that channel closure cannot guarantee remote process termination.

## Reusable profiles and Git over SSH

The current FDO host implements profile reuse through the existing `requestOperatorTool("git", payload)` operator path. The detailed [profile reuse and Git transport contract](./SECRETS_AND_SSH.md#reusing-ssh-profiles-for-git) documents this integration and its boundaries. The optional dedicated typed Git API proposed in the host repository is separate future work; do not add `this.git` or new `git.*` actions to use the existing path.

Current host alignment:

- Git profile use requires `system.process.exec`, `system.process.scope.git`, `ssh.use`, `ssh.exec`, `secrets.use` and `secrets.consume`. The host currently requires the SSH execution child even for Git transport. Profile consumer, target and repository read/push policy remain authoritative; a Git-only profile still does not authorize shell commands. Plaintext `secrets.get` and `ssh.profiles.list` are not needed.
- Profiles remain within one plugin namespace. Different repositories on the same endpoint can select different profiles/keys via exact host-owned repository policy. One profile may serve multiple authorized repositories. Missing/ambiguous matches reject; profile IDs grant nothing. Cross-plugin sharing is not part of this contract.
- `ssh.profiles.list` filters to the `ssh.exec` consumer and therefore excludes Git-only profiles. It now returns optional safe `host`, `port`, `username`, `authenticationType` and `trustedHostKey` fields alongside id/label. The SDK validates each independently, preserves only these fields and remains compatible with older id/label-only hosts. Never return authentication objects, reference keys, credentials or command policies. No extra permission or profile CRUD action is added.
- The host ships a binary-safe SSH helper for Git; it must not use buffered `SSHClient.exec`. Credentials remain in the host, with authenticated short-lived operation handles and lifecycle cleanup. Preserve effective endpoint/repository matching and pinned host-key trust across URL resolution, submodules and auxiliary transfers.
- Plugin CLI operations use installed, allowlisted Git; FDO's separately bundled GitOps runtime is not a plugin profile transport. Packaged Windows/macOS/Linux behavior needs actual verification. Git over HTTPS credentials remain a separate integration.
- Enrolled profile mode persists across profile deletion. Missing setup must not silently fall back to machine SSH; explicit host Settings opt-out is required to restore legacy authentication. Keep host-authorized operation syntax, separate auxiliary-target authorization and transport overrides controlled by the host.

Profile management and host-key enrollment remain host-owned. Profile edits/deletion, credential rotation and permission revocation invalidate affected work. Use the current FDO starter templates and host contract for supported CLI forms; do not claim every Git flag is authorized by the SDK's generic process payload type.

## Remote Commands follow-up

Implement the optional status/streaming adapters, cancellation and persistent save acknowledgement described in [Remote Commands host handoff](./FDO_HOST_REMOTE_COMMANDS_HANDOFF.md). This extends the original buffered service without changing its request/reply actions.

## Release compatibility

Read [minor release scope and migration](./SECRETS_AND_SSH.md#minor-release-scope-and-migration). The SDK additions are additive, but the host must recognize all new capability names, enforce the base-plus-operation model and install the backend transport before enabling the feature. The SDK handshake alone does not establish host readiness. Existing plugins need no new grants unless adopting these services. Never infer secret/SSH grants from existing storage or process permissions, and never fall back to insecure storage or an unrestricted SSH process.

## Errors, audit and verification

Transport failures expose only a safe code: ACCESS_DENIED, UNAVAILABLE, LOCKED, TIMEOUT, CANCELLED, HOST_KEY_REJECTED, CONNECTION_FAILED, or INVALID_REQUEST. Provider messages must not leak credentials. Audit identity, action, outcome and request ID without secret values or request/response bodies. Commands and stdout/stderr may also contain secrets, so do not log them by default.

Add host tests covering cross-plugin access and forged identities, each missing capability, revocation, unavailable/locked secure backends, absence of plaintext persistence/logging, missing and empty values, overwrites/deletion, malformed requests, unauthorized profiles, correct/mismatched/missing host keys, password and encrypted private-key authentication, output caps, UTF-8 chunk boundaries, nonzero/null exits, timeouts, disconnects and cleanup. Test the packaged host on all three platforms without an installed SSH executable. The SDK test suite mocks the bridge and does not verify real encryption or networking.

Do not claim complete integration until a real plugin can save a credential through host UI/backend storage and execute SSH with a reference on the packaged host. Retain synchronous SDK lifecycle hooks: register async backend handlers during init rather than making init/render async.
