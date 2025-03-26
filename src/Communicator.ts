import {Logger} from "./Logger";
import {MessageEvent} from "electron";
import {PluginRegistry} from "./PluginRegistry";
import {MESSAGE_TYPE} from "./enums";
import { EventEmitter } from "events";

export class Communicator extends EventEmitter {
    private readonly _logger: Logger = new Logger()

    constructor() {
        super();
        this.init();
    }

    private sendMessage(message: any) {
        process.parentPort.postMessage(message)
    }

    private init() {
        process.parentPort.on("message", (message: MessageEvent) => {
            const data = message.data;
            this._logger.log(`Received from main process: ${data?.message}`);

            this.emit(data?.message, data?.content);
        });

        // 🔹 Register event handlers dynamically
        this.registerEventHandlers();
    }

    private registerEventHandlers() {
        this.on(MESSAGE_TYPE.PLUGIN_READY, () => {
            this.sendMessage({ type: MESSAGE_TYPE.PLUGIN_READY, response: true });
        });

        this.on(MESSAGE_TYPE.PLUGIN_INIT, () => {
            PluginRegistry.callInit();
            this.sendMessage({
                type: MESSAGE_TYPE.PLUGIN_INIT,
                response: {
                    quickActions: PluginRegistry.getQuickActions(),
                    sidePanelActions: PluginRegistry.getSidePanelConfig(),
                },
            });
        });

        this.on(MESSAGE_TYPE.PLUGIN_RENDER, () => {
            this.sendMessage({
                type: MESSAGE_TYPE.PLUGIN_RENDER,
                response: PluginRegistry.callRenderer(),
            });
        });

        // 🔹 UI ↔ Plugin Communication
        this.on(MESSAGE_TYPE.UI_MESSAGE, (data) => {
            const handlerName = data.handler || "defaultHandler";
            const response = PluginRegistry.callHandler(handlerName, data.content);
            this.sendMessage({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response
            });
        });
    }
}