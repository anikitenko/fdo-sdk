import {
    evaluateSdkHandshakeCompatibility,
    FDO_SDK,
    getSdkFeatureFlags,
    getSdkHandshake,
    isSdkHandshakeCompatible,
} from "../../src";

describe("sdk handshake helpers", () => {
    test("returns deterministic handshake payload shape", () => {
        const handshake = getSdkHandshake();

        expect(handshake.contractVersion).toBe("1.0.0");
        expect(handshake.capabilitySchemaVersion).toBe("1.0.0");
        expect(handshake.apiVersion).toBe(FDO_SDK.API_VERSION);
        expect(typeof handshake.sdkVersion).toBe("string");
        expect(handshake.sdkVersion.length).toBeGreaterThan(0);
    });

    test("returns feature flags as a copy", () => {
        const flags = getSdkFeatureFlags();
        expect(flags).toEqual({
            diagnosticsHandler: true,
            pluginDoctorReport: true,
            declaredCapabilityPreflight: true,
            privilegedActionTransportPipeline: true,
            renderOnLoadModuleAuthoring: true,
            renderOnLoadDeclarativeActions: true,
            editorSupportBundle: true,
        });

        flags.pluginDoctorReport = false;
        expect(getSdkFeatureFlags().pluginDoctorReport).toBe(true);
    });

    test("reports incompatible status for API major mismatch", () => {
        const handshake = getSdkHandshake();
        const report = evaluateSdkHandshakeCompatibility(handshake, {
            expectedApiVersion: "2.0.0",
        });

        expect(report.ok).toBe(false);
        expect(report.status).toBe("incompatible");
        expect(report.issues.some((issue) => issue.code === "HANDSHAKE_API_INCOMPATIBLE")).toBe(true);
        expect(isSdkHandshakeCompatible(handshake, { expectedApiVersion: "2.0.0" })).toBe(false);
    });

    test("reports warning status for missing required feature flag by default", () => {
        const handshake = getSdkHandshake();
        const report = evaluateSdkHandshakeCompatibility(handshake, {
            requiredFeatureFlags: ["pluginDoctorReport", "editorSupportBundle"],
        });
        expect(report.ok).toBe(true);
        expect(report.status).toBe("compatible");

        const downgraded = evaluateSdkHandshakeCompatibility(
            {
                ...handshake,
                featureFlags: {
                    ...handshake.featureFlags,
                    pluginDoctorReport: false,
                },
            },
            {
                requiredFeatureFlags: ["pluginDoctorReport"],
            }
        );

        expect(downgraded.ok).toBe(true);
        expect(downgraded.status).toBe("needs-attention");
        expect(downgraded.issues).toEqual([
            {
                code: "HANDSHAKE_FEATURE_FLAG_MISSING",
                severity: "warning",
                message: 'Required SDK feature flag "pluginDoctorReport" is not enabled.',
                expected: "true",
                received: "false",
                featureFlag: "pluginDoctorReport",
            },
        ]);
    });

    test("supports strict mode for capability schema and feature flags", () => {
        const handshake = getSdkHandshake();
        const report = evaluateSdkHandshakeCompatibility(handshake, {
            expectedCapabilitySchemaVersion: "2.0.0",
            capabilitySchemaSeverity: "error",
            requiredFeatureFlags: ["renderOnLoadDeclarativeActions"],
            featureFlagSeverity: "error",
        });

        expect(report.ok).toBe(false);
        expect(report.status).toBe("incompatible");
        expect(report.counts.error).toBe(1);
        expect(report.issues[0].code).toBe("HANDSHAKE_CAPABILITY_SCHEMA_MISMATCH");
    });
});
