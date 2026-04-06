import {
    createCapabilityBundle,
    createFilesystemCapabilityBundle,
    createProcessCapabilityBundle,
    createWorkflowCapabilityBundle,
    describeCapability,
    parseMissingCapabilityError,
    configureCapabilities,
    getCapabilityDiagnostics,
    requireCapability,
    requireFilesystemScopeCapability,
    requireProcessScopeCapability,
    requireWorkflowProcessCapabilities,
    resetCapabilityStateForTests,
} from "../../src/utils/capabilities";

describe("capabilities", () => {
    beforeEach(() => {
        resetCapabilityStateForTests();
    });

    test("allows granted capabilities", () => {
        configureCapabilities({ granted: ["storage.json"] });
        expect(() => requireCapability("storage.json", "write persistent state")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.granted).toEqual(["storage.json"]);
        expect(diagnostics.usageCount["storage.json"]).toBe(1);
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
    });

    test("requires existing process capabilities for scoped workflows", () => {
        configureCapabilities({ granted: ["system.process.exec", "system.process.scope.terraform"] });
        expect(() => requireWorkflowProcessCapabilities("terraform", "run a scoped workflow")).not.toThrow();

        const diagnostics = getCapabilityDiagnostics();
        expect(diagnostics.usageCount["system.process.exec"]).toBe(1);
        expect(diagnostics.usageCount["system.process.scope.terraform"]).toBe(1);
    });

    test("describes broad and scoped capabilities", () => {
        expect(describeCapability("system.process.exec")).toEqual({
            capability: "system.process.exec",
            label: "Scoped Tool Execution",
            description: "Allows host-mediated execution of allowlisted operational tools when paired with a process scope capability.",
            category: "process",
        });

        expect(describeCapability("system.process.scope.kubectl")).toEqual({
            capability: "system.process.scope.kubectl",
            label: "Process Scope: kubectl",
            description: 'Allows scoped process execution inside the "kubectl" host policy.',
            category: "process-scope",
        });
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
            remediation: 'Grant "system.process.exec" in the host capability configuration before plugin initialization.',
        });
    });

    test("returns null for non-capability errors", () => {
        expect(parseMissingCapabilityError(new Error("something else"))).toBeNull();
    });
});
