import { DiagnosticFixTemplate } from "../types";

const FIX_TEMPLATES: Record<string, DiagnosticFixTemplate> = Object.freeze({
    CAPABILITY_MISSING: {
        code: "CAPABILITY_MISSING",
        title: "Missing capability grant",
        summary: "Host policy denied a required capability.",
        exactFix: "Grant the required capability (and prerequisites) in PLUGIN_INIT.content.capabilities before plugin init.",
        steps: [
            "Identify the denied capability from the error response code/message.",
            "Add that capability to host grant policy for the plugin.",
            "If it is a scoped capability (for example system.process.scope.git), also grant required broad capability (for example system.process.exec).",
            "Reinitialize the plugin and re-run the action.",
        ],
        docs: [
            "docs/SAFE_PLUGIN_AUTHORING.md",
            "docs/OPERATOR_PLUGIN_PATTERNS.md",
        ],
    },
    PROCESS_SPAWN_ENOENT: {
        code: "PROCESS_SPAWN_ENOENT",
        title: "Process executable/spawn path issue",
        summary: "Host process execution failed before command run.",
        exactFix: "Validate executable allowlist path and command cwd; if cwd is invalid/missing, fix path selection before process execution.",
        steps: [
            "Confirm the executable exists on the host and is in the allowed scope policy.",
            "Validate cwd path exists (missing cwd can surface as ENOENT).",
            "Use host-managed scoped process execution and avoid hardcoded non-portable binary paths.",
            "Retry with corrected path/cwd and review stderr/exit diagnostics.",
        ],
        docs: [
            "docs/PLUGIN_DEVELOPMENT_GAP_REGISTER.md",
            "docs/OPERATOR_PLUGIN_PATTERNS.md",
        ],
    },
    PROCESS_EXIT_NON_ZERO: {
        code: "PROCESS_EXIT_NON_ZERO",
        title: "Process command failed",
        summary: "Command ran but exited with non-zero status.",
        exactFix: "Surface full host diagnostics (stderr/stdout/exitCode/command/cwd) and fix command arguments or environment.",
        steps: [
            "Display formatted error via formatPrivilegedActionError(...).",
            "Inspect stderr and exitCode to identify command-level failure reason.",
            "Validate command args/cwd/environment in backend request builder.",
            "Add pre-checks for predictable failures (missing repo path, missing config, etc.).",
        ],
        docs: [
            "docs/HOST_PRIVILEGED_ACTIONS_CONTRACT.md",
            "docs/PLUGIN_DEVELOPMENT_GAP_REGISTER.md",
        ],
    },
    PLUGIN_BACKEND_EMPTY_RESPONSE: {
        code: "PLUGIN_BACKEND_EMPTY_RESPONSE",
        title: "Backend handler returned no response",
        summary: "Host received no envelope from plugin handler.",
        exactFix: "Ensure every handler path returns a response envelope, including error branches.",
        steps: [
            "Verify handler is registered before UI_MESSAGE invocation.",
            "Return explicit envelope on success and failure code paths.",
            "Do not swallow exceptions without returning fallback response.",
            "Use SDK helper builders when constructing privileged-action envelopes.",
        ],
        docs: [
            "docs/SAFE_PLUGIN_AUTHORING.md",
            "docs/PLUGIN_DEVELOPMENT_GAP_REGISTER.md",
        ],
    },
    HANDSHAKE_API_INCOMPATIBLE: {
        code: "HANDSHAKE_API_INCOMPATIBLE",
        title: "SDK/Host API major mismatch",
        summary: "Plugin SDK API major version is incompatible with host expectation.",
        exactFix: "Align plugin SDK major version with host-supported API major before loading plugin.",
        steps: [
            "Compare diagnostics.handshake.apiVersion with host expected API major.",
            "Upgrade plugin SDK or host runtime to matching major.",
            "Rebuild plugin after SDK version alignment.",
        ],
        docs: [
            "docs/ARCHITECTURE.md",
            "docs/API_STABILITY.md",
        ],
    },
    HANDSHAKE_CONTRACT_INCOMPATIBLE: {
        code: "HANDSHAKE_CONTRACT_INCOMPATIBLE",
        title: "SDK/Host handshake contract mismatch",
        summary: "Plugin SDK handshake contract major version is incompatible with host expectation.",
        exactFix: "Align host handshake contract expectation with the plugin SDK handshake major version before plugin load.",
        steps: [
            "Compare diagnostics.handshake.contractVersion with host-expected handshake contract major.",
            "Upgrade host or plugin SDK so handshake contract majors match.",
            "Re-run plugin diagnostics and compatibility checks after alignment.",
        ],
        docs: [
            "docs/ARCHITECTURE.md",
            "docs/API_STABILITY.md",
        ],
    },
    HANDSHAKE_CAPABILITY_SCHEMA_MISMATCH: {
        code: "HANDSHAKE_CAPABILITY_SCHEMA_MISMATCH",
        title: "Capability schema version mismatch",
        summary: "Host and SDK capability schema versions differ.",
        exactFix: "Update host capability-schema mapping or SDK to a compatible schema version.",
        steps: [
            "Read diagnostics.handshake.capabilitySchemaVersion.",
            "Compare with host capability schema expectation.",
            "Add compatibility shim or update host/SDK so schema versions align.",
        ],
        docs: [
            "docs/ARCHITECTURE.md",
            "docs/SAFE_PLUGIN_AUTHORING.md",
        ],
    },
    HANDSHAKE_FEATURE_FLAG_MISSING: {
        code: "HANDSHAKE_FEATURE_FLAG_MISSING",
        title: "Required SDK feature flag not available",
        summary: "Host requested a capability path not advertised by plugin SDK feature flags.",
        exactFix: "Gate host UX by handshake.featureFlags or upgrade SDK that implements the required feature.",
        steps: [
            "Inspect diagnostics.handshake.featureFlags in host diagnostics.",
            "Disable or fallback unsupported host feature path.",
            "Upgrade plugin SDK version to include required feature flag.",
        ],
        docs: [
            "README.md",
            "docs/ARCHITECTURE.md",
        ],
    },
});

function normalizeCode(code: string): string {
    return String(code || "").trim().toUpperCase();
}

export function getDiagnosticFixTemplate(code: string): DiagnosticFixTemplate | null {
    const normalized = normalizeCode(code);
    if (!normalized) {
        return null;
    }

    const template = FIX_TEMPLATES[normalized];
    return template ? { ...template, steps: [...template.steps], docs: template.docs ? [...template.docs] : undefined } : null;
}

export function listDiagnosticFixTemplates(): DiagnosticFixTemplate[] {
    return Object.keys(FIX_TEMPLATES)
        .sort((left, right) => left.localeCompare(right))
        .map((code) => getDiagnosticFixTemplate(code) as DiagnosticFixTemplate);
}

export function formatDiagnosticExactFix(code: string): string | null {
    const template = getDiagnosticFixTemplate(code);
    if (!template) {
        return null;
    }

    return `${template.title}: ${template.exactFix}`;
}
