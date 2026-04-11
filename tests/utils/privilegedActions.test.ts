import {
    createClipboardReadActionRequest,
    createClipboardWriteActionRequest,
    createFilesystemMutateActionRequest,
    createFilesystemScopeCapability,
    createHostsWriteActionRequest,
    createProcessExecActionRequest,
    createProcessScopeCapability,
    createWorkflowRunActionRequest,
    validatePrivilegedActionRequest,
} from "../../src";

describe("privileged action helpers", () => {
    test("creates normalized filesystem scope capability", () => {
        expect(createFilesystemScopeCapability(" ETC Hosts ")).toBe("system.fs.scope.etc-hosts");
    });

    test("rejects invalid filesystem scope capability input", () => {
        expect(() => createFilesystemScopeCapability("___")).toThrow(
            "Filesystem scope id must contain at least one alphanumeric character."
        );
    });

    test("creates normalized process scope capability", () => {
        expect(createProcessScopeCapability(" Docker CLI ")).toBe("system.process.scope.docker-cli");
    });

    test("builds hosts write requests through validator", () => {
        expect(createHostsWriteActionRequest({
            action: "system.hosts.write",
            payload: {
                records: [{ address: "127.0.0.1", hostname: "local.test" }],
            },
        })).toEqual({
            action: "system.hosts.write",
            payload: {
                records: [{ address: "127.0.0.1", hostname: "local.test" }],
            },
        });
    });

    test("builds clipboard write requests through validator", () => {
        expect(createClipboardWriteActionRequest({
            action: "system.clipboard.write",
            payload: {
                text: "copied from example 07",
                reason: "copy editor content",
            },
        })).toEqual({
            action: "system.clipboard.write",
            payload: {
                text: "copied from example 07",
                reason: "copy editor content",
            },
        });
    });

    test("builds clipboard read requests through validator", () => {
        expect(createClipboardReadActionRequest({
            action: "system.clipboard.read",
            payload: {
                reason: "read clipboard for demo",
            },
        })).toEqual({
            action: "system.clipboard.read",
            payload: {
                reason: "read clipboard for demo",
            },
        });
    });

    test("builds filesystem mutate requests through validator", () => {
        expect(createFilesystemMutateActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                operations: [{ type: "mkdir", path: "/tmp/fdo-privileged", recursive: true }],
            },
        })).toEqual({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                operations: [{ type: "mkdir", path: "/tmp/fdo-privileged", recursive: true }],
            },
        });
    });

    test("validates generic privileged requests", () => {
        expect(() => validatePrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                operations: [{ type: "writeFile", path: "/tmp/test", content: "x" }],
            },
        })).not.toThrow();
    });

    test("builds process exec requests through validator", () => {
        expect(createProcessExecActionRequest({
            action: "system.process.exec",
            payload: {
                scope: "docker-cli",
                command: "/usr/local/bin/docker",
                args: ["ps", "--format", "json"],
                cwd: "/Users/test/project",
                timeoutMs: 5000,
                dryRun: true,
                reason: "list containers",
            },
        })).toEqual({
            action: "system.process.exec",
            payload: {
                scope: "docker-cli",
                command: "/usr/local/bin/docker",
                args: ["ps", "--format", "json"],
                cwd: "/Users/test/project",
                timeoutMs: 5000,
                dryRun: true,
                reason: "list containers",
            },
        });
    });

    test("builds workflow run requests through validator", () => {
        expect(createWorkflowRunActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Terraform preview and apply",
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        command: "/usr/local/bin/terraform",
                        args: ["plan", "-input=false"],
                        onError: "abort",
                    },
                ],
                confirmation: {
                    message: "Apply infrastructure changes?",
                    requiredForStepIds: ["plan"],
                },
            },
        })).toEqual({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Terraform preview and apply",
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        command: "/usr/local/bin/terraform",
                        args: ["plan", "-input=false"],
                        onError: "abort",
                    },
                ],
                confirmation: {
                    message: "Apply infrastructure changes?",
                    requiredForStepIds: ["plan"],
                },
            },
        });
    });
});
