import {
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
const FILESYSTEM_SCOPE_CAPABILITY_PREFIX = "system.fs.scope.";
const PROCESS_SCOPE_CAPABILITY_PREFIX = "system.process.scope.";
const MISSING_CAPABILITY_ERROR_PATTERN = /^Capability "([^"]+)" is required to (.+)\. Configure PluginRegistry\.configureCapabilities\(\{ granted: \["[^"]+"\] \}\) in the host before plugin initialization\.$/;

function increment(counter: Record<string, number>, key: string): void {
    counter[key] = (counter[key] ?? 0) + 1;
}

function normalizeScopeId(scopeId: string): string {
    return scopeId.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildMissingCapabilityErrorMessage(capability: PluginCapability, action: string): string {
    return `Capability "${capability}" is required to ${action}. Configure PluginRegistry.configureCapabilities({ granted: ["${capability}"] }) in the host before plugin initialization.`;
}

export function configureCapabilities(configuration: CapabilityConfiguration): void {
    grantedCapabilities.clear();
    for (const capability of configuration.granted) {
        grantedCapabilities.add(capability);
    }
}

export function requireCapability(capability: PluginCapability, action: string): void {
    increment(audit.usageCount, capability);

    if (grantedCapabilities.has(capability)) {
        return;
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

export function requireWorkflowProcessCapabilities(scopeId: string, action: string): void {
    requireCapability("system.process.exec", action);
    requireProcessScopeCapability(scopeId, action);
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
        "system.hosts.write",
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

export function describeCapability(capability: PluginCapability | string): CapabilityDescriptor {
    if (capability === "storage.json") {
        return {
            capability,
            label: "JSON Storage",
            description: "Allows the plugin to use the persistent JSON store.",
            category: "storage",
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

    if (capability === "system.hosts.write") {
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
        remediation: `Grant "${capability}" in the host capability configuration before plugin initialization.`,
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
