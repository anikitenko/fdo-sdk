import {
    createFilesystemMutateActionRequest,
    createPrivilegedActionBackendRequest,
    requestPrivilegedAction,
} from "../../src";

function createRequest() {
    return createFilesystemMutateActionRequest({
        action: "system.fs.mutate",
        payload: {
            scope: "etc-hosts",
            dryRun: true,
            operations: [
                {
                    type: "writeFile",
                    path: "/etc/hosts",
                    content: "# managed",
                    encoding: "utf8",
                },
            ],
        },
    });
}

describe("privileged transport helpers", () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
        if (originalWindow) {
            globalThis.window = originalWindow;
            return;
        }

        delete (globalThis as { window?: Window }).window;
    });

    test("creates backend request payload with generated correlation id", () => {
        const payload = createPrivilegedActionBackendRequest(createRequest(), {
            correlationIdPrefix: "docker cli",
        });

        expect(payload).toEqual({
            correlationId: expect.stringMatching(/^docker-cli-\d+$/),
            request: createRequest(),
        });
    });

    test("uses provided correlation id and preserves request payload", () => {
        const request = createRequest();
        expect(createPrivilegedActionBackendRequest(request, {
            correlationId: "custom-id",
        })).toEqual({
            correlationId: "custom-id",
            request,
        });
    });

    test("sends privileged action through the default host handler", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: true,
            correlationId: "docker-cli-123",
            result: { dryRun: true },
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestPrivilegedAction(createRequest(), {
            correlationIdPrefix: "docker-cli",
        })).resolves.toEqual({
            ok: true,
            correlationId: "docker-cli-123",
            result: { dryRun: true },
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^docker-cli-\d+$/),
            request: createRequest(),
        });
    });

    test("supports custom host handler names", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: false,
            correlationId: "custom-id",
            error: "denied",
            code: "CAPABILITY_MISSING",
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestPrivilegedAction(createRequest(), {
            correlationId: "custom-id",
            handler: "requestScopedAction",
        })).resolves.toEqual({
            ok: false,
            correlationId: "custom-id",
            error: "denied",
            code: "CAPABILITY_MISSING",
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestScopedAction", {
            correlationId: "custom-id",
            request: createRequest(),
        });
    });

    test("fails outside the plugin iframe runtime", async () => {
        delete (globalThis as { window?: Window }).window;

        await expect(requestPrivilegedAction(createRequest())).rejects.toThrow(
            "requestPrivilegedAction is only available in the plugin iframe runtime."
        );
    });
});
