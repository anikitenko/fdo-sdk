import {
    configureCapabilities,
    getCapabilityDiagnostics,
    requireCapability,
    requireFilesystemScopeCapability,
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
});
