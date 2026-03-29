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
            capabilities: ["storage.json", "system.hosts.write", "system.fs.scope.etc-hosts"]
        })).toEqual({
            apiVersion: "1.0.0",
            capabilities: ["storage.json", "system.hosts.write", "system.fs.scope.etc-hosts"],
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
        })).toThrow('Host privileged action "action" must be "system.hosts.write" or "system.fs.mutate".');
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
});
