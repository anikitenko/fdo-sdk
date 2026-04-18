import {
    createPluginDoctorPanelModel,
    createPluginDoctorReport,
    getSdkHandshake,
    PluginDiagnostics,
} from "../../src";

function createDiagnostics(): PluginDiagnostics {
    return {
        apiVersion: "1.0.0",
        pluginId: "panel-tests-plugin",
        metadata: {
            id: "panel-tests-plugin",
            name: "Panel Tests Plugin",
            version: "1.0.0",
            author: "Test",
            description: "Test diagnostics",
            icon: "cog",
        },
        handshake: getSdkHandshake(),
        health: {
            status: "degraded",
            startedAt: new Date("2026-04-15T10:00:00.000Z").toISOString(),
            initCount: 1,
            renderCount: 1,
            handlerCount: 1,
            errorCount: 1,
            lastErrorMessage: "boom",
        },
        capabilities: {
            diagnosticsHandler: "__sdk.getDiagnostics",
            registeredHandlers: [],
            registeredStores: ["default"],
            quickActionsCount: 0,
            hasSidePanel: false,
            stores: [],
            declaration: {
                declared: ["storage.json"],
                missing: [],
                undeclaredGranted: [],
            },
            permissions: {
                granted: ["storage"],
                usageCount: {},
                deniedCount: {
                    "system.process.exec": 2,
                },
            },
        },
        notifications: {
            count: 100,
            capacity: 100,
            recent: [
                {
                    message: "runtime failed",
                    type: "error",
                    timestamp: new Date("2026-04-15T10:05:00.000Z").toISOString(),
                },
            ],
        },
    };
}

describe("plugin doctor panel model", () => {
    test("builds deterministic prioritized findings with exact fix", () => {
        const report = createPluginDoctorReport(createDiagnostics(), {
            handshake: {
                expectedApiVersion: "2.0.0",
            },
        });
        const model = createPluginDoctorPanelModel(report);

        expect(model.blocking).toBe(true);
        expect(model.status).toBe("degraded");
        expect(model.prioritizedFindings.length).toBeGreaterThan(0);
        expect(model.prioritizedFindings[0].severity).toBe("error");
        expect(model.prioritizedFindings.some((finding) => finding.code === "HANDSHAKE_API_INCOMPATIBLE")).toBe(true);
        const handshakeFinding = model.prioritizedFindings.find((finding) => finding.code === "HANDSHAKE_API_INCOMPATIBLE");
        expect(handshakeFinding?.exactFix).toContain("SDK/Host API major mismatch");
    });

    test("supports info filtering and prioritized limit", () => {
        const report = createPluginDoctorReport(createDiagnostics(), {
            includeInfo: true,
            handshake: {
                expectedApiVersion: "2.0.0",
            },
        });
        const model = createPluginDoctorPanelModel(report, {
            includeInfoFindings: false,
            maxPrioritizedFindings: 2,
        });

        expect(model.counts.info).toBe(0);
        expect(model.prioritizedFindings.length).toBe(2);
        expect(model.sections.every((section) => section.findings.every((finding) => finding.severity !== "info"))).toBe(true);
    });
});
