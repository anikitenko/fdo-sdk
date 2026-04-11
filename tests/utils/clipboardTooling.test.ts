import {
    createClipboardReadRequest,
    createClipboardWriteRequest,
    requestClipboardRead,
    requestClipboardWrite,
} from "../../src";

describe("clipboard tooling", () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
        if (originalWindow) {
            globalThis.window = originalWindow;
            return;
        }

        delete (globalThis as { window?: Window }).window;
    });

    test("creates clipboard write requests", () => {
        expect(createClipboardWriteRequest("hello", "copy greeting")).toEqual({
            action: "system.clipboard.write",
            payload: {
                text: "hello",
                reason: "copy greeting",
            },
        });
    });

    test("creates clipboard read requests", () => {
        expect(createClipboardReadRequest("read greeting")).toEqual({
            action: "system.clipboard.read",
            payload: {
                reason: "read greeting",
            },
        });
    });

    test("sends clipboard writes through the privileged action host handler", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: true,
            correlationId: "clipboard-123",
            result: { bytesWritten: 5 },
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestClipboardWrite("hello", "copy greeting")).resolves.toEqual({
            ok: true,
            correlationId: "clipboard-123",
            result: { bytesWritten: 5 },
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^clipboard-\d+$/),
            request: {
                action: "system.clipboard.write",
                payload: {
                    text: "hello",
                    reason: "copy greeting",
                },
            },
        });
    });

    test("sends clipboard reads through the privileged action host handler", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: true,
            correlationId: "clipboard-456",
            result: { text: "hello from clipboard" },
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestClipboardRead("read greeting")).resolves.toEqual({
            ok: true,
            correlationId: "clipboard-456",
            result: { text: "hello from clipboard" },
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^clipboard-\d+$/),
            request: {
                action: "system.clipboard.read",
                payload: {
                    reason: "read greeting",
                },
            },
        });
    });
});
