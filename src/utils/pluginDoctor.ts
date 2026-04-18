import {
    PluginDoctorFinding,
    PluginDoctorPanelFinding,
    PluginDoctorPanelModel,
    PluginDoctorPanelOptions,
    PluginDoctorPanelSection,
    PluginDoctorOptions,
    PluginDoctorReport,
    PluginDoctorSeverity,
    PluginDiagnostics,
    PluginDoctorCategory,
} from "../types";
import { runCapabilityPreflight } from "./capabilities";
import { formatDiagnosticExactFix } from "./diagnosticTemplates";
import { evaluateSdkHandshakeCompatibility } from "./handshake";

function countFindings(findings: PluginDoctorFinding[], severity: PluginDoctorSeverity): number {
    return findings.filter((finding) => finding.severity === severity).length;
}

const CATEGORY_TITLES: Record<PluginDoctorCategory, string> = {
    health: "Health",
    capabilities: "Capabilities",
    handshake: "Handshake",
    handlers: "Handlers",
    stores: "Stores",
    notifications: "Notifications",
};

const CATEGORY_ORDER: Record<PluginDoctorCategory, number> = {
    health: 1,
    capabilities: 2,
    handshake: 3,
    handlers: 4,
    stores: 5,
    notifications: 6,
};

const SEVERITY_PRIORITY: Record<PluginDoctorSeverity, number> = {
    error: 300,
    warning: 200,
    info: 100,
};

function createSummary(report: PluginDoctorReport): string {
    if (report.counts.error === 0 && report.counts.warning === 0) {
        return "No error or warning findings. Plugin diagnostics look healthy.";
    }

    const parts = [
        `${report.counts.error} error${report.counts.error === 1 ? "" : "s"}`,
        `${report.counts.warning} warning${report.counts.warning === 1 ? "" : "s"}`,
    ];
    return `Plugin doctor found ${parts.join(" and ")}.`;
}

function resolveStatus(findings: PluginDoctorFinding[]): PluginDoctorReport["status"] {
    if (findings.some((finding) => finding.severity === "error")) {
        return "degraded";
    }
    if (findings.some((finding) => finding.severity === "warning")) {
        return "needs-attention";
    }
    return "healthy";
}

function resolveFindingPriority(finding: PluginDoctorFinding, hasExactFix: boolean): number {
    const base = SEVERITY_PRIORITY[finding.severity];
    const exactFixBoost = hasExactFix ? 5 : 0;
    return base + exactFixBoost;
}

function createPanelFinding(
    finding: PluginDoctorFinding,
    options: Required<PluginDoctorPanelOptions>
): PluginDoctorPanelFinding {
    const exactFix = options.includeExactFix ? formatDiagnosticExactFix(finding.code) ?? undefined : undefined;
    return {
        ...finding,
        priority: resolveFindingPriority(finding, Boolean(exactFix)),
        isBlocking: finding.severity === "error",
        exactFix,
    };
}

function comparePanelFindings(left: PluginDoctorPanelFinding, right: PluginDoctorPanelFinding): number {
    if (right.priority !== left.priority) {
        return right.priority - left.priority;
    }
    if (left.category !== right.category) {
        return CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
    }
    if (left.code !== right.code) {
        return left.code.localeCompare(right.code);
    }
    return left.message.localeCompare(right.message);
}

function countPanelFindings(findings: PluginDoctorPanelFinding[], severity: PluginDoctorSeverity): number {
    return findings.filter((entry) => entry.severity === severity).length;
}

function normalizePanelOptions(options: PluginDoctorPanelOptions): Required<PluginDoctorPanelOptions> {
    return {
        maxPrioritizedFindings: Math.max(1, options.maxPrioritizedFindings ?? 8),
        includeInfoFindings: options.includeInfoFindings !== false,
        includeExactFix: options.includeExactFix !== false,
    };
}

export function createPluginDoctorReport(
    diagnostics: PluginDiagnostics,
    options: PluginDoctorOptions = {}
): PluginDoctorReport {
    const includeInfo = options.includeInfo !== false;
    const includeNotificationFindings = options.includeNotificationFindings !== false;
    const findings: PluginDoctorFinding[] = [];
    const addFinding = (finding: PluginDoctorFinding): void => {
        if (!includeInfo && finding.severity === "info") {
            return;
        }
        findings.push(finding);
    };

    if (diagnostics.health.status === "degraded" || diagnostics.health.errorCount > 0) {
        addFinding({
            code: "HEALTH_DEGRADED",
            severity: "error",
            category: "health",
            message: `Plugin health is degraded (errors: ${diagnostics.health.errorCount}).`,
            details: {
                lastErrorAt: diagnostics.health.lastErrorAt,
                lastErrorMessage: diagnostics.health.lastErrorMessage,
                initCount: diagnostics.health.initCount,
                renderCount: diagnostics.health.renderCount,
                handlerCount: diagnostics.health.handlerCount,
            },
            remediation: "Inspect the latest plugin error and fix the failing init/render/handler path before retrying.",
        });
    }

    if (diagnostics.health.initCount === 0) {
        addFinding({
            code: "INIT_NOT_EXECUTED",
            severity: "warning",
            category: "health",
            message: "Plugin init() has not completed yet.",
            remediation: "Ensure the host sends PLUGIN_INIT and the plugin init path returns without throwing.",
        });
    }

    if (diagnostics.health.renderCount === 0) {
        addFinding({
            code: "RENDER_NOT_EXECUTED",
            severity: "info",
            category: "health",
            message: "Plugin render() has not completed yet.",
            remediation: "Trigger plugin render once to verify render pipeline behavior.",
        });
    }

    const preflight = runCapabilityPreflight({
        declared: diagnostics.capabilities.declaration.declared,
        granted: diagnostics.capabilities.permissions.granted,
        action: options.capabilityAction ?? "satisfy plugin declared capability contract",
    });

    for (const missing of preflight.missing) {
        addFinding({
            code: "CAPABILITY_DECLARED_MISSING",
            severity: "warning",
            category: "capabilities",
            message: `Declared capability "${missing.capability}" is not granted by host policy.`,
            remediation: missing.remediation,
            details: {
                requiredCapabilities: missing.requiredCapabilities,
                missingPrerequisites: missing.missingPrerequisites,
                grantedPrerequisites: missing.grantedPrerequisites,
            },
        });
    }

    if (preflight.undeclaredGranted.length > 0) {
        addFinding({
            code: "CAPABILITY_GRANTED_UNDECLARED",
            severity: "info",
            category: "capabilities",
            message: `Host granted ${preflight.undeclaredGranted.length} capability/capabilities not declared by plugin code.`,
            remediation: "Align declareCapabilities() with host policy to keep plugin intent and grants synchronized.",
            details: {
                undeclaredGranted: preflight.undeclaredGranted.map((entry) => entry.capability),
            },
        });
    }

    if (options.handshake) {
        const handshakeReport = evaluateSdkHandshakeCompatibility(diagnostics.handshake, options.handshake);
        for (const issue of handshakeReport.issues) {
            addFinding({
                code: issue.code,
                severity: issue.severity,
                category: "handshake",
                message: issue.message,
                remediation: formatDiagnosticExactFix(issue.code) ?? undefined,
                details: {
                    expected: issue.expected,
                    received: issue.received,
                    featureFlag: issue.featureFlag,
                    sdkVersion: diagnostics.handshake.sdkVersion,
                    apiVersion: diagnostics.handshake.apiVersion,
                    capabilitySchemaVersion: diagnostics.handshake.capabilitySchemaVersion,
                },
            });
        }
    }

    const deniedEntries = Object.entries(diagnostics.capabilities.permissions.deniedCount)
        .filter(([, deniedCount]) => typeof deniedCount === "number" && deniedCount > 0)
        .sort(([left], [right]) => left.localeCompare(right));

    if (deniedEntries.length > 0) {
        addFinding({
            code: "CAPABILITY_RUNTIME_DENIED",
            severity: "warning",
            category: "capabilities",
            message: `Runtime denied ${deniedEntries.length} capability/capabilities during plugin execution.`,
            remediation: "Grant the denied capabilities in host policy or remove denied code paths from plugin runtime.",
            details: {
                denied: deniedEntries.map(([capability, deniedCount]) => ({ capability, deniedCount })),
            },
        });
    }

    if (diagnostics.capabilities.registeredHandlers.length === 0) {
        addFinding({
            code: "HANDLERS_NOT_REGISTERED",
            severity: "info",
            category: "handlers",
            message: "No plugin handlers are registered.",
            remediation: "Register handlers in init() if your plugin expects UI_MESSAGE backend actions.",
        });
    }

    if (includeNotificationFindings) {
        if (diagnostics.notifications.count >= diagnostics.notifications.capacity) {
            addFinding({
                code: "NOTIFICATION_BUFFER_AT_CAPACITY",
                severity: "warning",
                category: "notifications",
                message: "Notification buffer reached capacity; older messages may be dropped.",
                remediation: "Increase notification buffer capacity in host runtime or reduce notification volume.",
                details: {
                    count: diagnostics.notifications.count,
                    capacity: diagnostics.notifications.capacity,
                },
            });
        }

        const recentErrorNotifications = diagnostics.notifications.recent
            .filter((entry) => entry.type === "error")
            .length;
        if (recentErrorNotifications > 0) {
            addFinding({
                code: "NOTIFICATIONS_RECENT_ERRORS",
                severity: "warning",
                category: "notifications",
                message: `Recent notification stream includes ${recentErrorNotifications} error notification(s).`,
                remediation: "Review recent notification errors and correlate them with plugin logs/correlation IDs.",
            });
        }
    }

    const report: PluginDoctorReport = {
        pluginId: diagnostics.pluginId,
        generatedAt: new Date().toISOString(),
        status: resolveStatus(findings),
        summary: "",
        counts: {
            error: countFindings(findings, "error"),
            warning: countFindings(findings, "warning"),
            info: countFindings(findings, "info"),
        },
        findings,
    };
    report.summary = createSummary(report);
    return report;
}

export function createPluginDoctorPanelModel(
    report: PluginDoctorReport,
    options: PluginDoctorPanelOptions = {}
): PluginDoctorPanelModel {
    const normalizedOptions = normalizePanelOptions(options);
    const panelFindings = report.findings
        .filter((finding) => normalizedOptions.includeInfoFindings || finding.severity !== "info")
        .map((finding) => createPanelFinding(finding, normalizedOptions))
        .sort(comparePanelFindings);

    const prioritizedFindings = panelFindings.slice(0, normalizedOptions.maxPrioritizedFindings);

    const sectionMap = new Map<PluginDoctorCategory, PluginDoctorPanelFinding[]>();
    for (const finding of panelFindings) {
        if (!sectionMap.has(finding.category)) {
            sectionMap.set(finding.category, []);
        }
        sectionMap.get(finding.category)?.push(finding);
    }

    const sections: PluginDoctorPanelSection[] = Array.from(sectionMap.entries())
        .sort(([left], [right]) => CATEGORY_ORDER[left] - CATEGORY_ORDER[right])
        .map(([category, findings]) => ({
            category,
            title: CATEGORY_TITLES[category],
            counts: {
                total: findings.length,
                error: countPanelFindings(findings, "error"),
                warning: countPanelFindings(findings, "warning"),
                info: countPanelFindings(findings, "info"),
            },
            findings,
        }));

    return {
        pluginId: report.pluginId,
        generatedAt: report.generatedAt,
        status: report.status,
        summary: report.summary,
        blocking: panelFindings.some((finding) => finding.isBlocking),
        counts: {
            total: panelFindings.length,
            error: countPanelFindings(panelFindings, "error"),
            warning: countPanelFindings(panelFindings, "warning"),
            info: countPanelFindings(panelFindings, "info"),
        },
        prioritizedFindings,
        sections,
    };
}
