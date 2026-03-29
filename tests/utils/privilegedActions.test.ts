import {
    createFilesystemMutateActionRequest,
    createFilesystemScopeCapability,
    createHostsWriteActionRequest,
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
});
