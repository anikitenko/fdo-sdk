import {Logger} from "./Logger";
import "electron";
import "./ambient/fdo-host";
import {Communicator} from "./Communicator";
import {PluginRegistry} from "./PluginRegistry";

export { atomicWriteFile, atomicWriteFileSync } from "./utils/atomic";
export { BLUEPRINT_V6_ICON_NAMES, isBlueprintV6IconName } from "./utils/blueprintIcons";
export {
    validateHostMessageEnvelope,
    validatePluginMetadata,
    validateSerializedRenderPayload,
    validateUIMessagePayload,
} from "./utils/contracts";
export { pify } from "./utils/pify";
export { runWithSudo } from "./utils/runWithSudo";

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
    private readonly _logger: Logger = new Logger({ context: { component: "FDO_SDK" } })
    private readonly communicator: Communicator = new Communicator()

    constructor() {
        PluginRegistry.registerPlugin(this)
        this.communicator.emit("init", {})
        this._logger.log("FDO_SDK initialized!")
    }

    public init(): void {
        const error = new Error("Method 'init' must be implemented by plugin.")
        this._logger.error(error)
        throw error
    }

    public render(): string {
        const error = new Error("Method 'render' must be implemented by plugin.")
        this._logger.error(error)
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
        return JSON.stringify(this.render())
    }

    /**
     * Serializes the plugin on-load script/function string for host transport.
     * Plugin implementations should override `renderOnLoad()` when needed.
     */
    public serializeRenderOnLoad(): string {
        return JSON.stringify(this.renderOnLoad())
    }

    public log(message: string): void {
        this._logger.log(message)
    }

    public error(error: Error): void {
        this._logger.error(error)
    }

    public info(message: string, ...meta: unknown[]): void {
        this._logger.info(message, ...meta)
    }

    public warn(message: string, ...meta: unknown[]): void {
        this._logger.warn(message, ...meta)
    }

    public debug(message: string, ...meta: unknown[]): void {
        this._logger.debug(message, ...meta)
    }

    public verbose(message: string, ...meta: unknown[]): void {
        this._logger.verbose(message, ...meta)
    }

    public silly(message: string, ...meta: unknown[]): void {
        this._logger.silly(message, ...meta)
    }

    public event(name: string, payload: Record<string, unknown> = {}): string {
        return this._logger.event(name, payload)
    }
}
