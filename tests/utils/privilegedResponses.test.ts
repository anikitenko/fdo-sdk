import {
    createPrivilegedActionCorrelationId,
    formatPrivilegedActionError,
    getInlinePrivilegedActionErrorFormatterSource,
    isPrivilegedActionErrorResponse,
    isPrivilegedActionSuccessResponse,
    unwrapPrivilegedActionResponse,
} from "../../src";

describe("privileged response helpers", () => {
    test("creates correlation ids with normalized prefix", () => {
        const value = createPrivilegedActionCorrelationId(" Docker Operator ");
        expect(value).toMatch(/^Docker-Operator-\d+$/);
    });

    test("detects success responses", () => {
        expect(isPrivilegedActionSuccessResponse({
            ok: true,
            correlationId: "abc",
            result: { exitCode: 0 },
        })).toBe(true);
        expect(isPrivilegedActionSuccessResponse({
            ok: false,
            correlationId: "abc",
            error: "denied",
        })).toBe(false);
    });

    test("detects error responses", () => {
        expect(isPrivilegedActionErrorResponse({
            ok: false,
            correlationId: "abc",
            error: "denied",
            code: "CAPABILITY_MISSING",
        })).toBe(true);
        expect(isPrivilegedActionErrorResponse({
            ok: true,
            correlationId: "abc",
        })).toBe(false);
    });

    test("unwraps success responses", () => {
        expect(unwrapPrivilegedActionResponse({
            ok: true,
            correlationId: "abc",
            result: { stdout: "[]" },
        })).toEqual({ stdout: "[]" });
    });

    test("throws on error responses", () => {
        expect(() => unwrapPrivilegedActionResponse({
            ok: false,
            correlationId: "abc",
            error: "denied",
            code: "CAPABILITY_MISSING",
        })).toThrow("denied");
    });

    test("formats privileged action errors with process result details", () => {
        const message = formatPrivilegedActionError({
            ok: false,
            correlationId: "priv-42",
            code: "PROCESS_EXIT_NON_ZERO",
            error: "Process exited with code 128.",
            result: {
                stderr: "fatal: cannot change to '/missing/path': No such file or directory",
                exitCode: 128,
                command: "/usr/bin/git",
                args: ["-C", "/missing/path", "status"],
                cwd: "/Users/alexvwan",
            },
        }, { context: "Git operation failed" });

        expect(message).toContain("Git operation failed (PROCESS_EXIT_NON_ZERO): Process exited with code 128.");
        expect(message).toContain("stderr: fatal: cannot change to '/missing/path': No such file or directory");
        expect(message).toContain("exitCode: 128");
        expect(message).toContain("command: /usr/bin/git -C /missing/path status");
        expect(message).toContain("cwd: /Users/alexvwan");
        expect(message).toContain("Correlation ID: priv-42");
    });

    test("builds inline formatter source for renderOnLoad runtimes", () => {
        const formatterFactory = Function(`return ${getInlinePrivilegedActionErrorFormatterSource()};`);
        const formatter = formatterFactory() as (response: unknown, options?: { context?: string }) => string;

        const message = formatter({
            ok: false,
            code: "CAPABILITY_MISSING",
            error: "Missing capability",
            result: {
                stdout: "fallback output",
            },
        }, {
            context: "Operator request failed",
        });

        expect(typeof formatter).toBe("function");
        expect(message).toContain("Operator request failed (CAPABILITY_MISSING): Missing capability");
        expect(message).toContain("stdout: fallback output");
        expect(message).toContain("Correlation ID: unknown");
    });
});
