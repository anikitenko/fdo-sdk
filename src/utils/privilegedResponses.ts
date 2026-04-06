import { PrivilegedActionErrorResponse, PrivilegedActionResponse, PrivilegedActionSuccessResponse } from "../types";

export function createPrivilegedActionCorrelationId(prefix: string = "privileged-action"): string {
    const normalizedPrefix = prefix.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "privileged-action";
    return `${normalizedPrefix}-${Date.now()}`;
}

export function isPrivilegedActionSuccessResponse<TResult = unknown>(
    value: unknown
): value is PrivilegedActionSuccessResponse<TResult> {
    return Boolean(value)
        && typeof value === "object"
        && (value as PrivilegedActionSuccessResponse<TResult>).ok === true
        && typeof (value as PrivilegedActionSuccessResponse<TResult>).correlationId === "string";
}

export function isPrivilegedActionErrorResponse(value: unknown): value is PrivilegedActionErrorResponse {
    return Boolean(value)
        && typeof value === "object"
        && (value as PrivilegedActionErrorResponse).ok === false
        && typeof (value as PrivilegedActionErrorResponse).correlationId === "string"
        && typeof (value as PrivilegedActionErrorResponse).error === "string";
}

export function unwrapPrivilegedActionResponse<TResult = unknown>(
    response: PrivilegedActionResponse<TResult>
): TResult | undefined {
    if (response.ok) {
        return response.result;
    }

    const error = new Error(response.error);
    if (response.code) {
        Object.assign(error, { code: response.code });
    }
    throw error;
}
