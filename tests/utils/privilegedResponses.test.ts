import {
    createPrivilegedActionCorrelationId,
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
});
