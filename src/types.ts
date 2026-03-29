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
export type PluginCapability =
    | "storage.json"
    | "sudo.prompt"
    | "system.hosts.write"
    | FilesystemScopeCapability;

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
    | "system.hosts.write"
    | "system.fs.mutate";

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

export type HostPrivilegedActionRequest =
    | HostsWriteActionRequest
    | FilesystemMutateActionRequest;

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
