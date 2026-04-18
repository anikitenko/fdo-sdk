import {
    HostPrivilegedActionRequest,
    PrivilegedActionPipelineOptions,
    PrivilegedActionPipelineResult,
    PrivilegedActionBackendRequest,
    PrivilegedActionResponse,
    RequestPrivilegedActionOptions,
} from "../types";
import { validateHostPrivilegedActionRequest } from "./contracts";
import { formatPrivilegedActionError } from "./privilegedResponses";

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

export function extractPrivilegedActionRequest(
    envelopeOrRequest: unknown
): HostPrivilegedActionRequest {
    const candidate = (
        (typeof envelopeOrRequest === "object" && envelopeOrRequest !== null && "result" in envelopeOrRequest
            ? (envelopeOrRequest as { result?: unknown }).result
            : undefined) as { request?: unknown } | undefined
    )?.request
        ?? (typeof envelopeOrRequest === "object" && envelopeOrRequest !== null
            ? (envelopeOrRequest as { request?: unknown }).request
            : undefined)
        ?? envelopeOrRequest;

    try {
        return validateHostPrivilegedActionRequest(candidate);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Could not extract a valid privileged action request from the provided envelope or request. ${reason}`
        );
    }
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

function resolveEnvelopeCorrelationId(envelopeOrRequest: unknown): string | undefined {
    if (!envelopeOrRequest || typeof envelopeOrRequest !== "object") {
        return undefined;
    }

    const resultCorrelationId = (envelopeOrRequest as { result?: { correlationId?: unknown } })
        .result?.correlationId;
    if (typeof resultCorrelationId === "string" && resultCorrelationId.trim().length > 0) {
        return resultCorrelationId.trim();
    }

    const correlationId = (envelopeOrRequest as { correlationId?: unknown }).correlationId;
    if (typeof correlationId === "string" && correlationId.trim().length > 0) {
        return correlationId.trim();
    }

    return undefined;
}

export async function requestPrivilegedActionFromEnvelope<TResult = unknown>(
    envelopeOrRequest: unknown,
    options?: PrivilegedActionPipelineOptions
): Promise<PrivilegedActionPipelineResult<TResult>> {
    const request = extractPrivilegedActionRequest(envelopeOrRequest);
    const response = await requestPrivilegedAction<TResult>(request, options);

    if (response.ok) {
        return { request, response };
    }

    const fallbackCorrelationId = options?.fallbackCorrelationId
        ?? resolveEnvelopeCorrelationId(envelopeOrRequest);
    const errorMessage = formatPrivilegedActionError(response, {
        context: options?.context,
        fallbackCorrelationId,
        includeStdoutWhenStderrMissing: options?.includeStdoutWhenStderrMissing,
        maxDetailLength: options?.maxDetailLength,
    });

    if (options?.throwOnError) {
        const error = new Error(errorMessage) as Error & { response?: PrivilegedActionResponse<TResult> };
        error.response = response;
        throw error;
    }

    return {
        request,
        response,
        errorMessage,
    };
}
