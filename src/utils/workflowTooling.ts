import {
    PrivilegedActionResponse,
    RequestPrivilegedActionOptions,
    ScopedWorkflowPayloadInput,
    ScopedWorkflowResult,
    ScopedWorkflowRunActionRequest,
} from "../types";
import { createWorkflowRunActionRequest } from "./privilegedActions";
import { requestPrivilegedAction } from "./privilegedTransport";

export function createScopedWorkflowRequest(
    scopeId: string,
    payload: ScopedWorkflowPayloadInput
): ScopedWorkflowRunActionRequest {
    return createWorkflowRunActionRequest({
        action: "system.workflow.run",
        payload: {
            scope: scopeId,
            ...payload,
        },
    });
}

export function requestScopedWorkflow(
    scopeId: string,
    payload: ScopedWorkflowPayloadInput,
    options?: RequestPrivilegedActionOptions
): Promise<PrivilegedActionResponse<ScopedWorkflowResult>> {
    return requestPrivilegedAction<ScopedWorkflowResult>(
        createScopedWorkflowRequest(scopeId, payload),
        {
            correlationIdPrefix: `${scopeId}-workflow`,
            ...options,
        }
    );
}
