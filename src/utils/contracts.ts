import { PluginMetadata } from "../PluginMetadata";
import { MESSAGE_TYPE } from "../enums";
import { BLUEPRINT_V6_ICON_NAMES, isBlueprintV6IconName } from "./blueprintIcons";
import {
    FilesystemMutateActionRequest,
    HostPrivilegedActionRequest,
    PluginCapability,
    ProcessExecActionRequest,
    ScopedWorkflowRunActionRequest,
} from "../types";

export interface HostMessageEnvelope {
    message: MESSAGE_TYPE;
    content?: unknown;
}

export interface UIMessagePayload {
    handler?: string;
    content?: unknown;
}

export interface PluginInitPayload {
    apiVersion?: string;
    capabilities?: PluginCapability[];
}

const KNOWN_PLUGIN_CAPABILITIES = new Set<PluginCapability>([
    "system.ai",
    "system.ai.assistants.list",
    "system.ai.request",
    "storage",
    "storage.json",
    "system.network",
    "system.network.https",
    "system.network.http",
    "system.network.websocket",
    "system.network.tcp",
    "system.network.udp",
    "system.network.dns",
    "sudo.prompt",
    "system.clipboard.read",
    "system.clipboard.write",
    "system.host.write",
    "system.hosts.write",
    "system.process.exec",
]);
const STORAGE_BACKEND_CAPABILITY_PREFIX = "storage.";
const HOST_PRIVILEGED_ACTION_SYSTEM_CLIPBOARD_READ = "system.clipboard.read";
const HOST_PRIVILEGED_ACTION_SYSTEM_CLIPBOARD_WRITE = "system.clipboard.write";
const HOST_PRIVILEGED_ACTION_SYSTEM_HOSTS_WRITE = "system.hosts.write";
const HOST_PRIVILEGED_ACTION_SYSTEM_FS_MUTATE = "system.fs.mutate";
const HOST_PRIVILEGED_ACTION_SYSTEM_PROCESS_EXEC = "system.process.exec";
const HOST_PRIVILEGED_ACTION_SYSTEM_WORKFLOW_RUN = "system.workflow.run";
const FS_SCOPE_CAPABILITY_PREFIX = "system.fs.scope.";
const PROCESS_SCOPE_CAPABILITY_PREFIX = "system.process.scope.";
const NETWORK_SCOPE_CAPABILITY_PREFIX = "system.network.scope.";
const WORKFLOW_KINDS = new Set(["process-sequence"]);
const WORKFLOW_STEP_PHASES = new Set(["inspect", "preview", "mutate", "apply", "cleanup"]);
const WORKFLOW_STEP_ERROR_BEHAVIORS = new Set(["abort", "continue"]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object";
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Plugin metadata field "${fieldName}" must be a non-empty string.`);
    }

    return value;
}

export function validatePluginMetadata(metadata: unknown): PluginMetadata {
    if (!isRecord(metadata)) {
        throw new Error("Plugin metadata must be an object.");
    }

    const candidate = metadata;

    return {
        id: candidate.id === undefined ? undefined : requireNonEmptyString(candidate.id, "id"),
        name: requireNonEmptyString(candidate.name, "name"),
        version: requireNonEmptyString(candidate.version, "version"),
        author: requireNonEmptyString(candidate.author, "author"),
        description: requireNonEmptyString(candidate.description, "description"),
        icon: validateBlueprintIconName(candidate.icon),
    };
}

function validateBlueprintIconName(value: unknown): string {
    const icon = requireNonEmptyString(value, "icon");

    if (!isBlueprintV6IconName(icon)) {
        const suggestions = getClosestBlueprintIconNames(icon);
        const suggestionSuffix = suggestions.length > 0
            ? ` Did you mean: ${suggestions.map((name) => `"${name}"`).join(", ")}?`
            : "";
        throw new Error(
            `Plugin metadata field "icon" must be a valid BlueprintJS v6 icon name. Received "${icon}".${suggestionSuffix}`
        );
    }

    return icon;
}

function getClosestBlueprintIconNames(input: string): string[] {
    const normalizedInput = input.toLowerCase();
    const rankedIcons = Array.from(BLUEPRINT_V6_ICON_NAMES)
        .map((iconName) => ({
            iconName,
            score: scoreBlueprintIconMatch(normalizedInput, iconName),
        }))
        .sort((left, right) => {
            if (left.score !== right.score) {
                return left.score - right.score;
            }
            return left.iconName.localeCompare(right.iconName);
        });

    return rankedIcons
        .filter((entry) => entry.score <= 5)
        .slice(0, 3)
        .map((entry) => entry.iconName);
}

function scoreBlueprintIconMatch(input: string, candidate: string): number {
    if (candidate === input) {
        return 0;
    }

    if (candidate.includes(input) || input.includes(candidate)) {
        return Math.abs(candidate.length - input.length);
    }

    return levenshteinDistance(input, candidate);
}

function levenshteinDistance(left: string, right: string): number {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

    for (let row = 0; row < rows; row += 1) {
        matrix[row][0] = row;
    }

    for (let col = 0; col < cols; col += 1) {
        matrix[0][col] = col;
    }

    for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
            const substitutionCost = left[row - 1] === right[col - 1] ? 0 : 1;
            matrix[row][col] = Math.min(
                matrix[row - 1][col] + 1,
                matrix[row][col - 1] + 1,
                matrix[row - 1][col - 1] + substitutionCost
            );
        }
    }

    return matrix[left.length][right.length];
}

export function validateSerializedRenderPayload(payload: unknown): { render: string; onLoad: string } {
    if (!isRecord(payload)) {
        throw new Error("Render payload must be an object.");
    }

    const candidate = payload;

    if (typeof candidate.render !== "string") {
        throw new Error('Render payload field "render" must be a string.');
    }

    if (typeof candidate.onLoad !== "string") {
        throw new Error('Render payload field "onLoad" must be a string.');
    }

    return {
        render: candidate.render,
        onLoad: candidate.onLoad,
    };
}

export function validateHostMessageEnvelope(message: unknown): HostMessageEnvelope {
    if (!isRecord(message)) {
        throw new Error("Host message must be an object.");
    }

    if (!Object.values(MESSAGE_TYPE).includes(message.message as MESSAGE_TYPE)) {
        throw new Error("Host message type is invalid.");
    }

    return {
        message: message.message as MESSAGE_TYPE,
        content: message.content,
    };
}

export function validateUIMessagePayload(payload: unknown): UIMessagePayload {
    if (payload === undefined) {
        return {};
    }

    if (!isRecord(payload)) {
        throw new Error("UI message payload must be an object.");
    }

    if (payload.handler !== undefined && typeof payload.handler !== "string") {
        throw new Error('UI message payload field "handler" must be a string when provided.');
    }

    return {
        handler: payload.handler as string | undefined,
        content: payload.content,
    };
}

export function validatePluginInitPayload(payload: unknown): PluginInitPayload {
    if (payload === undefined) {
        return {};
    }

    if (!isRecord(payload)) {
        throw new Error("Plugin init payload must be an object.");
    }

    if (payload.apiVersion !== undefined && typeof payload.apiVersion !== "string") {
        throw new Error('Plugin init payload field "apiVersion" must be a string when provided.');
    }

    if (payload.capabilities !== undefined) {
        if (!Array.isArray(payload.capabilities) || payload.capabilities.some((item) => typeof item !== "string")) {
            throw new Error('Plugin init payload field "capabilities" must be an array of strings when provided.');
        }
        for (const capability of payload.capabilities) {
            if (
                !KNOWN_PLUGIN_CAPABILITIES.has(capability as PluginCapability)
                && !(
                    capability.startsWith(STORAGE_BACKEND_CAPABILITY_PREFIX)
                    && isValidScopeId(capability.slice(STORAGE_BACKEND_CAPABILITY_PREFIX.length))
                )
                && !capability.startsWith(FS_SCOPE_CAPABILITY_PREFIX)
                && !capability.startsWith(PROCESS_SCOPE_CAPABILITY_PREFIX)
                && !(
                    capability.startsWith(NETWORK_SCOPE_CAPABILITY_PREFIX)
                    && isValidScopeId(capability.slice(NETWORK_SCOPE_CAPABILITY_PREFIX.length))
                )
            ) {
                throw new Error(`Plugin init payload capability "${capability}" is not supported by this SDK version.`);
            }
        }
    }

    return {
        apiVersion: payload.apiVersion as string | undefined,
        capabilities: payload.capabilities as PluginCapability[] | undefined,
    };
}

function isValidHostName(value: string): boolean {
    return /^[a-zA-Z0-9.-]+$/.test(value) && !value.startsWith(".") && !value.endsWith(".");
}

function isValidIpAddress(value: string): boolean {
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/;
    return ipv4.test(value) || ipv6.test(value);
}

function isAbsolutePath(value: string): boolean {
    return value.startsWith("/") || /^[a-zA-Z]:\\/.test(value);
}

function isValidScopeId(value: string): boolean {
    return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

function validateHostsWriteActionRequest(payload: Record<string, unknown>): HostPrivilegedActionRequest {
    if (!isRecord(payload.payload)) {
        throw new Error('Host privileged action "payload" must be an object.');
    }

    const candidatePayload = payload.payload as Record<string, unknown>;
    const { records, dryRun, tag } = candidatePayload;

    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Host privileged action payload field "records" must be a non-empty array.');
    }

    for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (!isRecord(record)) {
            throw new Error(`Host privileged action payload record at index ${index} must be an object.`);
        }
        if (typeof record.address !== "string" || !isValidIpAddress(record.address)) {
            throw new Error(`Host privileged action payload record at index ${index} has invalid "address".`);
        }
        if (typeof record.hostname !== "string" || !isValidHostName(record.hostname)) {
            throw new Error(`Host privileged action payload record at index ${index} has invalid "hostname".`);
        }
        if (record.comment !== undefined && typeof record.comment !== "string") {
            throw new Error(`Host privileged action payload record at index ${index} has invalid "comment".`);
        }
    }

    if (dryRun !== undefined && typeof dryRun !== "boolean") {
        throw new Error('Host privileged action payload field "dryRun" must be a boolean when provided.');
    }

    if (tag !== undefined && (typeof tag !== "string" || tag.trim().length === 0)) {
        throw new Error('Host privileged action payload field "tag" must be a non-empty string when provided.');
    }

    return payload as HostPrivilegedActionRequest;
}

function validateClipboardReadActionRequest(payload: Record<string, unknown>): HostPrivilegedActionRequest {
    if (!isRecord(payload.payload)) {
        throw new Error('Host privileged action "payload" must be an object.');
    }

    const candidatePayload = payload.payload as Record<string, unknown>;

    if (
        candidatePayload.reason !== undefined
        && (typeof candidatePayload.reason !== "string" || candidatePayload.reason.trim().length === 0)
    ) {
        throw new Error('Host privileged action payload field "reason" must be a non-empty string when provided.');
    }

    return payload as HostPrivilegedActionRequest;
}

function validateClipboardWriteActionRequest(payload: Record<string, unknown>): HostPrivilegedActionRequest {
    if (!isRecord(payload.payload)) {
        throw new Error('Host privileged action "payload" must be an object.');
    }

    const candidatePayload = payload.payload as Record<string, unknown>;

    if (typeof candidatePayload.text !== "string" || candidatePayload.text.length === 0) {
        throw new Error('Host privileged action payload field "text" must be a non-empty string.');
    }

    if (
        candidatePayload.reason !== undefined
        && (typeof candidatePayload.reason !== "string" || candidatePayload.reason.trim().length === 0)
    ) {
        throw new Error('Host privileged action payload field "reason" must be a non-empty string when provided.');
    }

    return payload as HostPrivilegedActionRequest;
}

function validateFilesystemMutateActionRequest(payload: Record<string, unknown>): FilesystemMutateActionRequest {
    if (!isRecord(payload.payload)) {
        throw new Error('Host privileged action "payload" must be an object.');
    }

    const candidatePayload = payload.payload as Record<string, unknown>;

    if (typeof candidatePayload.scope !== "string" || candidatePayload.scope.trim().length === 0) {
        throw new Error('Host privileged action payload field "scope" must be a non-empty string.');
    }
    if (!isValidScopeId(candidatePayload.scope)) {
        throw new Error('Host privileged action payload field "scope" must match /^[a-z0-9][a-z0-9._-]*$/.');
    }

    if (!Array.isArray(candidatePayload.operations) || candidatePayload.operations.length === 0) {
        throw new Error('Host privileged action payload field "operations" must be a non-empty array.');
    }

    for (let index = 0; index < candidatePayload.operations.length; index += 1) {
        const operation = candidatePayload.operations[index];
        if (!isRecord(operation) || typeof operation.type !== "string") {
            throw new Error(`Host privileged action operation at index ${index} is invalid.`);
        }

        switch (operation.type) {
            case "mkdir":
            case "remove": {
                if (typeof operation.path !== "string" || !isAbsolutePath(operation.path)) {
                    throw new Error(`Host privileged action operation at index ${index} has invalid "path".`);
                }
                break;
            }
            case "writeFile":
            case "appendFile": {
                if (typeof operation.path !== "string" || !isAbsolutePath(operation.path)) {
                    throw new Error(`Host privileged action operation at index ${index} has invalid "path".`);
                }
                if (typeof operation.content !== "string") {
                    throw new Error(`Host privileged action operation at index ${index} requires string "content".`);
                }
                if (
                    operation.encoding !== undefined
                    && operation.encoding !== "utf8"
                    && operation.encoding !== "base64"
                ) {
                    throw new Error(`Host privileged action operation at index ${index} has invalid "encoding".`);
                }
                break;
            }
            case "rename": {
                if (typeof operation.from !== "string" || !isAbsolutePath(operation.from)) {
                    throw new Error(`Host privileged action operation at index ${index} has invalid "from".`);
                }
                if (typeof operation.to !== "string" || !isAbsolutePath(operation.to)) {
                    throw new Error(`Host privileged action operation at index ${index} has invalid "to".`);
                }
                break;
            }
            default:
                throw new Error(`Host privileged action operation at index ${index} has unsupported type "${operation.type}".`);
        }
    }

    if (candidatePayload.dryRun !== undefined && typeof candidatePayload.dryRun !== "boolean") {
        throw new Error('Host privileged action payload field "dryRun" must be a boolean when provided.');
    }

    if (candidatePayload.reason !== undefined && (typeof candidatePayload.reason !== "string" || candidatePayload.reason.trim().length === 0)) {
        throw new Error('Host privileged action payload field "reason" must be a non-empty string when provided.');
    }

    return payload as FilesystemMutateActionRequest;
}

function validateProcessExecActionRequest(payload: Record<string, unknown>): ProcessExecActionRequest {
    if (!isRecord(payload.payload)) {
        throw new Error('Host privileged action "payload" must be an object.');
    }

    const candidatePayload = payload.payload as Record<string, unknown>;

    if (typeof candidatePayload.scope !== "string" || candidatePayload.scope.trim().length === 0) {
        throw new Error('Host privileged action payload field "scope" must be a non-empty string.');
    }
    if (!isValidScopeId(candidatePayload.scope)) {
        throw new Error('Host privileged action payload field "scope" must match /^[a-z0-9][a-z0-9._-]*$/.');
    }

    if (typeof candidatePayload.command !== "string" || candidatePayload.command.trim().length === 0) {
        throw new Error('Host privileged action payload field "command" must be a non-empty string.');
    }

    if (!isAbsolutePath(candidatePayload.command)) {
        throw new Error('Host privileged action payload field "command" must be an absolute path.');
    }

    if (candidatePayload.args !== undefined) {
        if (!Array.isArray(candidatePayload.args) || candidatePayload.args.some((arg) => typeof arg !== "string")) {
            throw new Error('Host privileged action payload field "args" must be an array of strings when provided.');
        }
    }

    if (candidatePayload.cwd !== undefined) {
        if (typeof candidatePayload.cwd !== "string" || !isAbsolutePath(candidatePayload.cwd)) {
            throw new Error('Host privileged action payload field "cwd" must be an absolute path when provided.');
        }
    }

    if (candidatePayload.env !== undefined) {
        if (!isRecord(candidatePayload.env)) {
            throw new Error('Host privileged action payload field "env" must be an object when provided.');
        }

        for (const [key, value] of Object.entries(candidatePayload.env)) {
            if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
                throw new Error(`Host privileged action payload field "env" has invalid key "${key}".`);
            }
            if (typeof value !== "string") {
                throw new Error(`Host privileged action payload field "env.${key}" must be a string.`);
            }
        }
    }

    if (candidatePayload.timeoutMs !== undefined) {
        if (
            typeof candidatePayload.timeoutMs !== "number"
            || !Number.isFinite(candidatePayload.timeoutMs)
            || candidatePayload.timeoutMs <= 0
        ) {
            throw new Error('Host privileged action payload field "timeoutMs" must be a positive number when provided.');
        }
    }

    if (candidatePayload.input !== undefined && typeof candidatePayload.input !== "string") {
        throw new Error('Host privileged action payload field "input" must be a string when provided.');
    }

    if (
        candidatePayload.encoding !== undefined
        && candidatePayload.encoding !== "utf8"
        && candidatePayload.encoding !== "base64"
    ) {
        throw new Error('Host privileged action payload field "encoding" must be "utf8" or "base64" when provided.');
    }

    if (candidatePayload.dryRun !== undefined && typeof candidatePayload.dryRun !== "boolean") {
        throw new Error('Host privileged action payload field "dryRun" must be a boolean when provided.');
    }

    if (
        candidatePayload.reason !== undefined
        && (typeof candidatePayload.reason !== "string" || candidatePayload.reason.trim().length === 0)
    ) {
        throw new Error('Host privileged action payload field "reason" must be a non-empty string when provided.');
    }

    return payload as ProcessExecActionRequest;
}

function validateWorkflowProcessStep(step: unknown, index: number): string {
    if (!isRecord(step)) {
        throw new Error(`Host privileged workflow step at index ${index} must be an object.`);
    }

    if (typeof step.id !== "string" || step.id.trim().length === 0) {
        throw new Error(`Host privileged workflow step at index ${index} must have a non-empty "id".`);
    }
    if (!isValidScopeId(step.id)) {
        throw new Error(`Host privileged workflow step at index ${index} field "id" must match /^[a-z0-9][a-z0-9._-]*$/.`);
    }

    if (typeof step.title !== "string" || step.title.trim().length === 0) {
        throw new Error(`Host privileged workflow step at index ${index} must have a non-empty "title".`);
    }

    if (step.phase !== undefined && (typeof step.phase !== "string" || !WORKFLOW_STEP_PHASES.has(step.phase))) {
        throw new Error(`Host privileged workflow step at index ${index} has invalid "phase".`);
    }

    if (typeof step.command !== "string" || step.command.trim().length === 0) {
        throw new Error(`Host privileged workflow step at index ${index} must have a non-empty "command".`);
    }

    if (!isAbsolutePath(step.command)) {
        throw new Error(`Host privileged workflow step at index ${index} field "command" must be an absolute path.`);
    }

    if (step.args !== undefined) {
        if (!Array.isArray(step.args) || step.args.some((arg) => typeof arg !== "string")) {
            throw new Error(`Host privileged workflow step at index ${index} field "args" must be an array of strings when provided.`);
        }
    }

    if (step.cwd !== undefined) {
        if (typeof step.cwd !== "string" || !isAbsolutePath(step.cwd)) {
            throw new Error(`Host privileged workflow step at index ${index} field "cwd" must be an absolute path when provided.`);
        }
    }

    if (step.env !== undefined) {
        if (!isRecord(step.env)) {
            throw new Error(`Host privileged workflow step at index ${index} field "env" must be an object when provided.`);
        }

        for (const [key, value] of Object.entries(step.env)) {
            if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
                throw new Error(`Host privileged workflow step at index ${index} field "env" has invalid key "${key}".`);
            }
            if (typeof value !== "string") {
                throw new Error(`Host privileged workflow step at index ${index} field "env.${key}" must be a string.`);
            }
        }
    }

    if (step.timeoutMs !== undefined) {
        if (typeof step.timeoutMs !== "number" || !Number.isFinite(step.timeoutMs) || step.timeoutMs <= 0) {
            throw new Error(`Host privileged workflow step at index ${index} field "timeoutMs" must be a positive number when provided.`);
        }
    }

    if (step.input !== undefined && typeof step.input !== "string") {
        throw new Error(`Host privileged workflow step at index ${index} field "input" must be a string when provided.`);
    }

    if (step.encoding !== undefined && step.encoding !== "utf8" && step.encoding !== "base64") {
        throw new Error(`Host privileged workflow step at index ${index} field "encoding" must be "utf8" or "base64" when provided.`);
    }

    if (step.reason !== undefined && (typeof step.reason !== "string" || step.reason.trim().length === 0)) {
        throw new Error(`Host privileged workflow step at index ${index} field "reason" must be a non-empty string when provided.`);
    }

    if (
        step.onError !== undefined
        && (typeof step.onError !== "string" || !WORKFLOW_STEP_ERROR_BEHAVIORS.has(step.onError))
    ) {
        throw new Error(`Host privileged workflow step at index ${index} has invalid "onError".`);
    }

    return step.id;
}

function validateScopedWorkflowRunActionRequest(payload: Record<string, unknown>): ScopedWorkflowRunActionRequest {
    if (!isRecord(payload.payload)) {
        throw new Error('Host privileged action "payload" must be an object.');
    }

    const candidatePayload = payload.payload as Record<string, unknown>;

    if (typeof candidatePayload.scope !== "string" || candidatePayload.scope.trim().length === 0) {
        throw new Error('Host privileged workflow payload field "scope" must be a non-empty string.');
    }
    if (!isValidScopeId(candidatePayload.scope)) {
        throw new Error('Host privileged workflow payload field "scope" must match /^[a-z0-9][a-z0-9._-]*$/.');
    }

    if (typeof candidatePayload.kind !== "string" || !WORKFLOW_KINDS.has(candidatePayload.kind)) {
        throw new Error('Host privileged workflow payload field "kind" must be "process-sequence".');
    }

    if (typeof candidatePayload.title !== "string" || candidatePayload.title.trim().length === 0) {
        throw new Error('Host privileged workflow payload field "title" must be a non-empty string.');
    }

    if (
        candidatePayload.summary !== undefined
        && (typeof candidatePayload.summary !== "string" || candidatePayload.summary.trim().length === 0)
    ) {
        throw new Error('Host privileged workflow payload field "summary" must be a non-empty string when provided.');
    }

    if (candidatePayload.dryRun !== undefined && typeof candidatePayload.dryRun !== "boolean") {
        throw new Error('Host privileged workflow payload field "dryRun" must be a boolean when provided.');
    }

    if (!Array.isArray(candidatePayload.steps) || candidatePayload.steps.length === 0) {
        throw new Error('Host privileged workflow payload field "steps" must be a non-empty array.');
    }

    const stepIds = candidatePayload.steps.map((step, index) => validateWorkflowProcessStep(step, index));
    const uniqueStepIds = new Set(stepIds);
    if (uniqueStepIds.size !== stepIds.length) {
        throw new Error('Host privileged workflow payload field "steps" must not contain duplicate step ids.');
    }

    if (candidatePayload.confirmation !== undefined) {
        if (!isRecord(candidatePayload.confirmation)) {
            throw new Error('Host privileged workflow payload field "confirmation" must be an object when provided.');
        }

        if (
            typeof candidatePayload.confirmation.message !== "string"
            || candidatePayload.confirmation.message.trim().length === 0
        ) {
            throw new Error('Host privileged workflow confirmation field "message" must be a non-empty string.');
        }

        if (candidatePayload.confirmation.requiredForStepIds !== undefined) {
            if (
                !Array.isArray(candidatePayload.confirmation.requiredForStepIds)
                || candidatePayload.confirmation.requiredForStepIds.some((value) => typeof value !== "string" || value.trim().length === 0)
            ) {
                throw new Error('Host privileged workflow confirmation field "requiredForStepIds" must be an array of non-empty strings when provided.');
            }

            for (const stepId of candidatePayload.confirmation.requiredForStepIds) {
                if (!uniqueStepIds.has(stepId)) {
                    throw new Error(`Host privileged workflow confirmation field "requiredForStepIds" references unknown step id "${stepId}".`);
                }
            }
        }
    }

    return payload as ScopedWorkflowRunActionRequest;
}

export function validateHostPrivilegedActionRequest(payload: unknown): HostPrivilegedActionRequest {
    if (!isRecord(payload)) {
        throw new Error("Host privileged action request must be an object.");
    }

    if (payload.action === HOST_PRIVILEGED_ACTION_SYSTEM_HOSTS_WRITE) {
        return validateHostsWriteActionRequest(payload);
    }

    if (payload.action === HOST_PRIVILEGED_ACTION_SYSTEM_CLIPBOARD_READ) {
        return validateClipboardReadActionRequest(payload);
    }

    if (payload.action === HOST_PRIVILEGED_ACTION_SYSTEM_CLIPBOARD_WRITE) {
        return validateClipboardWriteActionRequest(payload);
    }

    if (payload.action === HOST_PRIVILEGED_ACTION_SYSTEM_FS_MUTATE) {
        return validateFilesystemMutateActionRequest(payload);
    }

    if (payload.action === HOST_PRIVILEGED_ACTION_SYSTEM_PROCESS_EXEC) {
        return validateProcessExecActionRequest(payload);
    }

    if (payload.action === HOST_PRIVILEGED_ACTION_SYSTEM_WORKFLOW_RUN) {
        return validateScopedWorkflowRunActionRequest(payload);
    }

    throw new Error(
        `Host privileged action "action" must be "${HOST_PRIVILEGED_ACTION_SYSTEM_CLIPBOARD_READ}", "${HOST_PRIVILEGED_ACTION_SYSTEM_CLIPBOARD_WRITE}", "${HOST_PRIVILEGED_ACTION_SYSTEM_HOSTS_WRITE}", "${HOST_PRIVILEGED_ACTION_SYSTEM_FS_MUTATE}", "${HOST_PRIVILEGED_ACTION_SYSTEM_PROCESS_EXEC}", or "${HOST_PRIVILEGED_ACTION_SYSTEM_WORKFLOW_RUN}".`
    );
}
