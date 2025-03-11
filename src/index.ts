import {Logger} from "./Logger";
import "electron";
import {Communicator} from "./Communicator";
import {PluginRegistry} from "./PluginRegistry";

export * from "./FDOInterface";
export * from "./PluginMetadata";

export class FDO_SDK {
    public static readonly API_VERSION: string = "1.0.0"
    static readonly TYPE_TAG = Symbol("FDO_SDK")
    private readonly _logger: Logger = new Logger()
    private readonly communicator: Communicator = new Communicator()

    constructor() {
        PluginRegistry.registerPlugin(this)
        process.parentPort.on('message', (e) => {
            this._logger.info('Received from main process:', e.data)
            this.communicator.processMessage(e)
        })
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

    public log(message: string): void {
        this._logger.log(message)
    }

    public error(error: Error): void {
        this._logger.error(error)
    }
}
