import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("@anikitenko/fdo-sdk", async () => {
    return await import("../src/index");
});

let SystemFilePlugin: typeof import("../examples/10-system-file-plugin").default;

beforeAll(async () => {
    (global as any).process.parentPort = {
        on: vi.fn(),
        postMessage: vi.fn(),
    };

    SystemFilePlugin = (await import("../examples/10-system-file-plugin")).default;
});

describe("System file example", () => {
    test("renderOnLoad extracts request payload from privileged envelope", () => {
        const plugin = new SystemFilePlugin();
        const onLoad = plugin.renderOnLoad();

        expect(onLoad).toContain("extractPrivilegedActionRequest(envelopeResponse)");
        expect(onLoad).not.toContain('createBackendReq("requestPrivilegedAction", envelope)');
    });
});
