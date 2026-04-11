import {
    validateHostMessageEnvelope,
    validateHostPrivilegedActionRequest,
    validatePluginInitPayload,
    validatePluginMetadata,
    validateSerializedRenderPayload,
    validateUIMessagePayload,
} from "../src/utils/contracts";
import { MESSAGE_TYPE } from "../src/enums";

describe("SDK contract validators", () => {
    test("validates plugin metadata objects", () => {
        expect(
            validatePluginMetadata({
                name: "Example",
                version: "1.0.0",
                author: "Test",
                description: "Example plugin",
                icon: "cog",
            })
        ).toEqual({
            name: "Example",
            version: "1.0.0",
            author: "Test",
            description: "Example plugin",
            icon: "cog",
        });
    });

    test("rejects invalid plugin metadata", () => {
        expect(() => validatePluginMetadata(null)).toThrow("Plugin metadata must be an object.");
        expect(() => validatePluginMetadata({
            name: "Example",
            version: "",
            author: "Test",
            description: "Example plugin",
            icon: "cog",
        })).toThrow('Plugin metadata field "version" must be a non-empty string.');
        expect(() => validatePluginMetadata({
            name: "Example",
            version: "1.0.0",
            author: "Test",
            description: "Example plugin",
            icon: "not-a-real-blueprint-icon",
        })).toThrow('Plugin metadata field "icon" must be a valid BlueprintJS v6 icon name. Received "not-a-real-blueprint-icon".');
        expect(() => validatePluginMetadata({
            name: "Example",
            version: "1.0.0",
            author: "Test",
            description: "Example plugin",
            icon: "settngs",
        })).toThrow(/Received "settngs"\. Did you mean: .*"settings"/);
    });

    test("validates serialized render payloads", () => {
        expect(
            validateSerializedRenderPayload({
                render: JSON.stringify("<div>Hello</div>"),
                onLoad: JSON.stringify("() => {}"),
            })
        ).toEqual({
            render: JSON.stringify("<div>Hello</div>"),
            onLoad: JSON.stringify("() => {}"),
        });
    });

    test("rejects invalid serialized render payloads", () => {
        expect(() => validateSerializedRenderPayload(null)).toThrow("Render payload must be an object.");
        expect(() => validateSerializedRenderPayload({
            render: 1,
            onLoad: JSON.stringify("() => {}"),
        })).toThrow('Render payload field "render" must be a string.');
    });

    test("validates host message envelopes", () => {
        expect(
            validateHostMessageEnvelope({
                message: MESSAGE_TYPE.PLUGIN_READY,
                content: { ok: true },
            })
        ).toEqual({
            message: MESSAGE_TYPE.PLUGIN_READY,
            content: { ok: true },
        });
    });

    test("rejects invalid host message envelopes", () => {
        expect(() => validateHostMessageEnvelope(null)).toThrow("Host message must be an object.");
        expect(() => validateHostMessageEnvelope({ message: "UNKNOWN" })).toThrow("Host message type is invalid.");
    });

    test("validates UI message payloads", () => {
        expect(
            validateUIMessagePayload({
                handler: "customHandler",
                content: "test-data",
            })
        ).toEqual({
            handler: "customHandler",
            content: "test-data",
        });

        expect(validateUIMessagePayload(undefined)).toEqual({});
    });

    test("rejects invalid UI message payloads", () => {
        expect(() => validateUIMessagePayload("bad-payload")).toThrow("UI message payload must be an object.");
        expect(() => validateUIMessagePayload({ handler: 1 })).toThrow(
            'UI message payload field "handler" must be a string when provided.'
        );
    });

    test("validates plugin init payloads", () => {
        expect(validatePluginInitPayload(undefined)).toEqual({});
        expect(validatePluginInitPayload({
            apiVersion: "1.0.0",
            capabilities: ["storage.json", "system.hosts.write", "system.fs.scope.etc-hosts", "system.process.exec", "system.process.scope.docker-cli"]
        })).toEqual({
            apiVersion: "1.0.0",
            capabilities: ["storage.json", "system.hosts.write", "system.fs.scope.etc-hosts", "system.process.exec", "system.process.scope.docker-cli"],
        });
    });

    test("rejects invalid plugin init payloads", () => {
        expect(() => validatePluginInitPayload("bad-payload")).toThrow("Plugin init payload must be an object.");
        expect(() => validatePluginInitPayload({ apiVersion: 1 })).toThrow(
            'Plugin init payload field "apiVersion" must be a string when provided.'
        );
        expect(() => validatePluginInitPayload({ capabilities: [1] })).toThrow(
            'Plugin init payload field "capabilities" must be an array of strings when provided.'
        );
        expect(() => validatePluginInitPayload({ capabilities: ["unknown.capability"] })).toThrow(
            'Plugin init payload capability "unknown.capability" is not supported by this SDK version.'
        );
    });

    test("validates host privileged action requests", () => {
        expect(validateHostPrivilegedActionRequest({
            action: "system.hosts.write",
            payload: {
                records: [
                    { address: "127.0.0.1", hostname: "local.test", comment: "dev alias" },
                ],
                dryRun: true,
                tag: "fdo-plugin",
            },
        })).toEqual({
            action: "system.hosts.write",
            payload: {
                records: [
                    { address: "127.0.0.1", hostname: "local.test", comment: "dev alias" },
                ],
                dryRun: true,
                tag: "fdo-plugin",
            },
        });
    });

    test("rejects invalid host privileged action requests", () => {
        expect(() => validateHostPrivilegedActionRequest(null)).toThrow(
            "Host privileged action request must be an object."
        );
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.shell.exec",
            payload: { records: [] },
        })).toThrow('Host privileged action "action" must be "system.clipboard.read", "system.clipboard.write", "system.hosts.write", "system.fs.mutate", "system.process.exec", or "system.workflow.run".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.hosts.write",
            payload: { records: [] },
        })).toThrow('Host privileged action payload field "records" must be a non-empty array.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.hosts.write",
            payload: { records: [{ address: "invalid", hostname: "local.test" }] },
        })).toThrow('Host privileged action payload record at index 0 has invalid "address".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.hosts.write",
            payload: { records: [{ address: "127.0.0.1", hostname: "bad host" }] },
        })).toThrow('Host privileged action payload record at index 0 has invalid "hostname".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: { scope: "etc-hosts", operations: [] },
        })).toThrow('Host privileged action payload field "operations" must be a non-empty array.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: { scope: "etc hosts", operations: [{ type: "mkdir", path: "/tmp/ok" }] },
        })).toThrow('Host privileged action payload field "scope" must match /^[a-z0-9][a-z0-9._-]*$/.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                operations: [{ type: "chown", path: "/tmp/ok" } as any],
            },
        })).toThrow('Host privileged action operation at index 0 has unsupported type "chown".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                operations: [{ type: "writeFile", path: "relative/path", content: "x" }],
            },
        })).toThrow('Host privileged action operation at index 0 has invalid "path".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                operations: [{ type: "writeFile", path: "/tmp/ok", content: "x", encoding: "latin1" as any }],
            },
        })).toThrow('Host privileged action operation at index 0 has invalid "encoding".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.process.exec",
            payload: { scope: "docker-cli", command: "docker" },
        })).toThrow('Host privileged action payload field "command" must be an absolute path.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.process.exec",
            payload: { scope: "docker cli", command: "/usr/local/bin/docker" },
        })).toThrow('Host privileged action payload field "scope" must match /^[a-z0-9][a-z0-9._-]*$/.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.process.exec",
            payload: { scope: "docker-cli", command: "/usr/local/bin/docker", args: ["ps", 1] as any },
        })).toThrow('Host privileged action payload field "args" must be an array of strings when provided.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.process.exec",
            payload: { scope: "docker-cli", command: "/usr/local/bin/docker", timeoutMs: 0 },
        })).toThrow('Host privileged action payload field "timeoutMs" must be a positive number when provided.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.process.exec",
            payload: { scope: "docker-cli", command: "/usr/local/bin/docker", encoding: "latin1" as any },
        })).toThrow('Host privileged action payload field "encoding" must be "utf8" or "base64" when provided.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "invalid-kind",
                title: "Workflow",
                steps: [],
            },
        })).toThrow('Host privileged workflow payload field "kind" must be "process-sequence".');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Workflow",
                steps: [
                    {
                        id: "Plan Step",
                        title: "Generate plan",
                        command: "/usr/local/bin/terraform",
                    },
                ],
            },
        })).toThrow('Host privileged workflow step at index 0 field "id" must match /^[a-z0-9][a-z0-9._-]*$/.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Workflow",
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        command: "terraform",
                    },
                ],
            },
        })).toThrow('Host privileged workflow step at index 0 field "command" must be an absolute path.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Workflow",
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        command: "/usr/local/bin/terraform",
                    },
                    {
                        id: "plan",
                        title: "Apply plan",
                        command: "/usr/local/bin/terraform",
                    },
                ],
            },
        })).toThrow('Host privileged workflow payload field "steps" must not contain duplicate step ids.');
        expect(() => validateHostPrivilegedActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Workflow",
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        command: "/usr/local/bin/terraform",
                    },
                ],
                confirmation: {
                    message: "Continue?",
                    requiredForStepIds: ["apply"],
                },
            },
        })).toThrow('Host privileged workflow confirmation field "requiredForStepIds" references unknown step id "apply".');
    });

    test("validates filesystem mutate privileged action requests", () => {
        expect(validateHostPrivilegedActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                dryRun: true,
                reason: "plugin setup",
                operations: [
                    { type: "mkdir", path: "/tmp/fdo-test", recursive: true },
                    { type: "writeFile", path: "/tmp/fdo-test/file.txt", content: "hello", encoding: "utf8" },
                    { type: "appendFile", path: "/tmp/fdo-test/file.txt", content: "\nworld" },
                    { type: "rename", from: "/tmp/fdo-test/file.txt", to: "/tmp/fdo-test/file2.txt" },
                    { type: "remove", path: "/tmp/fdo-test", recursive: true, force: true },
                ],
            },
        })).toEqual({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                dryRun: true,
                reason: "plugin setup",
                operations: [
                    { type: "mkdir", path: "/tmp/fdo-test", recursive: true },
                    { type: "writeFile", path: "/tmp/fdo-test/file.txt", content: "hello", encoding: "utf8" },
                    { type: "appendFile", path: "/tmp/fdo-test/file.txt", content: "\nworld" },
                    { type: "rename", from: "/tmp/fdo-test/file.txt", to: "/tmp/fdo-test/file2.txt" },
                    { type: "remove", path: "/tmp/fdo-test", recursive: true, force: true },
                ],
            },
        });
    });

    test("validates process exec privileged action requests", () => {
        expect(validateHostPrivilegedActionRequest({
            action: "system.process.exec",
            payload: {
                scope: "docker-cli",
                command: "/usr/local/bin/docker",
                args: ["compose", "ps", "--format", "json"],
                cwd: "/Users/test/project",
                env: { DOCKER_CONFIG: "/Users/test/.docker" },
                timeoutMs: 5000,
                input: "{}",
                encoding: "utf8",
                dryRun: true,
                reason: "inspect compose services",
            },
        })).toEqual({
            action: "system.process.exec",
            payload: {
                scope: "docker-cli",
                command: "/usr/local/bin/docker",
                args: ["compose", "ps", "--format", "json"],
                cwd: "/Users/test/project",
                env: { DOCKER_CONFIG: "/Users/test/.docker" },
                timeoutMs: 5000,
                input: "{}",
                encoding: "utf8",
                dryRun: true,
                reason: "inspect compose services",
            },
        });
    });

    test("validates scoped workflow privileged action requests", () => {
        expect(validateHostPrivilegedActionRequest({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Terraform preview and apply",
                summary: "Preview infrastructure changes before apply",
                dryRun: true,
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        phase: "preview",
                        command: "/usr/local/bin/terraform",
                        args: ["plan", "-input=false"],
                        cwd: "/Users/test/project",
                        env: { TF_IN_AUTOMATION: "1" },
                        timeoutMs: 10000,
                        input: "{}",
                        encoding: "utf8",
                        reason: "preview infrastructure plan",
                        onError: "abort",
                    },
                    {
                        id: "apply",
                        title: "Apply plan",
                        phase: "apply",
                        command: "/usr/local/bin/terraform",
                        args: ["apply", "-input=false", "tfplan"],
                        timeoutMs: 10000,
                        reason: "apply approved infrastructure plan",
                        onError: "abort",
                    },
                ],
                confirmation: {
                    message: "Apply infrastructure changes?",
                    requiredForStepIds: ["apply"],
                },
            },
        })).toEqual({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Terraform preview and apply",
                summary: "Preview infrastructure changes before apply",
                dryRun: true,
                steps: [
                    {
                        id: "plan",
                        title: "Generate plan",
                        phase: "preview",
                        command: "/usr/local/bin/terraform",
                        args: ["plan", "-input=false"],
                        cwd: "/Users/test/project",
                        env: { TF_IN_AUTOMATION: "1" },
                        timeoutMs: 10000,
                        input: "{}",
                        encoding: "utf8",
                        reason: "preview infrastructure plan",
                        onError: "abort",
                    },
                    {
                        id: "apply",
                        title: "Apply plan",
                        phase: "apply",
                        command: "/usr/local/bin/terraform",
                        args: ["apply", "-input=false", "tfplan"],
                        timeoutMs: 10000,
                        reason: "apply approved infrastructure plan",
                        onError: "abort",
                    },
                ],
                confirmation: {
                    message: "Apply infrastructure changes?",
                    requiredForStepIds: ["apply"],
                },
            },
        });
    });
});
