import {
    SdkFeatureFlags,
    SdkHandshake,
    SdkHandshakeCompatibilityIssue,
    SdkHandshakeCompatibilityOptions,
    SdkHandshakeCompatibilityReport,
    SdkHandshakeFeatureFlagName,
} from "../types";
import { SDK_API_VERSION, SDK_PACKAGE_VERSION } from "../version";

const SDK_HANDSHAKE_CONTRACT_VERSION = "1.0.0";
const SDK_CAPABILITY_SCHEMA_VERSION = "1.0.0";

const SDK_FEATURE_FLAGS: SdkFeatureFlags = Object.freeze({
    diagnosticsHandler: true,
    pluginDoctorReport: true,
    declaredCapabilityPreflight: true,
    privilegedActionTransportPipeline: true,
    renderOnLoadModuleAuthoring: true,
    renderOnLoadDeclarativeActions: true,
    editorSupportBundle: true,
});

export function getSdkFeatureFlags(): SdkFeatureFlags {
    return { ...SDK_FEATURE_FLAGS };
}

export function getSdkHandshake(): SdkHandshake {
    return {
        contractVersion: SDK_HANDSHAKE_CONTRACT_VERSION,
        sdkVersion: SDK_PACKAGE_VERSION,
        apiVersion: SDK_API_VERSION,
        capabilitySchemaVersion: SDK_CAPABILITY_SCHEMA_VERSION,
        featureFlags: getSdkFeatureFlags(),
    };
}

function parseMajor(version: string | undefined): number | null {
    const value = String(version ?? "").trim();
    if (!value) {
        return null;
    }

    const match = value.match(/^(\d+)/u);
    if (!match) {
        return null;
    }

    const major = Number.parseInt(match[1], 10);
    return Number.isFinite(major) ? major : null;
}

function createSummary(issues: SdkHandshakeCompatibilityIssue[]): string {
    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.filter((issue) => issue.severity === "warning").length;

    if (errorCount === 0 && warningCount === 0) {
        return "SDK handshake is compatible with host expectations.";
    }

    const parts = [
        `${errorCount} error${errorCount === 1 ? "" : "s"}`,
        `${warningCount} warning${warningCount === 1 ? "" : "s"}`,
    ];
    return `SDK handshake compatibility check found ${parts.join(" and ")}.`;
}

function toStatus(issues: SdkHandshakeCompatibilityIssue[]): SdkHandshakeCompatibilityReport["status"] {
    if (issues.some((issue) => issue.severity === "error")) {
        return "incompatible";
    }
    if (issues.some((issue) => issue.severity === "warning")) {
        return "needs-attention";
    }
    return "compatible";
}

function requiredFlags(options: SdkHandshakeCompatibilityOptions): SdkHandshakeFeatureFlagName[] {
    return Array.from(new Set(options.requiredFeatureFlags ?? []));
}

export function evaluateSdkHandshakeCompatibility(
    handshake: SdkHandshake,
    options: SdkHandshakeCompatibilityOptions = {}
): SdkHandshakeCompatibilityReport {
    const issues: SdkHandshakeCompatibilityIssue[] = [];

    const expectedContractVersion = options.expectedContractVersion;
    if (expectedContractVersion) {
        const expectedMajor = parseMajor(expectedContractVersion);
        const receivedMajor = parseMajor(handshake.contractVersion);

        if (expectedMajor === null || receivedMajor === null || expectedMajor !== receivedMajor) {
            issues.push({
                code: "HANDSHAKE_CONTRACT_INCOMPATIBLE",
                severity: "error",
                message: "SDK handshake contract major version is incompatible with host expectation.",
                expected: expectedContractVersion,
                received: handshake.contractVersion,
            });
        }
    }

    const expectedApiVersion = options.expectedApiVersion;
    if (expectedApiVersion) {
        const expectedMajor = parseMajor(expectedApiVersion);
        const receivedMajor = parseMajor(handshake.apiVersion);

        if (expectedMajor === null || receivedMajor === null || expectedMajor !== receivedMajor) {
            issues.push({
                code: "HANDSHAKE_API_INCOMPATIBLE",
                severity: "error",
                message: "SDK API major version is incompatible with host expectation.",
                expected: expectedApiVersion,
                received: handshake.apiVersion,
            });
        }
    }

    const expectedCapabilitySchemaVersion = options.expectedCapabilitySchemaVersion;
    if (
        expectedCapabilitySchemaVersion
        && handshake.capabilitySchemaVersion !== expectedCapabilitySchemaVersion
    ) {
        issues.push({
            code: "HANDSHAKE_CAPABILITY_SCHEMA_MISMATCH",
            severity: options.capabilitySchemaSeverity ?? "warning",
            message: "SDK capability schema version does not match host expectation.",
            expected: expectedCapabilitySchemaVersion,
            received: handshake.capabilitySchemaVersion,
        });
    }

    const featureFlagSeverity = options.featureFlagSeverity ?? "warning";
    for (const featureFlag of requiredFlags(options)) {
        if (handshake.featureFlags[featureFlag] !== true) {
            issues.push({
                code: "HANDSHAKE_FEATURE_FLAG_MISSING",
                severity: featureFlagSeverity,
                message: `Required SDK feature flag "${featureFlag}" is not enabled.`,
                expected: "true",
                received: String(handshake.featureFlags[featureFlag]),
                featureFlag,
            });
        }
    }

    const status = toStatus(issues);
    const report: SdkHandshakeCompatibilityReport = {
        ok: status !== "incompatible",
        status,
        handshake,
        counts: {
            error: issues.filter((issue) => issue.severity === "error").length,
            warning: issues.filter((issue) => issue.severity === "warning").length,
        },
        issues,
        summary: createSummary(issues),
    };

    return report;
}

export function isSdkHandshakeCompatible(
    handshake: SdkHandshake,
    options: SdkHandshakeCompatibilityOptions = {}
): boolean {
    return evaluateSdkHandshakeCompatibility(handshake, options).ok;
}
