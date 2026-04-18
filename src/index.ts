import {Logger} from "./Logger";
import "./ambient/fdo-host";
import {Communicator} from "./Communicator";
import {PluginRegistry} from "./PluginRegistry";
import type { RenderOnLoadOutput } from "./types";
import { createNoopRenderOnLoadSource, resolveRenderOnLoadSource } from "./utils/renderOnLoad";
import { SDK_API_VERSION } from "./version";

export { atomicWriteFile, atomicWriteFileSync } from "./utils/atomic";
export { BLUEPRINT_V6_ICON_NAMES, isBlueprintV6IconName } from "./utils/blueprintIcons";
export {
    validateHostMessageEnvelope,
    validateHostPrivilegedActionRequest,
    validatePluginInitPayload,
    validatePluginMetadata,
    validateSerializedRenderPayload,
    validateUIMessagePayload,
} from "./utils/contracts";
export { pify } from "./utils/pify";
export { runWithSudo } from "./utils/runWithSudo";
export { emitDeprecationWarning, formatDeprecationMessage } from "./utils/deprecation";
export {
    createAICapabilityBundle,
    createCapabilityBundle,
    createFilesystemCapabilityBundle,
    createNetworkCapabilityBundle,
    createNetworkScopeCapability,
    createProcessCapabilityBundle,
    createStorageCapabilityBundle,
    createWorkflowCapabilityBundle,
    describeCapability,
    runCapabilityPreflight,
    parseMissingCapabilityError,
    requireCapability,
    requireFilesystemScopeCapability,
    requireNetworkScopeCapability,
    requireProcessScopeCapability,
    requireStorageBackendCapability,
    requireWorkflowProcessCapabilities,
} from "./utils/capabilities";
export {
    createAICapabilityPreset,
    getAICapabilityPreset,
    listAICapabilityPresets,
} from "./utils/aiTooling";
export {
    createClipboardReadActionRequest,
    createClipboardWriteActionRequest,
    createFilesystemMutateActionRequest,
    createFilesystemScopeCapability,
    createHostsWriteActionRequest,
    createProcessExecActionRequest,
    createProcessScopeCapability,
    createWorkflowRunActionRequest,
    validatePrivilegedActionRequest,
} from "./utils/privilegedActions";
export {
    createClipboardReadRequest,
    createClipboardWriteRequest,
    requestClipboardRead,
    requestClipboardWrite,
} from "./utils/clipboardTooling";
export {
    createPrivilegedActionCorrelationId,
    formatPrivilegedActionError,
    getInlinePrivilegedActionErrorFormatterSource,
    isPrivilegedActionErrorResponse,
    isPrivilegedActionSuccessResponse,
    unwrapPrivilegedActionResponse,
} from "./utils/privilegedResponses";
export {
    createPrivilegedActionBackendRequest,
    extractPrivilegedActionRequest,
    requestPrivilegedActionFromEnvelope,
    requestPrivilegedAction,
} from "./utils/privilegedTransport";
export {
    createOperatorToolActionRequest,
    createOperatorToolCapabilityPreset,
    createScopedProcessExecActionRequest,
    getOperatorToolPreset,
    listOperatorToolPresets,
    requestOperatorTool,
    requestScopedProcessExec,
} from "./utils/operatorTooling";
export {
    createStorageCapabilityPreset,
    getStorageCapabilityPreset,
    listStorageCapabilityPresets,
} from "./utils/storageTooling";
export {
    createScopedWorkflowRequest,
    requestScopedWorkflow,
} from "./utils/workflowTooling";
export {
    createWorkflowFailureDiagnostic,
    getFailedWorkflowSteps,
    summarizeWorkflowResult,
} from "./utils/workflowDiagnostics";
export { createPluginDoctorPanelModel, createPluginDoctorReport } from "./utils/pluginDoctor";
export {
    evaluateSdkHandshakeCompatibility,
    getSdkFeatureFlags,
    getSdkHandshake,
    isSdkHandshakeCompatible,
} from "./utils/handshake";
export {
    getFixtureRuntimeMatrix,
    getFixtureRuntimeMatrixCase,
    listFixtureRuntimeMatrixCases,
} from "./utils/fixtureRuntimeMatrix";
export {
    formatDiagnosticExactFix,
    getDiagnosticFixTemplate,
    listDiagnosticFixTemplates,
} from "./utils/diagnosticTemplates";
export { applySdkMigrationCodemod } from "./utils/migrationCodemod";
export {
    createNoopRenderOnLoadSource,
    createRenderOnLoadActionsSource,
    defineRenderOnLoad,
    defineRenderOnLoadActions,
    getRenderOnLoadTemplate,
    listRenderOnLoadTemplates,
    getRenderOnLoadMonacoHints,
    getRenderOnLoadMonacoTypeDefinitions,
    isRenderOnLoadModule,
    resolveRenderOnLoadSource,
} from "./utils/renderOnLoad";
export {
    getEditorSupportBundle,
    getEditorSupportMonacoPolicy,
    getEditorSupportPackageJson,
    getEditorSupportPackageManifest,
    SDK_EDITOR_INDEX_TYPES_VIRTUAL_PATH,
    SDK_EDITOR_MODULE_ID,
    SDK_EDITOR_PACKAGE_JSON_VIRTUAL_PATH,
} from "./utils/editorSupport";

export * from "./FDOInterface";
export * from "./PluginMetadata";
export * from "./QuickActionMixin";
export * from "./SidePanelMixin";
export * from "./PluginRegistry"
export * from "./types";
export * from "./DOM";
export * from "./DOMButton";
export * from "./DOMInput";
export * from "./DOMLink";
export * from "./DOMNested";
export * from "./DOMText";
export * from "./DOMMisc";
export * from "./DOMTable";
export * from "./DOMMedia";
export * from "./DOMSemantic";
export * from "./decorators/ErrorHandler";

export class FDO_SDK {
    public static readonly API_VERSION: string = SDK_API_VERSION
    static readonly TYPE_TAG = Symbol("FDO_SDK")
    private _logger: Logger = new Logger({ context: { component: "FDO_SDK" } })
    private loggerScope: string = "global";
    private readonly communicator: Communicator = new Communicator()

    constructor() {
        PluginRegistry.registerPlugin(this)
        this.communicator.emit("init", {})
        this.getLogger().log("FDO_SDK initialized!")
    }

    public init(): void {
        const error = new Error("Method 'init' must be implemented by plugin.")
        this.getLogger().error(error)
        throw error
    }

    public render(): string {
        const error = new Error("Method 'render' must be implemented by plugin.")
        this.getLogger().error(error)
        throw error
    }

    public renderOnLoad(): RenderOnLoadOutput {
        return createNoopRenderOnLoadSource();
    }

    /**
     * Serializes the plugin render output for transport to the FDO host.
     * Plugin implementations should override `render()`, not this method.
     */
    public serializeRender(): string {
        const renderOutput = this.render() as unknown;
        if (this.isThenable(renderOutput)) {
            void renderOutput.catch((error: unknown) => this.logAsyncLifecycleError("render", error));
            throw new Error("Method 'render' must return a synchronous string. Async render promises are not supported.");
        }

        return JSON.stringify(renderOutput)
    }

    /**
     * Serializes the plugin on-load script/function string for host transport.
     * Plugin implementations should override `renderOnLoad()` when needed.
     */
    public serializeRenderOnLoad(): string {
        const onLoadOutput = this.renderOnLoad() as unknown;
        if (this.isThenable(onLoadOutput)) {
            void onLoadOutput.catch((error: unknown) => this.logAsyncLifecycleError("renderOnLoad", error));
            throw new Error(
                "Method 'renderOnLoad' must return a synchronous string, function, or defineRenderOnLoad(...) module. Async on-load promises are not supported."
            );
        }

        return JSON.stringify(resolveRenderOnLoadSource(onLoadOutput as RenderOnLoadOutput))
    }

    public log(message: string): void {
        this.getLogger().log(message)
    }

    public error(error: Error): void {
        this.getLogger().error(error)
    }

    public info(message: string, ...meta: unknown[]): void {
        this.getLogger().info(message, ...meta)
    }

    public warn(message: string, ...meta: unknown[]): void {
        this.getLogger().warn(message, ...meta)
    }

    public debug(message: string, ...meta: unknown[]): void {
        this.getLogger().debug(message, ...meta)
    }

    public verbose(message: string, ...meta: unknown[]): void {
        this.getLogger().verbose(message, ...meta)
    }

    public silly(message: string, ...meta: unknown[]): void {
        this.getLogger().silly(message, ...meta)
    }

    public event(name: string, payload: Record<string, unknown> = {}): string {
        return this.getLogger().event(name, payload)
    }

    public getLogDirectory(): string {
        return this.getLogger().getLogDirectory();
    }

    private isThenable(value: unknown): value is Promise<unknown> {
        return Boolean(value) && typeof (value as Promise<unknown>).then === "function";
    }

    private logAsyncLifecycleError(methodName: "render" | "renderOnLoad", error: unknown): void {
        const normalizedError = error instanceof Error
            ? error
            : new Error(`Async ${methodName} rejection: ${String(error)}`);
        this.getLogger().error(normalizedError);
    }

    private getLogger(): Logger {
        const pluginScope = PluginRegistry.getPluginScopeForLogging(this);
        if (pluginScope !== this.loggerScope) {
            this._logger = this._logger.withContext({ component: "FDO_SDK", pluginId: pluginScope });
            this.loggerScope = pluginScope;
        }
        return this._logger;
    }
}
