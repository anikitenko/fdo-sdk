import { PluginMetadata } from "./PluginMetadata";
import { MESSAGE_TYPE } from "./enums";

export type SidePanelConfig = {
    icon: string;
    label: string;
    submenu_list: {
        id: string;
        name: string;
        message_type: string
    }[];
};

export type QuickAction = {
    name: string;
    message_type: string;
    subtitle?: string;
    icon?: string;
};

export type AddQuickAction = {

}

export type ErrorResponse = {
    error: string;
};

export type UIMessageRequest = {
    handler?: string;
    content?: unknown;
};

export type PluginInitRequest = {
    apiVersion?: string;
    capabilities?: PluginCapability[];
};

export type FilesystemScopeCapability = `system.fs.scope.${string}`;
export type ProcessScopeCapability = `system.process.scope.${string}`;
export type PluginCapability =
    | "storage.json"
    | "sudo.prompt"
    | "system.clipboard.read"
    | "system.clipboard.write"
    | "system.hosts.write"
    | "system.process.exec"
    | FilesystemScopeCapability
    | ProcessScopeCapability;

export type CapabilityConfiguration = {
    granted: PluginCapability[];
};

export type HostsRecord = {
    address: string;
    hostname: string;
    comment?: string;
};

export type FilesystemMutationOperation =
    | { type: "mkdir"; path: string; recursive?: boolean; mode?: number }
    | { type: "writeFile"; path: string; content: string; encoding?: "utf8" | "base64"; mode?: number }
    | { type: "appendFile"; path: string; content: string; encoding?: "utf8" | "base64" }
    | { type: "rename"; from: string; to: string }
    | { type: "remove"; path: string; recursive?: boolean; force?: boolean };

export type HostPrivilegedAction =
    | "system.clipboard.read"
    | "system.clipboard.write"
    | "system.hosts.write"
    | "system.fs.mutate"
    | "system.process.exec"
    | "system.workflow.run";

export type ClipboardReadActionRequest = {
    action: "system.clipboard.read";
    payload: {
        reason?: string;
    };
};

export type ClipboardWriteActionRequest = {
    action: "system.clipboard.write";
    payload: {
        text: string;
        reason?: string;
    };
};

export type HostsWriteActionRequest = {
    action: "system.hosts.write";
    payload: {
        records: HostsRecord[];
        dryRun?: boolean;
        tag?: string;
    };
};

export type FilesystemMutateActionRequest = {
    action: "system.fs.mutate";
    payload: {
        scope: string;
        operations: FilesystemMutationOperation[];
        dryRun?: boolean;
        reason?: string;
    };
};

export type ProcessExecActionRequest = {
    action: "system.process.exec";
    payload: {
        scope: string;
        command: string;
        args?: string[];
        cwd?: string;
        env?: Record<string, string>;
        timeoutMs?: number;
        input?: string;
        encoding?: "utf8" | "base64";
        dryRun?: boolean;
        reason?: string;
    };
};

export type ProcessExecActionPayloadInput = Omit<ProcessExecActionRequest["payload"], "scope">;

export type ScopedWorkflowKind = "process-sequence";
export type ScopedWorkflowStepPhase = "inspect" | "preview" | "mutate" | "apply" | "cleanup";
export type ScopedWorkflowStepErrorBehavior = "abort" | "continue";

export type ScopedWorkflowConfirmation = {
    message: string;
    requiredForStepIds?: string[];
};

export type ScopedWorkflowProcessStep = {
    id: string;
    title: string;
    phase?: ScopedWorkflowStepPhase;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    input?: string;
    encoding?: "utf8" | "base64";
    reason?: string;
    onError?: ScopedWorkflowStepErrorBehavior;
};

export type ScopedWorkflowRunActionRequest = {
    action: "system.workflow.run";
    payload: {
        scope: string;
        kind: ScopedWorkflowKind;
        title: string;
        summary?: string;
        dryRun?: boolean;
        steps: ScopedWorkflowProcessStep[];
        confirmation?: ScopedWorkflowConfirmation;
    };
};

export type ScopedWorkflowPayloadInput = Omit<ScopedWorkflowRunActionRequest["payload"], "scope">;

export type ScopedWorkflowSummary = {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    skippedSteps: number;
};

export type ScopedWorkflowProcessStepResultData = {
    command: string;
    args: string[];
    cwd?: string;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    durationMs?: number;
    dryRun?: boolean;
};

export type ScopedWorkflowStepResult = {
    stepId: string;
    title: string;
    status: "ok" | "error" | "skipped";
    correlationId?: string;
    result?: ScopedWorkflowProcessStepResultData;
    error?: string;
    code?: string;
};

export type ScopedWorkflowResult = {
    workflowId: string;
    scope: string;
    kind: ScopedWorkflowKind;
    status: "completed" | "partial" | "failed";
    summary: ScopedWorkflowSummary;
    steps: ScopedWorkflowStepResult[];
};

export type HostPrivilegedActionRequest =
    | ClipboardReadActionRequest
    | ClipboardWriteActionRequest
    | HostsWriteActionRequest
    | FilesystemMutateActionRequest
    | ProcessExecActionRequest
    | ScopedWorkflowRunActionRequest;

export type PrivilegedActionSuccessResponse<TResult = unknown> = {
    ok: true;
    correlationId: string;
    result?: TResult;
};

export type PrivilegedActionErrorResponse = {
    ok: false;
    correlationId: string;
    error: string;
    code?: string;
};

export type PrivilegedActionResponse<TResult = unknown> =
    | PrivilegedActionSuccessResponse<TResult>
    | PrivilegedActionErrorResponse;

export type PrivilegedActionBackendRequest<TRequest extends HostPrivilegedActionRequest = HostPrivilegedActionRequest> = {
    correlationId: string;
    request: TRequest;
};

export type RequestPrivilegedActionOptions = {
    correlationId?: string;
    handler?: string;
    correlationIdPrefix?: string;
};

export type OperatorToolPresetId =
    | "docker-cli"
    | "kubectl"
    | "helm"
    | "terraform"
    | "ansible"
    | "aws-cli"
    | "gcloud"
    | "azure-cli"
    | "podman"
    | "kustomize"
    | "gh"
    | "git"
    | "vault"
    | "nomad";

export type OperatorToolPresetDefinition = {
    id: OperatorToolPresetId;
    label: string;
    description: string;
    scopeId: string;
    capabilities: ["system.process.exec", ProcessScopeCapability];
    suggestedCommands: string[];
    typicalUseCases: string[];
};

export type CapabilityCategory =
    | "storage"
    | "sudo"
    | "clipboard"
    | "hosts"
    | "filesystem-scope"
    | "process"
    | "process-scope"
    | "unknown";

export type CapabilityDescriptor = {
    capability: string;
    label: string;
    description: string;
    category: CapabilityCategory;
};

export type MissingCapabilityDiagnostic = {
    capability: PluginCapability | string;
    action: string;
    category: CapabilityCategory;
    label: string;
    description: string;
    remediation: string;
};

export type UIMessageResponse = unknown | ErrorResponse;

export type PluginInitResponse = {
    quickActions: QuickAction[];
    sidePanelActions: SidePanelConfig | null;
    error?: string;
};

export type PluginRenderResponse = {
    render: string;
    onLoad: string;
    error?: string;
};

export type SerializedRenderPayload = {
    render: string;
    onLoad: string;
};

export type NullableSerializedRenderPayload = {
    render: string | undefined;
    onLoad: string | undefined;
};

export type HostResponseEnvelope<TResponse = unknown> = {
    type: MESSAGE_TYPE;
    response: TResponse;
};

export type StorageConfiguration = {
    rootDir?: string;
};

export type StoreFactoryContext = {
    pluginId: string;
    metadata?: PluginMetadata;
    storageRoot?: string;
};

export interface StoreType {
    get<T = unknown>(key: string): T | undefined
    set<T = unknown>(key: string, value: T): void
    remove(key: string): void
    clear(): void
    has(key: string): boolean
    keys(): string[]
}

export type PluginHandler<TInput = unknown, TOutput = unknown> = (data: TInput) => TOutput | Promise<TOutput>;

export type StoreFactory = (context: StoreFactoryContext) => StoreType;
export type StoreRegistration = StoreType | StoreFactory;

export type StoreCapabilities = {
    persistent?: boolean;
    supportsAsyncFlush?: boolean;
    supportsVersioning?: boolean;
    supportsMigrations?: boolean;
    supportsEncryption?: boolean;
    supportsCompression?: boolean;
};

export interface StoreLifecycle {
    init?: (context: StoreFactoryContext) => void | Promise<void>;
    flush?: () => Promise<void>;
    dispose?: () => void | Promise<void>;
    getVersion?: () => number | undefined;
    migrate?: (fromVersion: number, toVersion: number) => void | Promise<void>;
    capabilities?: StoreCapabilities;
}

export type StoreWithLifecycle = StoreType & StoreLifecycle;

export type PluginHealthStatus = "healthy" | "degraded";

export type PluginDiagnosticsRequest = {
    notificationsLimit?: number;
};

export type PluginDiagnosticNotification = {
    message: string;
    type: "error" | "warning" | "info";
    timestamp: string;
    details?: unknown;
};

export type PluginStoreDiagnostic = {
    name: string;
    capabilities?: StoreCapabilities;
    version?: number;
};

export type PluginDiagnostics = {
    apiVersion: string;
    pluginId: string;
    metadata: PluginMetadata | null;
    health: {
        status: PluginHealthStatus;
        startedAt: string;
        lastInitAt?: string;
        lastRenderAt?: string;
        lastHandlerAt?: string;
        lastErrorAt?: string;
        lastErrorMessage?: string;
        initCount: number;
        renderCount: number;
        handlerCount: number;
        errorCount: number;
    };
    capabilities: {
        diagnosticsHandler: string;
        registeredHandlers: string[];
        registeredStores: string[];
        quickActionsCount: number;
        hasSidePanel: boolean;
        stores: PluginStoreDiagnostic[];
        declaration: {
            declared: PluginCapability[];
            missing: PluginCapability[];
            undeclaredGranted: PluginCapability[];
        };
        permissions: {
            granted: PluginCapability[];
            usageCount: Record<string, number>;
            deniedCount: Record<string, number>;
        };
    };
    notifications: {
        count: number;
        capacity: number;
        recent: PluginDiagnosticNotification[];
    };
};
