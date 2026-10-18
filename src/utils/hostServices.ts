import { openTerminal } from "./sshTerminal";
import type {
    HostServiceRequest, HostServicesConfiguration, SecretMetadata, SecretReference,
    SSHExecOptions, SSHExecResult, SSHProfileSummary, HostServiceErrorCode,
    SSHTerminalOptions, SSHTerminalSession, SSHExecution, SSHConnectionStatus, SSHOutputEvent, SSHCancelResult, HostServiceCapability,
} from "../types";
import { requireCapability } from "./capabilities";

/** Safe, stable host failure code. Provider messages and payloads are deliberately excluded. */
export class HostServiceError extends Error {
    readonly code: HostServiceErrorCode;
    constructor(code: HostServiceErrorCode) {
        super(`Host service request failed (${code}).`);
        this.name = "HostServiceError";
        this.code = code;
    }
}

let configuration: Readonly<HostServicesConfiguration> | undefined;
const activeResources = new Set<() => void>();

/** Host bootstrap only. The transport must be bound to a trusted plugin identity. */
export function configureHostServices(value: HostServicesConfiguration | null): void {
    if (value !== null && (!value || typeof value.request !== "function")) {
        throw new Error("Host services require a request transport.");
    }
    for (const key of ["watchSSHStatus", "startSSHExecution", "openSSHTerminal"] as const) {
        if (value?.[key] !== undefined && typeof value[key] !== "function") throw new Error("Invalid SSH host adapter.");
    }
    for (const cleanup of activeResources) cleanup();
    activeResources.clear();
    configuration = value === null ? undefined : Object.freeze({
        request: value.request.bind(value),
        openSSHTerminal: value.openSSHTerminal?.bind(value),
        watchSSHStatus: value.watchSSHStatus?.bind(value),
        startSSHExecution: value.startSSHExecution?.bind(value),
    });
}

function validKey(key: unknown): asserts key is string {
    // Keys are opaque names, never filesystem paths. Reject rather than normalize aliases.
    if (typeof key !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(key)) {
        throw new Error("Secret key must be 1–128 ASCII letters, digits, dots, underscores or hyphens, starting with a letter or digit.");
    }
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
    // Never interpolate host data: a malformed response could contain a secret.
    throw new Error("Invalid host service response.");
}

function authorize(action: HostServiceCapability): void {
    if (typeof window !== "undefined") {
        throw new Error("Host services are only available in the plugin backend runtime.");
    }
    if (action.startsWith("ssh.")) requireCapability("ssh.use", "access SSH services");
    if (action.startsWith("secrets.") || action === "ssh.exec" || action === "ssh.status.watch" || action === "ssh.terminal.open" || action === "ssh.x11.forward") {
        requireCapability("secrets.use", "access the secret store");
    }
    requireCapability(action, "access host services");
    if (action === "ssh.exec" || action === "ssh.status.watch" || action === "ssh.terminal.open" || action === "ssh.x11.forward") {
        requireCapability("secrets.consume", "consume secret references for SSH");
    }
}

function safeError(error: unknown): HostServiceError {
    const codes: HostServiceErrorCode[] = ["ACCESS_DENIED", "UNAVAILABLE", "LOCKED", "TIMEOUT", "CANCELLED", "HOST_KEY_REJECTED", "CONNECTION_FAILED", "INVALID_REQUEST", "BACKPRESSURE", "SESSION_CLOSED", "IDLE_TIMEOUT", "SESSION_LIMIT",
        "X11_UNSUPPORTED", "X11_UNAVAILABLE", "X11_AUTH_UNAVAILABLE", "X11_FORWARDING_DENIED"];
    return new HostServiceError(record(error) && codes.includes(error.code as HostServiceErrorCode)
        ? error.code as HostServiceErrorCode : "UNAVAILABLE");
}

function getTransport(action: HostServiceCapability): Readonly<HostServicesConfiguration> {
    authorize(action);
    if (!configuration) {
        throw new Error("Host services are unavailable. The FDO host must configure a backend transport before plugin initialization.");
    }
    return configuration;
}

function assertCurrent(transport: Readonly<HostServicesConfiguration>, action: HostServiceCapability): void {
    if (configuration !== transport) throw new HostServiceError("UNAVAILABLE");
    authorize(action);
}

async function request(request: HostServiceRequest): Promise<unknown> {
    const transport = getTransport(request.action);
    let result: unknown;
    try { result = await transport.request(request); }
    catch (error) { throw safeError(error); }
    assertCurrent(transport, request.action);
    return result;
}

function execOptions(options: SSHExecOptions): Required<SSHExecOptions> {
    if (!record(options) || typeof options.profileId !== "string" || !options.profileId.trim()
        || typeof options.command !== "string" || !options.command.trim() || options.command.includes("\0")) {
        throw new Error("SSH execution requires a profileId and a nonempty command without NUL characters.");
    }
    for (const value of [options.timeoutMs, options.maxOutputBytes]) {
        if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
            throw new Error("SSH timeout and output limits must be positive safe integers.");
        }
    }
    return { profileId: options.profileId, command: options.command,
        timeoutMs: options.timeoutMs ?? 30_000, maxOutputBytes: options.maxOutputBytes ?? 1_048_576 };
}

function execResult(result: unknown, maxBytes: number): SSHExecResult {
    if (!record(result) || typeof result.stdout !== "string" || typeof result.stderr !== "string"
        || (result.exitCode !== null && !Number.isSafeInteger(result.exitCode))
        || (result.signal !== null && typeof result.signal !== "string")
        || typeof result.durationMs !== "number" || !Number.isFinite(result.durationMs) || result.durationMs < 0
        || typeof result.truncated !== "boolean"
        || Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) > maxBytes) invalidResponse();
    return { stdout: result.stdout, stderr: result.stderr,
        exitCode: result.exitCode as number | null, signal: result.signal as string | null,
        durationMs: result.durationMs, truncated: result.truncated };
}

function iteratorFor(source: unknown): AsyncIterator<unknown> {
    if (!source || typeof (source as AsyncIterable<unknown>)[Symbol.asyncIterator] !== "function") invalidResponse();
    const iterator = (source as AsyncIterable<unknown>)[Symbol.asyncIterator]();
    if (!iterator || typeof iterator.next !== "function") invalidResponse();
    return iterator;
}

async function nextHostEvent(iterator: AsyncIterator<unknown>): Promise<IteratorResult<unknown>> {
    try { return await iterator.next(); }
    catch (error) { throw safeError(error); }
}

function closeIterator(iterator: AsyncIterator<unknown>): void {
    try { void Promise.resolve(iterator.return?.()).catch(() => {}); } catch { /* Best-effort teardown. */ }
}

/** Universal plugin-scoped secret storage. Persistence and isolation belong to the host. */
export class SecretStore {
    /** Create or replace a UTF-8 string (tokens, PEM keys, passwords or serialized credentials). */
    async set(key: string, value: string): Promise<void> {
        validKey(key);
        if (typeof value !== "string") throw new Error("Secret value must be a string.");
        const result = await request({ action: "secrets.set", payload: { key, value } });
        if (!record(result) || result.stored !== true) invalidResponse();
    }

    /** Returns null only for a missing key. Unavailable/locked storage must reject. */
    async get(key: string): Promise<string | null> {
        validKey(key);
        const result = await request({ action: "secrets.get", payload: { key } });
        if (!record(result) || (result.value !== null && typeof result.value !== "string")) invalidResponse();
        return result.value as string | null;
    }

    async delete(key: string): Promise<boolean> {
        validKey(key);
        const result = await request({ action: "secrets.delete", payload: { key } });
        if (!record(result) || typeof result.deleted !== "boolean") invalidResponse();
        return result.deleted as boolean;
    }

    /** Returns names and timestamps only. Secret values are never part of this result. */
    async list(): Promise<SecretMetadata[]> {
        const result = await request({ action: "secrets.list", payload: {} });
        if (!record(result) || !Array.isArray(result.entries)) invalidResponse();
        return (result.entries as unknown[]).map(entry => {
            if (!record(entry) || typeof entry.updatedAt !== "string" || !Number.isFinite(Date.parse(entry.updatedAt))) invalidResponse();
            validKey(entry.key);
            return { key: entry.key as string, updatedAt: entry.updatedAt as string };
        });
    }

    /** A reference grants no access; the host resolves it in the authenticated caller's namespace. */
    ref(key: string): SecretReference {
        validKey(key);
        return Object.freeze({ kind: "secret" as const, key });
    }
}

/** Builtin SSH facade. The host ships the SSH implementation and owns connection profiles. */
export class SSHClient {
    /** PTY shell with explicit interactive authorization; never falls back to exec/start. */
    async openTerminal(options: SSHTerminalOptions, signal?: AbortSignal): Promise<SSHTerminalSession> {
        let transport: Readonly<HostServicesConfiguration>;
        try { transport = getTransport("ssh.terminal.open"); }
        catch { throw new HostServiceError(configuration ? "ACCESS_DENIED" : "UNAVAILABLE"); }
        const wantsX11 = options?.x11 !== undefined;
        const check = () => {
            try {
                assertCurrent(transport, "ssh.terminal.open");
                if (wantsX11) assertCurrent(transport, "ssh.x11.forward");
            } catch { throw new HostServiceError(configuration === transport ? "ACCESS_DENIED" : "UNAVAILABLE"); }
        };
        check();
        return openTerminal(options, signal, transport.openSSHTerminal, check, activeResources, safeError);
    }

    async listProfiles(): Promise<SSHProfileSummary[]> {
        const result = await request({ action: "ssh.profiles.list", payload: {} });
        if (!record(result) || !Array.isArray(result.profiles)) invalidResponse();
        return (result.profiles as unknown[]).map(profile => {
            if (!record(profile) || typeof profile.id !== "string" || !profile.id || typeof profile.label !== "string") invalidResponse();
            const summary: SSHProfileSummary = { id: profile.id as string, label: profile.label as string };
            for (const field of ["host", "username"] as const) {
                const value = profile[field];
                if (value !== undefined) {
                    if (typeof value !== "string" || !value.trim() || /[\0\r\n]/.test(value)) invalidResponse();
                    summary[field] = value;
                }
            }
            if (profile.port !== undefined) {
                if (typeof profile.port !== "number" || !Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) invalidResponse();
                summary.port = profile.port;
            }
            if (profile.authenticationType !== undefined) {
                if (profile.authenticationType !== "password" && profile.authenticationType !== "privateKey") invalidResponse();
                summary.authenticationType = profile.authenticationType;
            }
            if (profile.trustedHostKey !== undefined) {
                if (typeof profile.trustedHostKey !== "string" || profile.trustedHostKey.length !== 50 || !/^SHA256:[A-Za-z0-9+/]{43}$/.test(profile.trustedHostKey)) invalidResponse();
                summary.trustedHostKey = profile.trustedHostKey;
            }
            return summary;
        });
    }

    /** Buffered noninteractive execution; remote nonzero exits are returned, transport failures reject. */
    async exec(options: SSHExecOptions): Promise<SSHExecResult> {
        const payload = execOptions(options);
        return execResult(await request({ action: "ssh.exec", payload }), payload.maxOutputBytes);
    }

    /** Requires an optional host monitor adapter and ssh.status.watch; break/return unsubscribes. */
    async *watchStatus(profileId: string): AsyncIterableIterator<SSHConnectionStatus> {
        if (typeof profileId !== "string" || !profileId.trim()) throw new Error("SSH monitoring requires a profileId.");
        const transport = getTransport("ssh.status.watch");
        if (!transport.watchSSHStatus) throw new HostServiceError("UNAVAILABLE");
        let source: AsyncIterable<unknown>;
        try { source = await transport.watchSSHStatus({ profileId }); }
        catch (error) { throw safeError(error); }
        const iterator = iteratorFor(source);
        const cleanup = () => closeIterator(iterator);
        activeResources.add(cleanup);
        try {
            while (true) {
                assertCurrent(transport, "ssh.status.watch");
                const next = await nextHostEvent(iterator);
                assertCurrent(transport, "ssh.status.watch");
                if (next.done) return;
                const status = next.value;
                if (!record(status) || status.profileId !== profileId
                    || !["unknown", "connecting", "connected", "disconnected"].includes(status.state as string)
                    || !(status.checkedAt === null && status.state === "unknown"
                        || typeof status.checkedAt === "string" && Number.isFinite(Date.parse(status.checkedAt)))
                    || !Number.isSafeInteger(status.staleAfterMs) || (status.staleAfterMs as number) <= 0) invalidResponse();
                yield { profileId, state: status.state as SSHConnectionStatus["state"],
                    checkedAt: status.checkedAt as string | null, staleAfterMs: status.staleAfterMs as number };
            }
        } finally {
            activeResources.delete(cleanup);
            cleanup();
        }
    }

    /** Live output and explicit cancellation; requires the optional host execution adapter. No retries. */
    async start(options: SSHExecOptions): Promise<SSHExecution> {
        const payload = execOptions(options);
        const transport = getTransport("ssh.exec");
        if (!transport.startSSHExecution) throw new HostServiceError("UNAVAILABLE");
        let host: Awaited<ReturnType<NonNullable<HostServicesConfiguration["startSSHExecution"]>>>;
        try { host = await transport.startSSHExecution(payload); }
        catch (error) { throw safeError(error); }
        if (!host || typeof host.cancel !== "function" || !host.result || typeof host.result.then !== "function") invalidResponse();
        let iterator: AsyncIterator<unknown> | undefined;
        let resultSettled = false;
        let eventsClosed = false;
        let closingEvents: Promise<void> | undefined;
        let cleaned = false;
        const releaseIfFinished = () => {
            if (resultSettled && eventsClosed) activeResources.delete(cleanup);
        };
        const closeEvents = (): Promise<void> => {
            if (!closingEvents) {
                let closing: Promise<unknown>;
                try { closing = Promise.resolve(iterator?.return?.()); }
                catch { closing = Promise.resolve(); }
                closingEvents = closing.catch(() => {}).then(() => {
                    eventsClosed = true;
                    releaseIfFinished();
                });
            }
            return closingEvents;
        };
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            activeResources.delete(cleanup);
            void closeEvents();
            // Register cancellation before validating events: start already launched the command.
            try { void Promise.resolve(host.cancel()).catch(() => {}); } catch { /* Best-effort teardown. */ }
        };
        activeResources.add(cleanup);
        // Attach immediately: a caller may be consuming events before awaiting result.
        const result = Promise.resolve(host.result).then(value => {
            assertCurrent(transport, "ssh.exec");
            return execResult(value, payload.maxOutputBytes);
        }, error => {
            assertCurrent(transport, "ssh.exec");
            throw safeError(error);
        });
        const settleResult = () => { resultSettled = true; releaseIfFinished(); };
        void result.then(settleResult, settleResult);
        let outputIterator: AsyncIterator<unknown>;
        try {
            outputIterator = iterator = iteratorFor(host.events);
            assertCurrent(transport, "ssh.exec");
        } catch (error) { cleanup(); throw error; }
        let cancelPromise: Promise<SSHCancelResult> | undefined;
        const cancel = async (): Promise<SSHCancelResult> => {
            assertCurrent(transport, "ssh.exec");
            return cancelPromise ??= Promise.resolve().then(() => host.cancel()).catch(error => { throw safeError(error); }).then(value => {
                assertCurrent(transport, "ssh.exec");
                if (!record(value) || (value.remoteProcessStopped !== null && typeof value.remoteProcessStopped !== "boolean")) invalidResponse();
                return { remoteProcessStopped: value.remoteProcessStopped as boolean | null };
            });
        };
        let sequence = 0;
        let bytes = 0;
        let consumed = false;
        const events: AsyncIterable<SSHOutputEvent> = {
            async *[Symbol.asyncIterator]() {
                if (consumed) throw new Error("SSH output supports one consumer.");
                consumed = true;
                try {
                    while (true) {
                        assertCurrent(transport, "ssh.exec");
                        const next = await nextHostEvent(outputIterator);
                        assertCurrent(transport, "ssh.exec");
                        if (next.done) return;
                        const event = next.value;
                        if (!record(event) || event.sequence !== sequence++
                            || (event.stream !== "stdout" && event.stream !== "stderr") || typeof event.data !== "string") invalidResponse();
                        bytes += Buffer.byteLength(event.data);
                        if (bytes > payload.maxOutputBytes) invalidResponse();
                        yield { sequence: event.sequence as number, stream: event.stream, data: event.data };
                    }
                } catch (error) {
                    cleanup();
                    throw error;
                } finally { await closeEvents(); }
            },
        };
        return { events, result, cancel };
    }
}
