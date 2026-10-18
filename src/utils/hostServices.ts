import type {
    HostServiceRequest, HostServicesConfiguration, SecretMetadata, SecretReference,
    SSHExecOptions, SSHExecResult, SSHProfileSummary, HostServiceErrorCode,
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

/** Host bootstrap only. The transport must be bound to a trusted plugin identity. */
export function configureHostServices(value: HostServicesConfiguration | null): void {
    if (value !== null && (!value || typeof value.request !== "function")) {
        throw new Error("Host services require a request transport.");
    }
    configuration = value === null ? undefined : Object.freeze({ request: value.request.bind(value) });
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

async function request(request: HostServiceRequest): Promise<unknown> {
    if (typeof window !== "undefined") {
        throw new Error("Host services are only available in the plugin backend runtime.");
    }
    if (request.action.startsWith("ssh.")) requireCapability("ssh.use", "access SSH services");
    if (request.action.startsWith("secrets.") || request.action === "ssh.exec") {
        requireCapability("secrets.use", "access the secret store");
    }
    requireCapability(request.action, "access host services");
    if (request.action === "ssh.exec") {
        requireCapability("secrets.consume", "consume secret references for SSH execution");
    }
    const transport = configuration;
    if (!transport) {
        throw new Error("Host services are unavailable. The FDO host must configure a backend transport before plugin initialization.");
    }
    let result: unknown;
    try {
        result = await transport.request(request);
    } catch (error) {
        const codes: HostServiceErrorCode[] = ["ACCESS_DENIED", "UNAVAILABLE", "LOCKED", "TIMEOUT", "HOST_KEY_REJECTED", "CONNECTION_FAILED", "INVALID_REQUEST"];
        const code = record(error) && codes.includes(error.code as HostServiceErrorCode)
            ? error.code as HostServiceErrorCode : "UNAVAILABLE";
        // Provider errors must not accidentally leak credentials or request payloads.
        throw new HostServiceError(code);
    }
    if (configuration !== transport) throw new HostServiceError("UNAVAILABLE");
    return result;
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
        if (!record(options) || typeof options.profileId !== "string" || !options.profileId.trim()
            || typeof options.command !== "string" || !options.command.trim() || options.command.includes("\0")) {
            throw new Error("SSH execution requires a profileId and a nonempty command without NUL characters.");
        }
        for (const value of [options.timeoutMs, options.maxOutputBytes]) {
            if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
                throw new Error("SSH timeout and output limits must be positive safe integers.");
            }
        }
        // Project allowed fields so arbitrary caller properties cannot cross the boundary.
        const result = await request({ action: "ssh.exec", payload: {
            profileId: options.profileId,
            command: options.command,
            timeoutMs: options.timeoutMs ?? 30_000,
            maxOutputBytes: options.maxOutputBytes ?? 1_048_576,
        } });
        if (!record(result) || typeof result.stdout !== "string" || typeof result.stderr !== "string"
            || (result.exitCode !== null && !Number.isSafeInteger(result.exitCode))
            || (result.signal !== null && typeof result.signal !== "string")
            || typeof result.durationMs !== "number" || !Number.isFinite(result.durationMs) || result.durationMs < 0
            || typeof result.truncated !== "boolean") invalidResponse();
        return {
            stdout: result.stdout as string, stderr: result.stderr as string,
            exitCode: result.exitCode as number | null, signal: result.signal as string | null,
            durationMs: result.durationMs as number, truncated: result.truncated as boolean,
        };
    }
}
