import {
    CapabilityPreflightMissingDiagnostic,
    CapabilityPreflightReport,
    CapabilityConfiguration,
    CapabilityDescriptor,
    MissingCapabilityDiagnostic,
    PluginCapability,
} from "../types";

type CapabilityAudit = {
    usageCount: Record<string, number>;
    deniedCount: Record<string, number>;
};

const grantedCapabilities = new Set<PluginCapability>();
const audit: CapabilityAudit = {
    usageCount: {},
    deniedCount: {},
};
const STORAGE_BACKEND_CAPABILITY_PREFIX = "storage.";
const AI_CAPABILITY_PREFIX = "system.ai.";
const AI_OPERATIONS = new Set(["assistants.list", "request"]);
const NETWORK_CAPABILITY_PREFIX = "system.network.";
const NETWORK_TRANSPORTS = new Set(["https", "http", "websocket", "tcp", "udp", "dns"]);
const NETWORK_SCOPE_CAPABILITY_PREFIX = "system.network.scope.";
const FILESYSTEM_SCOPE_CAPABILITY_PREFIX = "system.fs.scope.";
const PROCESS_SCOPE_CAPABILITY_PREFIX = "system.process.scope.";
const HOST_WRITE_CAPABILITY = "system.host.write";
const HOSTS_WRITE_CAPABILITY = "system.hosts.write";
const MISSING_CAPABILITY_ERROR_PATTERN = /^Capability "([^"]+)" is required to (.+)\. Configure PluginRegistry\.configureCapabilities\(\{ granted: \["[^"]+"\] \}\) in the host before plugin initialization\.$/;

function increment(counter: Record<string, number>, key: string): void {
    counter[key] = (counter[key] ?? 0) + 1;
}

function normalizeCapabilityList(capabilities: Array<PluginCapability | string>): string[] {
    return Array.from(
        new Set(
            capabilities
                .map((entry) => String(entry || "").trim())
                .filter(Boolean)
        )
    ).sort((left, right) => left.localeCompare(right));
}

function getCapabilityAliases(capability: string): string[] {
    if (capability === HOST_WRITE_CAPABILITY) {
        return [HOSTS_WRITE_CAPABILITY];
    }
    if (capability === HOSTS_WRITE_CAPABILITY) {
        return [HOST_WRITE_CAPABILITY];
    }
    return [];
}

function normalizeScopeId(scopeId: string): string {
    return scopeId.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeStorageBackendId(backendId: string): string {
    return backendId.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeNetworkTransportId(transport: string): string {
    return transport.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildMissingCapabilityErrorMessage(capability: PluginCapability, action: string): string {
    return `Capability "${capability}" is required to ${action}. Configure PluginRegistry.configureCapabilities({ granted: ["${capability}"] }) in the host before plugin initialization.`;
}

function getCapabilityPrerequisites(capability: string): string[] {
    const prerequisites = new Set<string>();

    if (capability.startsWith(STORAGE_BACKEND_CAPABILITY_PREFIX)) {
        prerequisites.add("storage");
    }

    if (
        capability.startsWith(AI_CAPABILITY_PREFIX)
        && capability !== "system.ai"
    ) {
        prerequisites.add("system.ai");
    }

    if (capability.startsWith(PROCESS_SCOPE_CAPABILITY_PREFIX)) {
        prerequisites.add("system.process.exec");
    }

    if (capability.startsWith(FILESYSTEM_SCOPE_CAPABILITY_PREFIX)) {
        prerequisites.add(HOSTS_WRITE_CAPABILITY);
    }

    if (capability.startsWith(NETWORK_SCOPE_CAPABILITY_PREFIX)) {
        prerequisites.add("system.network");
    }

    if (
        capability.startsWith(NETWORK_CAPABILITY_PREFIX)
        && capability !== "system.network"
        && !capability.startsWith(NETWORK_SCOPE_CAPABILITY_PREFIX)
    ) {
        prerequisites.add("system.network");
    }

    prerequisites.delete(capability);
    return Array.from(prerequisites).sort((left, right) => left.localeCompare(right));
}

function buildCapabilityPreflightRemediation(capability: string): string {
    const prerequisites = getCapabilityPrerequisites(capability);
    const requiredCapabilities = normalizeCapabilityList([capability, ...prerequisites]);
    const snippet = requiredCapabilities.map((entry) => `"${entry}"`).join(", ");

    if (prerequisites.length === 0) {
        return `Grant "${capability}" in the host capability configuration before plugin initialization. Configure PluginRegistry.configureCapabilities({ granted: [${snippet}] }) in the host before plugin initialization.`;
    }

    return `Grant "${capability}" with prerequisite capabilities ${prerequisites.map((entry) => `"${entry}"`).join(", ")} before plugin initialization. Configure PluginRegistry.configureCapabilities({ granted: [${snippet}] }) in the host before plugin initialization.`;
}

export function configureCapabilities(configuration: CapabilityConfiguration): void {
    grantedCapabilities.clear();
    for (const capability of configuration.granted) {
        grantedCapabilities.add(capability);
        for (const alias of getCapabilityAliases(capability)) {
            grantedCapabilities.add(alias as PluginCapability);
        }
    }
}

export function requireCapability(capability: PluginCapability, action: string): void {
    increment(audit.usageCount, capability);

    if (grantedCapabilities.has(capability)) {
        return;
    }
    for (const alias of getCapabilityAliases(capability)) {
        if (grantedCapabilities.has(alias as PluginCapability)) {
            return;
        }
    }

    increment(audit.deniedCount, capability);
    throw new Error(buildMissingCapabilityErrorMessage(capability, action));
}

export function requireFilesystemScopeCapability(scopeId: string, action: string): void {
    requireScopedCapability(scopeId, action, FILESYSTEM_SCOPE_CAPABILITY_PREFIX, "Filesystem");
}

export function requireProcessScopeCapability(scopeId: string, action: string): void {
    requireScopedCapability(scopeId, action, PROCESS_SCOPE_CAPABILITY_PREFIX, "Process");
}

export function requireNetworkScopeCapability(scopeId: string, action: string): void {
    requireScopedCapability(scopeId, action, NETWORK_SCOPE_CAPABILITY_PREFIX, "Network");
}

export function requireWorkflowProcessCapabilities(scopeId: string, action: string): void {
    requireCapability("system.process.exec", action);
    requireProcessScopeCapability(scopeId, action);
}

export function requireStorageBackendCapability(backendId: string, action: string): void {
    const normalizedBackend = normalizeStorageBackendId(backendId);
    if (!normalizedBackend || !/[a-z0-9]/.test(normalizedBackend)) {
        throw new Error("Storage backend id must contain at least one alphanumeric character.");
    }

    requireCapability("storage", action);
    requireCapability(`${STORAGE_BACKEND_CAPABILITY_PREFIX}${normalizedBackend}` as PluginCapability, action);
}

function requireScopedCapability(
    scopeId: string,
    action: string,
    prefix: string,
    label: string
): void {
    const normalizedScope = normalizeScopeId(scopeId);
    if (!normalizedScope || !/[a-z0-9]/.test(normalizedScope)) {
        throw new Error(`${label} scope id must contain at least one alphanumeric character.`);
    }
    const capability = `${prefix}${normalizedScope}` as PluginCapability;
    requireCapability(capability, action);
}

export function createCapabilityBundle(capabilities: PluginCapability[]): PluginCapability[] {
    return Array.from(new Set(capabilities)).sort((left, right) => left.localeCompare(right));
}

export function createFilesystemCapabilityBundle(scopeId: string): PluginCapability[] {
    const normalizedScope = normalizeScopeId(scopeId);
    if (!normalizedScope || !/[a-z0-9]/.test(normalizedScope)) {
        throw new Error("Filesystem scope id must contain at least one alphanumeric character.");
    }

    return createCapabilityBundle([
        HOSTS_WRITE_CAPABILITY,
        `${FILESYSTEM_SCOPE_CAPABILITY_PREFIX}${normalizedScope}` as PluginCapability,
    ]);
}

export function createProcessCapabilityBundle(scopeId: string): PluginCapability[] {
    const normalizedScope = normalizeScopeId(scopeId);
    if (!normalizedScope || !/[a-z0-9]/.test(normalizedScope)) {
        throw new Error("Process scope id must contain at least one alphanumeric character.");
    }

    return createCapabilityBundle([
        "system.process.exec",
        `${PROCESS_SCOPE_CAPABILITY_PREFIX}${normalizedScope}` as PluginCapability,
    ]);
}

export function createWorkflowCapabilityBundle(scopeId: string): PluginCapability[] {
    return createProcessCapabilityBundle(scopeId);
}

export function createStorageCapabilityBundle(backendId: string): PluginCapability[] {
    const normalizedBackend = normalizeStorageBackendId(backendId);
    if (!normalizedBackend || !/[a-z0-9]/.test(normalizedBackend)) {
        throw new Error("Storage backend id must contain at least one alphanumeric character.");
    }

    return createCapabilityBundle([
        "storage",
        `${STORAGE_BACKEND_CAPABILITY_PREFIX}${normalizedBackend}` as PluginCapability,
    ]);
}

export function createAICapabilityBundle(
    options:
        | Array<"assistants.list" | "request">
        | { operations?: Array<"assistants.list" | "request"> } = ["request"]
): PluginCapability[] {
    const operations = Array.isArray(options)
        ? options
        : (Array.isArray(options.operations) ? options.operations : ["request"]);
    const normalizedOperations = Array.from(
        new Set((Array.isArray(operations) ? operations : []).map((operation) => String(operation || "").trim().toLowerCase()))
    );

    if (normalizedOperations.length === 0) {
        throw new Error("At least one AI capability operation is required.");
    }

    const capabilities: PluginCapability[] = ["system.ai"];
    for (const operation of normalizedOperations) {
        if (!AI_OPERATIONS.has(operation)) {
            throw new Error(
                `Unsupported AI capability operation "${operation}". Supported operations: ${Array.from(AI_OPERATIONS).join(", ")}.`
            );
        }
        capabilities.push(`${AI_CAPABILITY_PREFIX}${operation}` as PluginCapability);
    }

    return createCapabilityBundle(capabilities);
}

export function createNetworkScopeCapability(scopeId: string): PluginCapability {
    const normalizedScope = normalizeScopeId(scopeId);
    if (!normalizedScope || !/[a-z0-9]/.test(normalizedScope)) {
        throw new Error("Network scope id must contain at least one alphanumeric character.");
    }
    return `${NETWORK_SCOPE_CAPABILITY_PREFIX}${normalizedScope}` as PluginCapability;
}

export function createNetworkCapabilityBundle(
    options:
        | Array<"https" | "http" | "websocket" | "tcp" | "udp" | "dns">
        | {
            transports?: Array<"https" | "http" | "websocket" | "tcp" | "udp" | "dns">;
            scopeId?: string;
        } = ["https"]
): PluginCapability[] {
    const transports = Array.isArray(options)
        ? options
        : (Array.isArray(options.transports) ? options.transports : ["https"]);
    const scopeId = Array.isArray(options) ? undefined : options.scopeId;
    const normalizedTransports = Array.from(
        new Set((Array.isArray(transports) ? transports : []).map((transport) => normalizeNetworkTransportId(transport)))
    );

    if (normalizedTransports.length === 0) {
        throw new Error("At least one network transport capability is required.");
    }

    const capabilities: PluginCapability[] = ["system.network"];
    for (const transport of normalizedTransports) {
        if (!NETWORK_TRANSPORTS.has(transport)) {
            throw new Error(
                `Unsupported network transport capability "${transport}". Supported transports: ${Array.from(NETWORK_TRANSPORTS).join(", ")}.`
            );
        }
        capabilities.push(`${NETWORK_CAPABILITY_PREFIX}${transport}` as PluginCapability);
    }
    if (typeof scopeId === "string" && scopeId.trim()) {
        capabilities.push(createNetworkScopeCapability(scopeId));
    }

    return createCapabilityBundle(capabilities);
}

export function describeCapability(capability: PluginCapability | string): CapabilityDescriptor {
    if (capability === "system.ai") {
        return {
            capability,
            label: "AI",
            description: "Base AI capability family for host-routed assistants.",
            category: "ai",
        };
    }

    if (capability === "system.ai.assistants.list") {
        return {
            capability,
            label: "AI Assistants List",
            description: "Allows the plugin to discover host-configured AI assistants for user selection/routing.",
            category: "ai",
        };
    }

    if (capability === "system.ai.request") {
        return {
            capability,
            label: "AI Request",
            description: "Allows the plugin to send task-oriented AI requests through host-selected assistants.",
            category: "ai",
        };
    }

    if (capability === "storage") {
        return {
            capability,
            label: "Storage",
            description: "Base capability family for plugin-managed persistent storage backends.",
            category: "storage",
        };
    }

    if (capability === "storage.json") {
        return {
            capability,
            label: "JSON Storage Backend",
            description: "Allows the plugin to use the persistent JSON store backend (requires base capability \"storage\").",
            category: "storage",
        };
    }

    if (capability.startsWith(STORAGE_BACKEND_CAPABILITY_PREFIX)) {
        const backendId = capability.slice(STORAGE_BACKEND_CAPABILITY_PREFIX.length);
        return {
            capability,
            label: `Storage Backend: ${backendId}`,
            description: `Allows the plugin to use the "${backendId}" persistent storage backend (requires base capability "storage").`,
            category: "storage",
        };
    }

    if (capability === "system.network") {
        return {
            capability,
            label: "Network",
            description: "Base network capability family. Pair with concrete transport capabilities such as system.network.https.",
            category: "network",
        };
    }

    if (capability === "system.network.https") {
        return {
            capability,
            label: "Network HTTPS",
            description: "Allows outbound HTTPS requests through host-approved runtime network APIs.",
            category: "network",
        };
    }

    if (capability === "system.network.http") {
        return {
            capability,
            label: "Network HTTP",
            description: "Allows outbound plaintext HTTP requests through host-approved runtime network APIs.",
            category: "network",
        };
    }

    if (capability === "system.network.websocket") {
        return {
            capability,
            label: "Network WebSocket",
            description: "Allows outbound WebSocket connections through host-approved runtime network APIs.",
            category: "network",
        };
    }

    if (capability === "system.network.tcp") {
        return {
            capability,
            label: "Network TCP",
            description: "Allows raw TCP socket access through runtime network APIs.",
            category: "network",
        };
    }

    if (capability === "system.network.udp") {
        return {
            capability,
            label: "Network UDP",
            description: "Allows raw UDP socket access through runtime network APIs.",
            category: "network",
        };
    }

    if (capability === "system.network.dns") {
        return {
            capability,
            label: "Network DNS",
            description: "Allows direct DNS resolution APIs through runtime network modules.",
            category: "network",
        };
    }

    if (capability.startsWith(NETWORK_SCOPE_CAPABILITY_PREFIX)) {
        const scopeId = capability.slice(NETWORK_SCOPE_CAPABILITY_PREFIX.length);
        return {
            capability,
            label: `Network Scope: ${scopeId}`,
            description: `Allows host-defined network scope access inside "${scopeId}". Pair with system.network and required transport capabilities.`,
            category: "network-scope",
        };
    }

    if (capability === "sudo.prompt") {
        return {
            capability,
            label: "Sudo Prompt",
            description: "Allows the plugin to request elevated privilege prompts through the host.",
            category: "sudo",
        };
    }

    if (capability === "system.clipboard.write") {
        return {
            capability,
            label: "Clipboard Write",
            description: "Allows the plugin to request host-mediated clipboard writes.",
            category: "clipboard",
        };
    }

    if (capability === "system.clipboard.read") {
        return {
            capability,
            label: "Clipboard Read",
            description: "Allows the plugin to request host-mediated clipboard reads.",
            category: "clipboard",
        };
    }

    if (capability === HOSTS_WRITE_CAPABILITY || capability === HOST_WRITE_CAPABILITY) {
        return {
            capability,
            label: "Hosts Write",
            description: "Allows host-mediated hosts-file writes and broad privileged filesystem entry for scoped mutations.",
            category: "hosts",
        };
    }

    if (capability === "system.process.exec") {
        return {
            capability,
            label: "Scoped Tool Execution",
            description: "Allows host-mediated execution of allowlisted operational tools when paired with a process scope capability.",
            category: "process",
        };
    }

    if (capability.startsWith(FILESYSTEM_SCOPE_CAPABILITY_PREFIX)) {
        const scopeId = capability.slice(FILESYSTEM_SCOPE_CAPABILITY_PREFIX.length);
        return {
            capability,
            label: `Filesystem Scope: ${scopeId}`,
            description: `Allows scoped filesystem mutations inside the "${scopeId}" host policy.`,
            category: "filesystem-scope",
        };
    }

    if (capability.startsWith(PROCESS_SCOPE_CAPABILITY_PREFIX)) {
        const scopeId = capability.slice(PROCESS_SCOPE_CAPABILITY_PREFIX.length);
        return {
            capability,
            label: `Process Scope: ${scopeId}`,
            description: `Allows scoped process execution inside the "${scopeId}" host policy.`,
            category: "process-scope",
        };
    }

    return {
        capability,
        label: capability,
        description: "Capability descriptor is not known to this SDK version.",
        category: "unknown",
    };
}

export function parseMissingCapabilityError(error: unknown): MissingCapabilityDiagnostic | null {
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    const match = MISSING_CAPABILITY_ERROR_PATTERN.exec(message);
    if (!match) {
        return null;
    }

    const [, rawCapability, action] = match;
    const capability = rawCapability as PluginCapability;
    const descriptor = describeCapability(capability);
    return {
        capability,
        action,
        category: descriptor.category,
        label: descriptor.label,
        description: descriptor.description,
        remediation: buildCapabilityPreflightRemediation(capability),
    };
}

export function runCapabilityPreflight(options: {
    declared: Array<PluginCapability | string>;
    granted?: Array<PluginCapability | string>;
    action?: string;
}): CapabilityPreflightReport {
    const action = typeof options.action === "string" && options.action.trim()
        ? options.action.trim()
        : "satisfy plugin declared capability preflight";
    const declared = normalizeCapabilityList(Array.isArray(options.declared) ? options.declared : []);
    const granted = normalizeCapabilityList(
        Array.isArray(options.granted)
            ? options.granted
            : getCapabilityDiagnostics().granted
    );
    const declaredSet = new Set(declared);
    const grantedSet = new Set(granted);

    const missing: CapabilityPreflightMissingDiagnostic[] = declared
        .filter((capability) => !grantedSet.has(capability))
        .map((capability) => {
            const descriptor = describeCapability(capability);
            const prerequisites = getCapabilityPrerequisites(capability);
            const requiredCapabilities = normalizeCapabilityList([capability, ...prerequisites]);
            const missingPrerequisites = prerequisites.filter((entry) => !grantedSet.has(entry));
            const grantedPrerequisites = prerequisites.filter((entry) => grantedSet.has(entry));

            return {
                capability,
                action,
                category: descriptor.category,
                label: descriptor.label,
                description: descriptor.description,
                remediation: buildCapabilityPreflightRemediation(capability),
                requiredCapabilities,
                missingPrerequisites,
                grantedPrerequisites,
            };
        });

    const undeclaredGranted = granted
        .filter((capability) => !declaredSet.has(capability))
        .map((capability) => describeCapability(capability));

    const remediations = Array.from(
        new Set(missing.map((entry) => entry.remediation))
    );
    const summary = missing.length === 0
        ? "All declared capabilities are granted."
        : `Missing ${missing.length} declared capability${missing.length === 1 ? "" : "ies"} (${missing.map((entry) => entry.capability).join(", ")}).`;

    return {
        ok: missing.length === 0,
        action,
        declared,
        granted,
        missing,
        undeclaredGranted,
        remediations,
        summary,
    };
}

export function getCapabilityDiagnostics(): {
    granted: PluginCapability[];
    usageCount: Record<string, number>;
    deniedCount: Record<string, number>;
} {
    return {
        granted: Array.from(grantedCapabilities).sort((left, right) => left.localeCompare(right)),
        usageCount: { ...audit.usageCount },
        deniedCount: { ...audit.deniedCount },
    };
}

export function resetCapabilityStateForTests(): void {
    grantedCapabilities.clear();
    for (const key of Object.keys(audit.usageCount)) {
        delete audit.usageCount[key];
    }
    for (const key of Object.keys(audit.deniedCount)) {
        delete audit.deniedCount[key];
    }
}
