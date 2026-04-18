import {
    createFilesystemMutateActionRequest,
    createPrivilegedActionBackendRequest,
    extractPrivilegedActionRequest,
    requestPrivilegedActionFromEnvelope,
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

    test("extracts request from wrapped UI_MESSAGE success payloads", () => {
        const request = createRequest();

        expect(extractPrivilegedActionRequest({
            ok: true,
            result: {
                correlationId: "corr-1",
                request,
            },
        })).toEqual(request);
    });

    test("extracts request from backend envelope payloads", () => {
        const request = createRequest();

        expect(extractPrivilegedActionRequest({
            correlationId: "corr-2",
            request,
        })).toEqual(request);
    });

    test("accepts direct privileged action requests unchanged", () => {
        const request = createRequest();

        expect(extractPrivilegedActionRequest(request)).toEqual(request);
    });

    test("fails with a descriptive error for malformed envelopes", () => {
        expect(() => extractPrivilegedActionRequest({
            ok: true,
            result: {
                correlationId: "corr-3",
            },
        })).toThrow(
            "Could not extract a valid privileged action request from the provided envelope or request."
        );
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

    test("runs envelope pipeline and returns formatted error details on host denial", async () => {
        const request = createRequest();
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: false,
            correlationId: "priv-100",
            error: 'Process "git" exited with code 128.',
            code: "PROCESS_EXIT_NON_ZERO",
            result: {
                command: "git",
                args: ["status"],
                cwd: "/tmp/missing-repo",
                stderr: "fatal: not a git repository (or any of the parent directories): .git",
                exitCode: 128,
            },
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        const pipeline = await requestPrivilegedActionFromEnvelope({
            ok: true,
            result: {
                correlationId: "backend-correlation",
                request,
            },
        }, {
            context: "Git operation failed",
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^privileged-action-\d+$/),
            request,
        });
        expect(pipeline.request).toEqual(request);
        expect(pipeline.response.ok).toBe(false);
        expect(pipeline.errorMessage).toContain('Git operation failed (PROCESS_EXIT_NON_ZERO): Process "git" exited with code 128.');
        expect(pipeline.errorMessage).toContain("stderr: fatal: not a git repository");
        expect(pipeline.errorMessage).toContain("command: git status");
        expect(pipeline.errorMessage).toContain("cwd: /tmp/missing-repo");
        expect(pipeline.errorMessage).toContain("Correlation ID: priv-100");
    });

    test("pipeline helper can throw formatted errors for non-ok responses", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: false,
            correlationId: "priv-200",
            error: "denied",
            code: "CAPABILITY_MISSING",
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestPrivilegedActionFromEnvelope(createRequest(), {
            throwOnError: true,
            context: "Privileged action failed",
        })).rejects.toThrow("Privileged action failed (CAPABILITY_MISSING): denied");
    });
});
