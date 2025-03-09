import {Logger} from "./Logger";
import {MessageEvent} from "electron";
import {PluginRegistry} from "./PluginRegistry";
import {MESSAGE_TYPE} from "./enums";

export class Communicator {
    private readonly _logger: Logger = new Logger()

    private sendMessage(message: any) {
        process.parentPort.postMessage(message)
    }

    public processMessage(message: MessageEvent) {
        const data = message.data;
        this._logger.log(`Received message: ${data.message}`);
        switch (data.message) {
            case MESSAGE_TYPE.PLUGIN_READY:
                this.sendMessage({ type: MESSAGE_TYPE.PLUGIN_READY, response: true });
                break;
            case MESSAGE_TYPE.PLUGIN_INIT:
                PluginRegistry.callInit()
                this.sendMessage({ type: MESSAGE_TYPE.PLUGIN_INIT, response: {
                        quickActions: PluginRegistry.getQuickActions(),
                        sidePanelActions: PluginRegistry.getSidePanelConfig()
                    } });
                break;
            case MESSAGE_TYPE.PLUGIN_RENDER:
                this.sendMessage({ type: MESSAGE_TYPE.PLUGIN_RENDER, response: PluginRegistry.callRenderer() });
                break;
            default:
                this._logger.log(`Received unknown message type: ${data.message}`);
        }
    }
}