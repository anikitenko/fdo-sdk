import {
    createOperatorToolActionRequest,
    createOperatorToolCapabilityPreset,
    createScopedProcessExecActionRequest,
    getOperatorToolPreset,
    listOperatorToolPresets,
    requestOperatorTool,
    requestScopedProcessExec,
} from "../../src";

describe("operator tooling helpers", () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
        if (originalWindow) {
            globalThis.window = originalWindow;
            return;
        }

        delete (globalThis as { window?: Window }).window;
    });

    test("returns a curated operator preset with capabilities", () => {
        expect(getOperatorToolPreset("terraform")).toEqual({
            id: "terraform",
            label: "Terraform",
            description: "Infrastructure plan and apply workflows through scoped Terraform execution.",
            scopeId: "terraform",
            capabilities: ["system.process.exec", "system.process.scope.terraform"],
            suggestedCommands: ["terraform"],
            typicalUseCases: ["Plan review", "Apply orchestration", "Workspace management"],
        });
    });

    test("lists common devops and sre operator presets", () => {
        const presetIds = listOperatorToolPresets().map((preset) => preset.id);
        expect(presetIds).toEqual([
            "ansible",
            "aws-cli",
            "azure-cli",
            "docker-cli",
            "gcloud",
            "gh",
            "git",
            "helm",
            "kubectl",
            "kustomize",
            "nomad",
            "podman",
            "terraform",
            "vault",
        ]);
    });

    test("creates a capability preset for a tool family", () => {
        expect(createOperatorToolCapabilityPreset("gh")).toEqual([
            "system.process.exec",
            "system.process.scope.gh",
        ]);
    });

    test("creates a generic scoped process exec request", () => {
        expect(createScopedProcessExecActionRequest("custom-tool", {
            command: "/usr/local/bin/custom-tool",
            args: ["status"],
            dryRun: true,
        })).toEqual({
            action: "system.process.exec",
            payload: {
                scope: "custom-tool",
                command: "/usr/local/bin/custom-tool",
                args: ["status"],
                dryRun: true,
            },
        });
    });

    test("creates an operator tool request from a preset", () => {
        expect(createOperatorToolActionRequest("kubectl", {
            command: "/usr/local/bin/kubectl",
            args: ["get", "pods", "-A"],
            timeoutMs: 5000,
        })).toEqual({
            action: "system.process.exec",
            payload: {
                scope: "kubectl",
                command: "/usr/local/bin/kubectl",
                args: ["get", "pods", "-A"],
                timeoutMs: 5000,
            },
        });
    });

    test("requests a generic scoped process execution", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: true,
            correlationId: "custom-tool-1",
            result: { stdout: "ok" },
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestScopedProcessExec("custom-tool", {
            command: "/usr/local/bin/custom-tool",
            args: ["status"],
        })).resolves.toEqual({
            ok: true,
            correlationId: "custom-tool-1",
            result: { stdout: "ok" },
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^custom-tool-\d+$/),
            request: {
                action: "system.process.exec",
                payload: {
                    scope: "custom-tool",
                    command: "/usr/local/bin/custom-tool",
                    args: ["status"],
                },
            },
        });
    });

    test("requests an operator tool using the preset scope id", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: false,
            correlationId: "terraform-1",
            error: "denied",
            code: "CAPABILITY_MISSING",
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestOperatorTool("terraform", {
            command: "/usr/local/bin/terraform",
            args: ["plan"],
            dryRun: true,
        })).resolves.toEqual({
            ok: false,
            correlationId: "terraform-1",
            error: "denied",
            code: "CAPABILITY_MISSING",
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^terraform-\d+$/),
            request: {
                action: "system.process.exec",
                payload: {
                    scope: "terraform",
                    command: "/usr/local/bin/terraform",
                    args: ["plan"],
                    dryRun: true,
                },
            },
        });
    });
});
