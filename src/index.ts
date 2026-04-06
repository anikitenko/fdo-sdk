import {Logger} from "./Logger";
import "./ambient/fdo-host";
import {Communicator} from "./Communicator";
import {PluginRegistry} from "./PluginRegistry";

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
export { requireFilesystemScopeCapability, requireProcessScopeCapability } from "./utils/capabilities";
export {
    createFilesystemMutateActionRequest,
    createFilesystemScopeCapability,
    createHostsWriteActionRequest,
    createProcessExecActionRequest,
    createProcessScopeCapability,
    validatePrivilegedActionRequest,
} from "./utils/privilegedActions";
export {
    createPrivilegedActionCorrelationId,
    isPrivilegedActionErrorResponse,
    isPrivilegedActionSuccessResponse,
    unwrapPrivilegedActionResponse,
} from "./utils/privilegedResponses";

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
    public static readonly API_VERSION: string = "1.0.0"
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

    public renderOnLoad(): string {
        const load = '() => {}'
        return load.toString()
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
            throw new Error("Method 'renderOnLoad' must return a synchronous string. Async on-load promises are not supported.");
        }

        return JSON.stringify(onLoadOutput)
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
