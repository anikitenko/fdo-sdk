import {
    createCapabilityBundle,
    createFilesystemCapabilityBundle,
    createNetworkCapabilityBundle,
    createNetworkScopeCapability,
    createProcessCapabilityBundle,
    createStorageCapabilityBundle,
    createWorkflowCapabilityBundle,
    describeCapability,
    parseMissingCapabilityError,
    configureCapabilities,
    getCapabilityDiagnostics,
    runCapabilityPreflight,
    requireCapability,
    requireFilesystemScopeCapability,
    requireNetworkScopeCapability,
    requireProcessScopeCapability,
    requireStorageBackendCapability,
    requireWorkflowProcessCapabilities,
    resetCapabilityStateForTests,
} from "../../src/utils/capabilities";

describe("capabilities", () => {
    beforeEach(() => {
        resetCapabilityStateForTests();
    });

    test("allows granted capabilities", () => {
        configureCapabilities({ granted: ["storage", "storage.json"] });
        expect(() => requireStorageBackendCapability("json", "write persistent state")).not.toThrow();
        expect(() => requireCapability("storage.json", "write persistent state")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.granted).toEqual(["storage", "storage.json"]);
        expect(diagnostics.usageCount["storage"]).toBe(1);
        expect(diagnostics.usageCount["storage.json"]).toBe(2);
        expect(diagnostics.deniedCount["storage"]).toBeUndefined();
        expect(diagnostics.deniedCount["storage.json"]).toBeUndefined();
    });

    test("rejects missing capabilities and records denial", () => {
        configureCapabilities({ granted: [] });
        expect(() => requireCapability("sudo.prompt", "request elevated privileges")).toThrow(
            'Capability "sudo.prompt" is required to request elevated privileges. Configure PluginRegistry.configureCapabilities({ granted: ["sudo.prompt"] }) in the host before plugin initialization.'
        );

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.granted).toEqual([]);
        expect(diagnostics.usageCount["sudo.prompt"]).toBe(1);
        expect(diagnostics.deniedCount["sudo.prompt"]).toBe(1);
    });

    test("treats host write capability aliases as equivalent", () => {
        configureCapabilities({ granted: ["system.host.write"] });
        expect(() => requireCapability("system.hosts.write", "write hosts data")).not.toThrow();

        configureCapabilities({ granted: ["system.hosts.write"] });
        expect(() => requireCapability("system.host.write", "write host-scoped data")).not.toThrow();
    });

    test("validates and checks filesystem scope capabilities", () => {
        configureCapabilities({ granted: ["system.fs.scope.etc-hosts"] });
        expect(() => requireFilesystemScopeCapability("etc hosts", "mutate /etc/hosts")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.usageCount["system.fs.scope.etc-hosts"]).toBe(1);
    });

    test("validates and checks process scope capabilities", () => {
        configureCapabilities({ granted: ["system.process.scope.docker-cli"] });
        expect(() => requireProcessScopeCapability("docker cli", "execute docker commands")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.usageCount["system.process.scope.docker-cli"]).toBe(1);
    });

    test("validates and checks network scope capabilities", () => {
        configureCapabilities({ granted: ["system.network.scope.public-web-secure"] });
        expect(() => requireNetworkScopeCapability("public web secure", "reach approved public HTTPS endpoints")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.usageCount["system.network.scope.public-web-secure"]).toBe(1);
    });

    test("creates deduplicated capability bundles", () => {
        expect(createCapabilityBundle([
            "system.process.exec",
            "system.process.scope.kubectl",
            "system.process.exec",
        ])).toEqual([
            "system.process.exec",
            "system.process.scope.kubectl",
        ]);
    });

    test("creates filesystem and process capability bundles", () => {
        expect(createFilesystemCapabilityBundle("etc hosts")).toEqual([
            "system.fs.scope.etc-hosts",
            "system.hosts.write",
        ]);
        expect(createProcessCapabilityBundle("kubectl")).toEqual([
            "system.process.exec",
            "system.process.scope.kubectl",
        ]);
        expect(createWorkflowCapabilityBundle("terraform")).toEqual([
            "system.process.exec",
            "system.process.scope.terraform",
        ]);
        expect(createStorageCapabilityBundle("json")).toEqual([
            "storage",
            "storage.json",
        ]);
        expect(createNetworkCapabilityBundle(["https"])).toEqual([
            "system.network",
            "system.network.https",
        ]);
        expect(createNetworkScopeCapability("public web secure")).toBe("system.network.scope.public-web-secure");
        expect(createNetworkCapabilityBundle({
            transports: ["https"],
            scopeId: "public web secure",
        })).toEqual([
            "system.network",
            "system.network.https",
            "system.network.scope.public-web-secure",
        ]);
    });

    test("requires existing process capabilities for scoped workflows", () => {
        configureCapabilities({ granted: ["system.process.exec", "system.process.scope.terraform"] });
        expect(() => requireWorkflowProcessCapabilities("terraform", "run a scoped workflow")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.usageCount["system.process.exec"]).toBe(1);
        expect(diagnostics.usageCount["system.process.scope.terraform"]).toBe(1);
    });

    test("describes broad and scoped capabilities", () => {
        expect(describeCapability("storage")).toEqual({
            capability: "storage",
            label: "Storage",
            description: "Base capability family for plugin-managed persistent storage backends.",
            category: "storage",
        });

        expect(describeCapability("storage.json")).toEqual({
            capability: "storage.json",
            label: "JSON Storage Backend",
            description: 'Allows the plugin to use the persistent JSON store backend (requires base capability "storage").',
            category: "storage",
        });

        expect(describeCapability("system.clipboard.read")).toEqual({
            capability: "system.clipboard.read",
            label: "Clipboard Read",
            description: "Allows the plugin to request host-mediated clipboard reads.",
            category: "clipboard",
        });

        expect(describeCapability("system.clipboard.write")).toEqual({
            capability: "system.clipboard.write",
            label: "Clipboard Write",
            description: "Allows the plugin to request host-mediated clipboard writes.",
            category: "clipboard",
        });

        expect(describeCapability("system.process.exec")).toEqual({
            capability: "system.process.exec",
            label: "Scoped Tool Execution",
            description: "Allows host-mediated execution of allowlisted operational tools when paired with a process scope capability.",
            category: "process",
        });

        expect(describeCapability("system.network")).toEqual({
            capability: "system.network",
            label: "Network",
            description: "Base network capability family. Pair with concrete transport capabilities such as system.network.https.",
            category: "network",
        });

        expect(describeCapability("system.network.https")).toEqual({
            capability: "system.network.https",
            label: "Network HTTPS",
            description: "Allows outbound HTTPS requests through host-approved runtime network APIs.",
            category: "network",
        });

        expect(describeCapability("system.network.scope.public-web-secure")).toEqual({
            capability: "system.network.scope.public-web-secure",
            label: "Network Scope: public-web-secure",
            description: 'Allows host-defined network scope access inside "public-web-secure". Pair with system.network and required transport capabilities.',
            category: "network-scope",
        });

        expect(describeCapability("system.process.scope.kubectl")).toEqual({
            capability: "system.process.scope.kubectl",
            label: "Process Scope: kubectl",
            description: 'Allows scoped process execution inside the "kubectl" host policy.',
            category: "process-scope",
        });
    });

    test("requires storage base and backend capabilities for storage helpers", () => {
        configureCapabilities({ granted: ["storage"] });
        expect(() => requireStorageBackendCapability("json", "use persistent json backend")).toThrow(
            'Capability "storage.json" is required to use persistent json backend. Configure PluginRegistry.configureCapabilities({ granted: ["storage.json"] }) in the host before plugin initialization.'
        );

        configureCapabilities({ granted: ["storage.json"] });
        expect(() => requireStorageBackendCapability("json", "use persistent json backend")).toThrow(
            'Capability "storage" is required to use persistent json backend. Configure PluginRegistry.configureCapabilities({ granted: ["storage"] }) in the host before plugin initialization.'
        );
    });

    test("parses missing capability errors into structured remediation", () => {
        let thrownError: unknown;
        try {
            requireCapability("system.process.exec", "execute scoped operator tools");
        } catch (error) {
            thrownError = error;
        }

        expect(parseMissingCapabilityError(thrownError)).toEqual({
            capability: "system.process.exec",
            action: "execute scoped operator tools",
            category: "process",
            label: "Scoped Tool Execution",
            description: "Allows host-mediated execution of allowlisted operational tools when paired with a process scope capability.",
            remediation: 'Grant "system.process.exec" in the host capability configuration before plugin initialization. Configure PluginRegistry.configureCapabilities({ granted: ["system.process.exec"] }) in the host before plugin initialization.',
        });
    });

    test("builds preflight diagnostics for missing capabilities and prerequisites", () => {
        const report = runCapabilityPreflight({
            declared: ["storage.json"],
            granted: [],
            action: "initialize plugin runtime",
        });

        expect(report.ok).toBe(false);
        expect(report.summary).toBe("Missing 1 declared capability (storage.json).");
        expect(report.missing).toEqual([
            {
                capability: "storage.json",
                action: "initialize plugin runtime",
                category: "storage",
                label: "JSON Storage Backend",
                description: 'Allows the plugin to use the persistent JSON store backend (requires base capability "storage").',
                remediation: 'Grant "storage.json" with prerequisite capabilities "storage" before plugin initialization. Configure PluginRegistry.configureCapabilities({ granted: ["storage", "storage.json"] }) in the host before plugin initialization.',
                requiredCapabilities: ["storage", "storage.json"],
                missingPrerequisites: ["storage"],
                grantedPrerequisites: [],
            },
        ]);
        expect(report.remediations).toEqual([
            'Grant "storage.json" with prerequisite capabilities "storage" before plugin initialization. Configure PluginRegistry.configureCapabilities({ granted: ["storage", "storage.json"] }) in the host before plugin initialization.',
        ]);
    });

    test("reports undeclared granted capabilities in preflight output", () => {
        const report = runCapabilityPreflight({
            declared: ["system.process.exec"],
            granted: ["system.process.exec", "system.process.scope.git"],
            action: "validate declared capabilities",
        });

        expect(report.ok).toBe(true);
        expect(report.summary).toBe("All declared capabilities are granted.");
        expect(report.missing).toEqual([]);
        expect(report.undeclaredGranted).toEqual([
            {
                capability: "system.process.scope.git",
                label: "Process Scope: git",
                description: 'Allows scoped process execution inside the "git" host policy.',
                category: "process-scope",
            },
        ]);
    });

    test("returns null for non-capability errors", () => {
        expect(parseMissingCapabilityError(new Error("something else"))).toBeNull();
    });
});
