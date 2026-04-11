import {
    ClipboardReadActionRequest,
    ClipboardWriteActionRequest,
    PrivilegedActionResponse,
    RequestPrivilegedActionOptions,
} from "../types";
import { requestPrivilegedAction } from "./privilegedTransport";
import { createClipboardReadActionRequest, createClipboardWriteActionRequest } from "./privilegedActions";

export function createClipboardReadRequest(reason?: string): ClipboardReadActionRequest {
    return createClipboardReadActionRequest({
        action: "system.clipboard.read",
        payload: {
            ...(reason ? { reason } : {}),
        },
    });
}

export function createClipboardWriteRequest(
    text: string,
    reason?: string
): ClipboardWriteActionRequest {
    return createClipboardWriteActionRequest({
        action: "system.clipboard.write",
        payload: {
            text,
            ...(reason ? { reason } : {}),
        },
    });
}

export function requestClipboardWrite<TResult = unknown>(
    text: string,
    reasonOrOptions?: string | RequestPrivilegedActionOptions,
    options?: RequestPrivilegedActionOptions
): Promise<PrivilegedActionResponse<TResult>> {
    const reason = typeof reasonOrOptions === "string" ? reasonOrOptions : undefined;
    const resolvedOptions = (typeof reasonOrOptions === "object" && reasonOrOptions !== null)
        ? reasonOrOptions
        : options;

    return requestPrivilegedAction<TResult>(
        createClipboardWriteRequest(text, reason),
        {
            correlationIdPrefix: "clipboard",
            ...resolvedOptions,
        }
    );
}

export function requestClipboardRead<TResult = { text?: string }>(
    reasonOrOptions?: string | RequestPrivilegedActionOptions,
    options?: RequestPrivilegedActionOptions
): Promise<PrivilegedActionResponse<TResult>> {
    const reason = typeof reasonOrOptions === "string" ? reasonOrOptions : undefined;
    const resolvedOptions = (typeof reasonOrOptions === "object" && reasonOrOptions !== null)
        ? reasonOrOptions
        : options;

    return requestPrivilegedAction<TResult>(
        createClipboardReadRequest(reason),
        {
            correlationIdPrefix: "clipboard",
            ...resolvedOptions,
        }
    );
}
