import {
    createPluginDoctorReport,
    getSdkHandshake,
    PluginDiagnostics,
} from "../../src";

function createBaseDiagnostics(): PluginDiagnostics {
    return {
        apiVersion: "1.0.0",
        pluginId: "tests-plugin",
        metadata: {
            id: "tests-plugin",
            name: "Tests Plugin",
            version: "1.0.0",
            author: "Test",
            description: "Test diagnostics",
            icon: "cog",
        },
        handshake: getSdkHandshake(),
        health: {
            status: "healthy",
            startedAt: new Date("2026-04-15T10:00:00.000Z").toISOString(),
            initCount: 1,
            renderCount: 1,
            handlerCount: 1,
            errorCount: 0,
        },
        capabilities: {
            diagnosticsHandler: "__sdk.getDiagnostics",
            registeredHandlers: ["ping"],
            registeredStores: ["default", "json"],
            quickActionsCount: 0,
            hasSidePanel: false,
            stores: [],
            declaration: {
                declared: ["system.process.exec", "system.process.scope.git"],
                missing: [],
                undeclaredGranted: [],
            },
            permissions: {
                granted: ["system.process.exec", "system.process.scope.git"],
                usageCount: {},
                deniedCount: {},
            },
        },
        notifications: {
            count: 0,
            capacity: 100,
            recent: [],
        },
    };
}

describe("plugin doctor", () => {
    test("returns healthy report when no errors or warnings exist", () => {
        const report = createPluginDoctorReport(createBaseDiagnostics(), {
            includeInfo: false,
        });

        expect(report.status).toBe("healthy");
        expect(report.counts).toEqual({
            error: 0,
            warning: 0,
            info: 0,
        });
        expect(report.findings).toEqual([]);
        expect(report.summary).toBe("No error or warning findings. Plugin diagnostics look healthy.");
    });

    test("adds warning findings for missing declared capabilities with remediation", () => {
        const diagnostics = createBaseDiagnostics();
        diagnostics.capabilities.declaration.declared = ["storage.json"];
        diagnostics.capabilities.permissions.granted = [];

        const report = createPluginDoctorReport(diagnostics, {
            includeInfo: false,
        });
        const capabilityFinding = report.findings.find((entry) => entry.code === "CAPABILITY_DECLARED_MISSING");

        expect(report.status).toBe("needs-attention");
        expect(report.counts.warning).toBe(1);
        expect(capabilityFinding?.severity).toBe("warning");
        expect(capabilityFinding?.remediation).toContain('Configure PluginRegistry.configureCapabilities({ granted: ["storage", "storage.json"] })');
    });

    test("marks report degraded when health diagnostics are degraded", () => {
        const diagnostics = createBaseDiagnostics();
        diagnostics.health.status = "degraded";
        diagnostics.health.errorCount = 2;
        diagnostics.health.lastErrorAt = new Date("2026-04-15T10:05:00.000Z").toISOString();
        diagnostics.health.lastErrorMessage = "boom";
        diagnostics.capabilities.permissions.deniedCount = {
            "system.process.exec": 3,
        };

        const report = createPluginDoctorReport(diagnostics, {
            includeInfo: false,
        });

        expect(report.status).toBe("degraded");
        expect(report.counts.error).toBe(1);
        expect(report.counts.warning).toBe(1);
        expect(report.findings.some((entry) => entry.code === "HEALTH_DEGRADED")).toBe(true);
        expect(report.findings.some((entry) => entry.code === "CAPABILITY_RUNTIME_DENIED")).toBe(true);
    });

    test("can suppress info and notification-stream findings via options", () => {
        const diagnostics = createBaseDiagnostics();
        diagnostics.capabilities.registeredHandlers = [];
        diagnostics.capabilities.permissions.granted = [
            "system.process.exec",
            "system.process.scope.git",
            "system.process.scope.kubectl",
        ];
        diagnostics.notifications.recent = [
            {
                message: "backend failure",
                type: "error",
                timestamp: new Date("2026-04-15T10:10:00.000Z").toISOString(),
            },
        ];
        diagnostics.notifications.count = 100;
        diagnostics.notifications.capacity = 100;

        const report = createPluginDoctorReport(diagnostics, {
            includeInfo: false,
            includeNotificationFindings: false,
        });

        expect(report.status).toBe("healthy");
        expect(report.findings).toEqual([]);
    });

    test("adds handshake findings when host expectations are not satisfied", () => {
        const diagnostics = createBaseDiagnostics();
        const report = createPluginDoctorReport(diagnostics, {
            includeInfo: false,
            handshake: {
                expectedApiVersion: "2.0.0",
                expectedCapabilitySchemaVersion: "2.0.0",
                requiredFeatureFlags: ["pluginDoctorReport"],
                capabilitySchemaSeverity: "error",
            },
        });

        expect(report.status).toBe("degraded");
        expect(report.counts.error).toBe(2);
        expect(report.findings.some((entry) => entry.code === "HANDSHAKE_API_INCOMPATIBLE")).toBe(true);
        expect(report.findings.some((entry) => entry.code === "HANDSHAKE_CAPABILITY_SCHEMA_MISMATCH")).toBe(true);
    });

    test("supports warning-only handshake findings", () => {
        const diagnostics = createBaseDiagnostics();
        diagnostics.handshake.featureFlags.pluginDoctorReport = false;
        const report = createPluginDoctorReport(diagnostics, {
            includeInfo: false,
            handshake: {
                requiredFeatureFlags: ["pluginDoctorReport"],
            },
        });

        expect(report.status).toBe("needs-attention");
        const finding = report.findings.find((entry) => entry.code === "HANDSHAKE_FEATURE_FLAG_MISSING");
        expect(finding?.category).toBe("handshake");
        expect(finding?.severity).toBe("warning");
        expect(finding?.remediation).toContain("Required SDK feature flag not available");
    });
});
