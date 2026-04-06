import {
    HostPrivilegedActionRequest,
    PrivilegedActionBackendRequest,
    PrivilegedActionResponse,
    RequestPrivilegedActionOptions,
} from "../types";

function resolvePrivilegedActionCorrelationId(options?: RequestPrivilegedActionOptions): string {
    if (options?.correlationId) {
        return options.correlationId;
    }

    const normalizedPrefix = (options?.correlationIdPrefix ?? "privileged-action")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "privileged-action";
    return `${normalizedPrefix}-${Date.now()}`;
}

export function createPrivilegedActionBackendRequest<TRequest extends HostPrivilegedActionRequest>(
    request: TRequest,
    options?: RequestPrivilegedActionOptions
): PrivilegedActionBackendRequest<TRequest> {
    return {
        correlationId: resolvePrivilegedActionCorrelationId(options),
        request,
    };
}

export async function requestPrivilegedAction<TResult = unknown, TRequest extends HostPrivilegedActionRequest = HostPrivilegedActionRequest>(
    request: TRequest,
    options?: RequestPrivilegedActionOptions
): Promise<PrivilegedActionResponse<TResult>> {
    const runtimeWindow = typeof window === "undefined" ? undefined : window;
    if (!runtimeWindow || typeof runtimeWindow.createBackendReq !== "function") {
        throw new Error("requestPrivilegedAction is only available in the plugin iframe runtime.");
    }

    const payload = {
        correlationId: options?.correlationId
            ?? `${((options?.correlationIdPrefix ?? "privileged-action")
                .trim()
                .replace(/[^a-zA-Z0-9._-]+/g, "-")
                .replace(/^-+|-+$/g, "") || "privileged-action")}-${Date.now()}`,
        request,
    };
    const handler = options?.handler ?? "requestPrivilegedAction";
    return runtimeWindow.createBackendReq(handler, payload) as Promise<PrivilegedActionResponse<TResult>>;
}
