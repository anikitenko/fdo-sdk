import {applyDecoratedRegistrations} from "./decorators/Registration";
import {configureSharedLogic, dispatchSharedLogic, cancelSharedLogicInvocation, SharedLogicConfiguration, SharedLogicInvocation} from "./SharedLogic";
import path from "path";
import { configureHostServices } from "./utils/hostServices";
import { FDO_SDK } from "./index";
import { PluginMetadata } from "./PluginMetadata";
import {
    PluginDiagnostics,
    PluginDiagnosticsRequest,
    NullableSerializedRenderPayload,
    PluginHandler,
    QuickAction,
    SerializedRenderPayload,
    SidePanelConfig,
    CapabilityConfiguration,
    StorageConfiguration,
    HostServicesConfiguration,
    StoreFactory,
    StoreFactoryContext,
    StoreRegistration,
    StoreWithLifecycle
} from "./types";
import { Logger } from "./Logger";
import { createDefaultStore } from "./StoreDefault";
import { createJsonStore, getJsonStorageDiagnostics } from "./StoreJson";
import { validatePluginMetadata, validateSerializedRenderPayload } from "./utils/contracts";
import { NotificationManager } from "./utils/NotificationManager";
import {
    configureCapabilities,
    createCapabilityBundle,
    getCapabilityDiagnostics,
    requireStorageBackendCapability,
    runCapabilityPreflight
} from "./utils/capabilities";
import { emitDeprecationWarning } from "./utils/deprecation";
import { getSdkHandshake } from "./utils/handshake";

type PluginWithMetadata = FDO_SDK & { metadata: PluginMetadata };
type PluginWithQuickActions = FDO_SDK & { defineQuickActions: () => QuickAction[] };
type PluginWithSidePanel = FDO_SDK & { defineSidePanel: () => SidePanelConfig };
type PluginWithDeclaredCapabilities = FDO_SDK & { declareCapabilities: () => CapabilityConfiguration["granted"] };

export class PluginRegistry {
    public static readonly DIAGNOSTICS_HANDLER = "__sdk.getDiagnostics";
    private static _logger: Logger = new Logger({ context: { component: "PluginRegistry" } })
    private static pluginInstance: FDO_SDK | null = null;
    private static pluginMetadata: PluginMetadata | null = null;
    private static storageConfiguration: StorageConfiguration = {};
    private static shutdownPromise?: Promise<void>;
    private static diagnosticsState = this.createDiagnosticsState();
    private static readonly handlers: Record<string, PluginHandler> = {};
    private static readonly storeFactories: Record<string, StoreFactory> = {
        default: () => createDefaultStore(),
        json: (context) => {
            if (!context.storageRoot) {
                throw new Error(
                    "JSON store requires a configured storage root. Set PluginRegistry.configureStorage({ rootDir }) or FDO_SDK_STORAGE_ROOT."
                );
            }

            return createJsonStore({
                filePath: path.join(context.storageRoot, context.pluginId, "store.json"),
            });
        },
    };
    private static readonly storeInstances: Record<string, Record<string, StoreWithLifecycle>> = {};

    /** Host bootstrap only; bind this transport to the worker's authenticated plugin identity. */
    /** Host-only, authenticated shared-service transport and private dispatch hooks. */
    public static configureSharedLogic(configuration: SharedLogicConfiguration | null): void { configureSharedLogic(configuration); }
    public static dispatchSharedLogic(invocation: SharedLogicInvocation) { return dispatchSharedLogic(invocation); }
    public static cancelSharedLogicInvocation(callId: string): void { cancelSharedLogicInvocation(callId); }

    public static configureHostServices(configuration: HostServicesConfiguration | null): void {
        configureHostServices(configuration);
    }

    public static configureStorage(configuration: StorageConfiguration): void {
        this.storageConfiguration = {
            ...this.storageConfiguration,
            ...configuration,
        };
    }

    public static configureCapabilities(configuration: CapabilityConfiguration): void {
        configureCapabilities(configuration);
    }

    public static configureCapabilityPolicy(configuration: CapabilityConfiguration): void {
        emitDeprecationWarning(
            {
                id: "PluginRegistry.configureCapabilityPolicy",
                message: "PluginRegistry.configureCapabilityPolicy(...) is deprecated.",
                replacement: "PluginRegistry.configureCapabilities(...)",
                removeIn: "2.0.0",
            },
            (message) => this._logger.warn(message)
        );
        this.configureCapabilities(configuration);
    }

    public static registerPlugin(plugin: FDO_SDK): void {
        const metadata = this.tryResolvePluginMetadata(plugin, { allowDeferred: true });
        this.pluginMetadata = metadata;
        this.pluginInstance = plugin;
        this.shutdownPromise = undefined;
        this.diagnosticsState = this.createDiagnosticsState();
        const pluginScope = this.getPluginStorageScope(metadata);
        this._logger = this._logger.withContext({ component: "PluginRegistry", pluginId: pluginScope });
        this._logger.event("plugin.registered", {
            pluginScope,
            pluginName: metadata?.name,
            pluginVersion: metadata?.version,
        });
    }

    public static registerHandler(name: string, handler: PluginHandler) {
        this.handlers[name] = handler;
    }

    public static useStore(name: string = "default") : StoreWithLifecycle {
        if (this.shutdownPromise) {
            throw new Error("Cannot acquire stores while the plugin is shutting down or shut down.");
        }
        const storeName = this.storeFactories[name] ? name : "default";

        if (!this.storeFactories[name]) {
            this._logger.warn(`Store '${name}' is not registered. Using default store...`);
        }

        const context = this.getStoreContext();

        if (storeName === "json") {
            requireStorageBackendCapability("json", "use the JSON persistent store");
        }

        if (!this.storeInstances[context.pluginId]) {
            this.storeInstances[context.pluginId] = {};
        }

        if (!this.storeInstances[context.pluginId][storeName]) {
            const store = this.storeFactories[storeName](context) as StoreWithLifecycle;
            void Promise.resolve(store.init?.(context)).catch((error) => {
                this._logger.warn(`Store '${storeName}' init failed for scope '${context.pluginId}'.`, error);
            });
            this.storeInstances[context.pluginId][storeName] = store;
        }

        return this.storeInstances[context.pluginId][storeName];
    }

    public static registerStore(name: string, storeRegistration: StoreRegistration) {
        if (this.storeFactories[name]) {
            this._logger.warn(`Store '${name}' is already registered. Skipping...`);
            return
        }

        this.storeFactories[name] = typeof storeRegistration === "function"
            ? storeRegistration as StoreFactory
            : () => storeRegistration;
    }

    public static getQuickActions(): QuickAction[] {
        if (this.pluginInstance && this.hasQuickActions(this.pluginInstance)) {
            return this.pluginInstance.defineQuickActions();
        }
        return [];
    }

    public static getSidePanelConfig(): SidePanelConfig | null {
        if (this.pluginInstance && this.hasSidePanel(this.pluginInstance)) {
            return this.pluginInstance.defineSidePanel();
        }
        return null;
    }

    public static callInit(): void {
        this.refreshLoggerContext();
        this._logger.event("plugin.init.start");
        try {
            this.logDeclaredCapabilityPreflight();
            if (this.pluginInstance) {
                applyDecoratedRegistrations(this.pluginInstance, (name, method) => this.registerHandler(name, method));
            }
            const result: unknown = this.pluginInstance?.init();
            this.assertSynchronousInit(result);
            this.refreshLoggerContext();
            this.diagnosticsState.initCount += 1;
            this.diagnosticsState.lastInitAt = new Date().toISOString();
            this._logger.event("plugin.init.success");
        } catch (error) {
            this.recordError(error, "plugin.init.error");
            throw error;
        }
    }

    private static assertSynchronousInit(result: unknown): void {
        if (!result || typeof (result as PromiseLike<unknown>).then !== 'function') return;
        void Promise.resolve(result).catch(error => {
            try { this.recordError(error, "plugin.init.async-rejected"); } catch {}
        });
        throw new Error("Plugin init() must be synchronous; asynchronous initialization is not supported.");
    }

    public static assertHostApiCompatibility(hostApiVersion?: string): void {
        if (hostApiVersion === undefined) {
            return;
        }

        const hostMajor = this.parseApiMajor(hostApiVersion, "Host");
        const sdkMajor = this.parseApiMajor(FDO_SDK.API_VERSION, "SDK");

        if (hostMajor !== sdkMajor) {
            throw new Error(
                `Incompatible plugin API major version. Host requested "${hostApiVersion}", plugin SDK provides "${FDO_SDK.API_VERSION}".`
            );
        }
    }

    public static callRenderer(): SerializedRenderPayload | NullableSerializedRenderPayload {
        if (!this.pluginInstance) {
            return {
                render: undefined,
                onLoad: undefined,
            };
        }

        try {
            this.refreshLoggerContext();
            const payload = validateSerializedRenderPayload({
                render: this.pluginInstance?.serializeRender(),
                onLoad: this.pluginInstance?.serializeRenderOnLoad()
            });
            this.diagnosticsState.renderCount += 1;
            this.diagnosticsState.lastRenderAt = new Date().toISOString();
            this._logger.event("plugin.render.success");
            return payload;
        } catch (error) {
            this.recordError(error, "plugin.render.error");
            throw error;
        }
    }

    public static async callHandler(name: string, data: unknown): Promise<unknown> {
        const handler = PluginRegistry.handlers[name];

        if (handler) {
            try {
                this.refreshLoggerContext();
                this._logger.event("plugin.handler.start", { handler: name });
                const result = await handler(data);
                this.diagnosticsState.handlerCount += 1;
                this.diagnosticsState.lastHandlerAt = new Date().toISOString();
                return result;
            } catch (err) {
                this._logger.error(new Error(`Handler '${name}' threw an error: ${err}`));
                this._logger.event("plugin.handler.error", { handler: name });
                this.recordError(err, "plugin.handler.error");
                return null;
            }
        } else {
            this._logger.warn(`Handler '${name}' is not registered.`);
            this._logger.event("plugin.handler.missing", { handler: name });
            return null;
        }
    }

    public static getDiagnostics(request: PluginDiagnosticsRequest = {}): PluginDiagnostics {
        const metadata = this.pluginMetadata ?? this.getValidatedPluginMetadata();
        const pluginId = this.getPluginStorageScope(metadata);
        const scopedStores = this.storeInstances[pluginId] ?? {};
        const notifications = NotificationManager.getInstance().getNotifications();
        const notificationsLimit = Math.max(0, request.notificationsLimit ?? 20);
        const recentNotifications = notifications.slice(-notificationsLimit).map((notification) => ({
            message: notification.message,
            type: notification.type,
            timestamp: notification.timestamp.toISOString(),
            details: notification.details,
        }));
        const quickActionsCount = this.getQuickActions().length;
        const sidePanelConfig = this.getSidePanelConfig();
        const permissions = getCapabilityDiagnostics();
        const declaredCapabilities = this.getDeclaredCapabilities();
        const capabilityPreflight = runCapabilityPreflight({
            declared: declaredCapabilities,
            granted: permissions.granted,
            action: "satisfy plugin declared capability contract",
        });
        const missingDeclared = capabilityPreflight.missing.map((entry) => entry.capability as any).filter((entry): entry is typeof declaredCapabilities[number] => typeof entry === "string");
        const undeclaredGranted = capabilityPreflight.undeclaredGranted.map((entry) => entry.capability as any).filter((entry): entry is typeof permissions.granted[number] => typeof entry === "string");

        return {
            apiVersion: FDO_SDK.API_VERSION,
            pluginId,
            metadata,
            handshake: getSdkHandshake(),
            resources: {
                sampledAt: new Date().toISOString(),
                process: {
                    pid: process.pid,
                    uptimeSeconds: process.uptime(),
                    rssBytes: process.memoryUsage().rss,
                    heapUsedBytes: process.memoryUsage().heapUsed,
                },
                logging: Logger.getDiagnostics(),
                storage: getJsonStorageDiagnostics(),
            },
            health: {
                status: this.diagnosticsState.errorCount > 0 ? "degraded" : "healthy",
                startedAt: this.diagnosticsState.startedAt,
                lastInitAt: this.diagnosticsState.lastInitAt,
                lastRenderAt: this.diagnosticsState.lastRenderAt,
                lastHandlerAt: this.diagnosticsState.lastHandlerAt,
                lastErrorAt: this.diagnosticsState.lastErrorAt,
                lastErrorMessage: this.diagnosticsState.lastErrorMessage,
                initCount: this.diagnosticsState.initCount,
                renderCount: this.diagnosticsState.renderCount,
                handlerCount: this.diagnosticsState.handlerCount,
                errorCount: this.diagnosticsState.errorCount,
            },
            capabilities: {
                diagnosticsHandler: this.DIAGNOSTICS_HANDLER,
                registeredHandlers: Object.keys(this.handlers).sort((left, right) => left.localeCompare(right)),
                registeredStores: Object.keys(this.storeFactories).sort((left, right) => left.localeCompare(right)),
                quickActionsCount,
                hasSidePanel: Boolean(sidePanelConfig),
                stores: Object.entries(scopedStores).map(([name, store]) => ({
                    name,
                    capabilities: store.capabilities,
                    version: store.getVersion?.(),
                })),
                declaration: {
                    declared: declaredCapabilities,
                    missing: missingDeclared,
                    undeclaredGranted,
                },
                permissions,
            },
            notifications: {
                count: NotificationManager.getInstance().count,
                capacity: NotificationManager.getInstance().capacity,
                recent: recentNotifications,
            },
        };
    }

    /** Host lifecycle hook. Stops new work, releases plugin resources and drains stores. */
    public static shutdown(timeoutMs = 4500): Promise<void> {
        if (this.shutdownPromise) return this.shutdownPromise;
        const plugin = this.pluginInstance;
        const scope = this.getPluginScopeForLogging(plugin);
        const stores = this.storeInstances[scope] ?? {};
        let resolve!: () => void;
        let reject!: (error: Error) => void;
        this.shutdownPromise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
        const operations: Promise<unknown>[] = [];
        for (const store of Object.values(stores)) {
            try { store.beginShutdown?.(); } catch (error) { operations.push(Promise.reject(error)); }
        }
        this.clearAllHandlers();
        // Stop accepting IPC and abort cooperative work before the first await.
        try { operations.push(Promise.resolve(plugin?.dispose())); }
        catch (error) { operations.push(Promise.reject(error)); }
        operations.push(...Object.values(stores).map(async store => {
            try { await store.flush?.(); } finally { await store.dispose?.(); }
        }));
        const budget = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(timeoutMs, 30000)) : 4500;
        const timer = setTimeout(() => reject(new Error("Plugin shutdown deadline exceeded.")), budget);
        void Promise.allSettled(operations).then(results => {
            clearTimeout(timer);
            if (this.storeInstances[scope] === stores) delete this.storeInstances[scope];
            if (this.pluginInstance === plugin) {
                this.pluginInstance = null;
                this.pluginMetadata = null;
                configureHostServices(null);
                configureSharedLogic(null);
            }
            if (results.some(result => result.status === 'rejected')) reject(new Error("Plugin shutdown failed."));
            else resolve();
        });
        return this.shutdownPromise;
    }

    public static clearPlugin(): Promise<void> {
        const disposal = this.shutdown();
        configureHostServices(null);
        configureSharedLogic(null);
        this.pluginInstance = null;
        this.pluginMetadata = null;
        this.diagnosticsState = this.createDiagnosticsState();
        // shutdown retains the scoped stores until its drain finishes.
        return disposal;
    }

    public static clearHandler(name: string): void {
        if (this.handlers[name]) {
            delete this.handlers[name];
        }
    }

    public static clearAllHandlers(): void {
        for (const name in this.handlers) {
            delete this.handlers[name];
        }
    }

    public static async clearAllStoreInstances(): Promise<void> {
        await Promise.all(Object.keys(this.storeInstances).map(scope => this.disposeStoreScope(scope)));
    }

    private static async disposeStoreScope(scopeName: string): Promise<void> {
        const scopedStores = this.storeInstances[scopeName];
        if (!scopedStores) {
            return;
        }
        delete this.storeInstances[scopeName];

        const disposePromises = Object.entries(scopedStores).map(async ([storeName, store]) => {
            try {
                store.beginShutdown?.();
                try { await store.flush?.(); }
                finally { await store.dispose?.(); }
            } catch (error) {
                this._logger.warn(`Store '${storeName}' dispose failed for scope '${scopeName}'.`, error);
            }
        });

        await Promise.all(disposePromises);
    }

    private static getStoreContext(): StoreFactoryContext {
        const metadata = this.pluginMetadata ?? this.getValidatedPluginMetadata();
        return {
            pluginId: this.getPluginStorageScope(metadata),
            metadata: metadata ?? undefined,
            storageRoot: this.resolveStorageRoot(),
        };
    }

    private static getValidatedPluginMetadata(): PluginMetadata | null {
        if (!this.pluginInstance || !this.hasMetadata(this.pluginInstance)) {
            return null;
        }

        const metadata = validatePluginMetadata(this.pluginInstance.metadata);
        this.pluginMetadata = metadata;
        return metadata;
    }

    public static getPluginScopeForLogging(plugin?: FDO_SDK | null): string {
        const metadata = plugin
            ? this.tryResolvePluginMetadata(plugin, { allowDeferred: true })
            : (this.pluginMetadata ?? this.tryResolvePluginMetadata(this.pluginInstance, { allowDeferred: true }));
        return this.getPluginStorageScope(metadata);
    }

    private static getPluginStorageScope(metadata: PluginMetadata | null): string {
        if (!metadata) {
            return "anonymous-plugin";
        }

        const explicitId = metadata.id?.trim();
        if (explicitId) {
            return this.slugify(explicitId);
        }

        return [metadata.author, metadata.name]
            .map((part) => this.slugify(part))
            .filter(Boolean)
            .join("__");
    }

    private static resolveStorageRoot(): string | undefined {
        return this.storageConfiguration.rootDir ?? process.env.FDO_SDK_STORAGE_ROOT;
    }

    private static parseApiMajor(version: string, source: "Host" | "SDK"): number {
        const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
        if (!match) {
            throw new Error(`${source} API version "${version}" must follow semantic version format "major.minor.patch".`);
        }

        return Number.parseInt(match[1], 10);
    }

    private static slugify(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "plugin";
    }

    private static createDiagnosticsState(): {
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
    } {
        return {
            startedAt: new Date().toISOString(),
            initCount: 0,
            renderCount: 0,
            handlerCount: 0,
            errorCount: 0,
        };
    }

    private static recordError(error: unknown, eventName: string): void {
        this.diagnosticsState.errorCount += 1;
        this.diagnosticsState.lastErrorAt = new Date().toISOString();
        this.diagnosticsState.lastErrorMessage = error instanceof Error ? error.message : String(error);
        this._logger.event(eventName, { error: this.diagnosticsState.lastErrorMessage });
    }

    private static hasMetadata(plugin: FDO_SDK): plugin is PluginWithMetadata {
        return "metadata" in plugin;
    }

    private static refreshLoggerContext(): void {
        const pluginScope = this.getPluginScopeForLogging(this.pluginInstance);
        this._logger = this._logger.withContext({
            component: "PluginRegistry",
            pluginId: pluginScope,
        });
    }

    private static tryResolvePluginMetadata(
        plugin?: FDO_SDK | null,
        options: { allowDeferred?: boolean } = {}
    ): PluginMetadata | null {
        if (!plugin || !this.hasMetadata(plugin)) {
            return null;
        }

        const rawMetadata = plugin.metadata;
        if ((rawMetadata === undefined || rawMetadata === null) && options.allowDeferred) {
            return null;
        }

        try {
            return validatePluginMetadata(rawMetadata);
        } catch (error) {
            if (options.allowDeferred && (rawMetadata === undefined || rawMetadata === null)) {
                return null;
            }
            throw error;
        }
    }

    private static hasQuickActions(plugin: FDO_SDK): plugin is PluginWithQuickActions {
        return "defineQuickActions" in plugin;
    }

    private static hasSidePanel(plugin: FDO_SDK): plugin is PluginWithSidePanel {
        return "defineSidePanel" in plugin;
    }

    private static hasDeclaredCapabilities(plugin: FDO_SDK): plugin is PluginWithDeclaredCapabilities {
        return "declareCapabilities" in plugin && typeof (plugin as PluginWithDeclaredCapabilities).declareCapabilities === "function";
    }

    private static getDeclaredCapabilities(): CapabilityConfiguration["granted"] {
        if (!this.pluginInstance || !this.hasDeclaredCapabilities(this.pluginInstance)) {
            return [];
        }

        const declared = this.pluginInstance.declareCapabilities();
        if (!Array.isArray(declared) || declared.some((capability) => typeof capability !== "string")) {
            throw new Error("Plugin declareCapabilities() must return an array of capability strings.");
        }

        return createCapabilityBundle([...declared]);
    }

    private static logDeclaredCapabilityPreflight(): void {
        const declaredCapabilities = this.getDeclaredCapabilities();
        if (declaredCapabilities.length === 0) {
            return;
        }

        const preflight = runCapabilityPreflight({
            declared: declaredCapabilities,
            action: "initialize plugin runtime",
        });

        this._logger.event("plugin.capabilities.declared", {
            declaredCapabilities,
            grantedCapabilities: preflight.granted,
            missingCapabilities: preflight.missing.map((entry) => entry.capability),
            remediations: preflight.remediations,
        });

        if (preflight.missing.length > 0) {
            this._logger.warn(
                `Plugin declared capabilities that are not currently granted: ${preflight.missing.map((entry) => entry.capability).join(", ")}.`
            );
            for (const remediation of preflight.remediations) {
                this._logger.warn(`Capability preflight remediation: ${remediation}`);
            }
        } else {
            this._logger.info("Plugin capability preflight passed for declared capabilities.", {
                declaredCapabilities,
                grantedCapabilities: preflight.granted,
            });
        }
    }
}

export default PluginRegistry;
