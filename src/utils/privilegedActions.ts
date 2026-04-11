import {
    ClipboardReadActionRequest,
    ClipboardWriteActionRequest,
    FilesystemMutateActionRequest,
    HostPrivilegedActionRequest,
    HostsWriteActionRequest,
    ProcessExecActionRequest,
    ScopedWorkflowRunActionRequest,
} from "../types";
import { validateHostPrivilegedActionRequest } from "./contracts";

const FILESYSTEM_SCOPE_CAPABILITY_PREFIX = "system.fs.scope.";
const PROCESS_SCOPE_CAPABILITY_PREFIX = "system.process.scope.";

function normalizeScopeId(scopeId: string): string {
    return scopeId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function createFilesystemScopeCapability(scopeId: string): `system.fs.scope.${string}` {
    const normalized = normalizeScopeId(scopeId);
    if (!normalized || !/[a-z0-9]/.test(normalized)) {
        throw new Error("Filesystem scope id must contain at least one alphanumeric character.");
    }
    return `${FILESYSTEM_SCOPE_CAPABILITY_PREFIX}${normalized}`;
}

export function createProcessScopeCapability(scopeId: string): `system.process.scope.${string}` {
    const normalized = normalizeScopeId(scopeId);
    if (!normalized || !/[a-z0-9]/.test(normalized)) {
        throw new Error("Process scope id must contain at least one alphanumeric character.");
    }
    return `${PROCESS_SCOPE_CAPABILITY_PREFIX}${normalized}`;
}

export function createHostsWriteActionRequest(request: HostsWriteActionRequest): HostsWriteActionRequest {
    return validateHostPrivilegedActionRequest(request) as HostsWriteActionRequest;
}

export function createClipboardReadActionRequest(request: ClipboardReadActionRequest): ClipboardReadActionRequest {
    return validateHostPrivilegedActionRequest(request) as ClipboardReadActionRequest;
}

export function createClipboardWriteActionRequest(request: ClipboardWriteActionRequest): ClipboardWriteActionRequest {
    return validateHostPrivilegedActionRequest(request) as ClipboardWriteActionRequest;
}

export function createFilesystemMutateActionRequest(
    request: FilesystemMutateActionRequest
): FilesystemMutateActionRequest {
    return validateHostPrivilegedActionRequest(request) as FilesystemMutateActionRequest;
}

export function createProcessExecActionRequest(
    request: ProcessExecActionRequest
): ProcessExecActionRequest {
    return validateHostPrivilegedActionRequest(request) as ProcessExecActionRequest;
}

export function createWorkflowRunActionRequest(
    request: ScopedWorkflowRunActionRequest
): ScopedWorkflowRunActionRequest {
    return validateHostPrivilegedActionRequest(request) as ScopedWorkflowRunActionRequest;
}

export function validatePrivilegedActionRequest(request: unknown): HostPrivilegedActionRequest {
    return validateHostPrivilegedActionRequest(request);
}
