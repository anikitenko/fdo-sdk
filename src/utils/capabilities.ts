import { CapabilityConfiguration, PluginCapability } from "../types";

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

function increment(counter: Record<string, number>, key: string): void {
    counter[key] = (counter[key] ?? 0) + 1;
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
    throw new Error(
        `Capability "${capability}" is required to ${action}. Configure PluginRegistry.configureCapabilities({ granted: ["${capability}"] }) in the host before plugin initialization.`
    );
}

export function requireFilesystemScopeCapability(scopeId: string, action: string): void {
    requireScopedCapability(scopeId, action, FILESYSTEM_SCOPE_CAPABILITY_PREFIX, "Filesystem");
}

export function requireProcessScopeCapability(scopeId: string, action: string): void {
    requireScopedCapability(scopeId, action, PROCESS_SCOPE_CAPABILITY_PREFIX, "Process");
}

function requireScopedCapability(
    scopeId: string,
    action: string,
    prefix: string,
    label: string
): void {
    const normalizedScope = scopeId.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!normalizedScope || !/[a-z0-9]/.test(normalizedScope)) {
        throw new Error(`${label} scope id must contain at least one alphanumeric character.`);
    }
    const capability = `${prefix}${normalizedScope}` as PluginCapability;
    requireCapability(capability, action);
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
