import {Logger} from "./logger";
import {MessageEvent} from "electron";

export enum MESSAGE_TYPE  {
    PLUGIN_READY = 'PLUGIN_READY',
    PLUGIN_INIT = 'PLUGIN_INIT',
    PLUGIN_RENDER = 'PLUGIN_RENDER',
}

export class Communicator {
    private readonly _logger: Logger = new Logger()

    private sendMessage(message: any) {
        process.parentPort.postMessage(message)
    }

    public processMessage(message: MessageEvent) {
        const data = message.data;
        this._logger.info(`Received message: ${data.message}`);
        switch (data.message) {
            case MESSAGE_TYPE.PLUGIN_READY:
                this.sendMessage({ type: MESSAGE_TYPE.PLUGIN_READY, response: true });
                break;
            case MESSAGE_TYPE.PLUGIN_INIT:
                break;
            case MESSAGE_TYPE.PLUGIN_RENDER:
                break;
            default:
                this._logger.info(`Received unknown message type: ${data.message}`);
        }
    }
}