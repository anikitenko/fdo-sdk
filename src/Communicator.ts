import {Logger} from "./Logger";
import {MessageEvent} from "electron";
import {PluginRegistry} from "./PluginRegistry";
import {MESSAGE_TYPE} from "./enums";
import { EventEmitter } from "events";
import { validateHostMessageEnvelope, validateUIMessagePayload } from "./utils/contracts";
import {
    HostResponseEnvelope,
    PluginDiagnosticsRequest,
    PluginInitResponse,
    PluginRenderResponse,
    UIMessageResponse
} from "./types";

export class Communicator extends EventEmitter {
    private readonly _logger: Logger = new Logger({ context: { component: "Communicator" } })

    constructor() {
        super();
        this.init();
    }

    private sendMessage(message: HostResponseEnvelope) {
        process.parentPort.postMessage(message)
    }

    private buildInitFailureResponse(error: unknown): PluginInitResponse {
        const message = error instanceof Error ? error.message : "Unknown plugin initialization error";
        return {
            quickActions: [],
            sidePanelActions: null,
            error: message,
        };
    }

    private buildRenderFailureResponse(message: string): PluginRenderResponse {
        return {
            render: JSON.stringify(`<div style="padding: 20px; color: red;"><h2>Error rendering plugin</h2><p>${message}</p></div>`),
            onLoad: JSON.stringify('() => {}'),
            error: message,
        };
    }

    private init() {
        process.parentPort.on("message", (message: MessageEvent) => {
            const data = message.data;

            try {
                const validatedMessage = validateHostMessageEnvelope(data);
                this._logger.log(`Received from main process: ${validatedMessage.message}`);
                this._logger.event("ipc.message.received", { type: validatedMessage.message });
                this.emit(validatedMessage.message, validatedMessage.content);
            } catch (error) {
                this._logger.error(new Error(`Ignoring invalid host message: ${error}`));
            }
        });

        // 🔹 Register event handlers dynamically
        this.registerEventHandlers();
    }

    private parseDiagnosticsRequest(payload: unknown): PluginDiagnosticsRequest {
        if (!payload || typeof payload !== "object") {
            return {};
        }

        const candidate = payload as { notificationsLimit?: unknown };
        if (candidate.notificationsLimit === undefined) {
            return {};
        }

        if (typeof candidate.notificationsLimit !== "number" || Number.isNaN(candidate.notificationsLimit)) {
            throw new Error('Diagnostics request field "notificationsLimit" must be a number when provided.');
        }

        return {
            notificationsLimit: Math.trunc(candidate.notificationsLimit),
        };
    }

    private registerEventHandlers() {
        this.on(MESSAGE_TYPE.PLUGIN_READY, () => {
            this.sendMessage({ type: MESSAGE_TYPE.PLUGIN_READY, response: true });
        });

        this.on(MESSAGE_TYPE.PLUGIN_INIT, () => {
            const correlationId = this._logger.event("plugin.init.response.start");
            try {
                PluginRegistry.callInit();
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_INIT,
                    response: {
                        quickActions: PluginRegistry.getQuickActions(),
                        sidePanelActions: PluginRegistry.getSidePanelConfig(),
                    } satisfies PluginInitResponse,
                });
                this._logger.event("plugin.init.response.success", {}, { correlationId });
            } catch (error) {
                this._logger.error(new Error(`Error preparing plugin initialization response: ${error}`));
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_INIT,
                    response: this.buildInitFailureResponse(error),
                });
                this._logger.event("plugin.init.response.error", {}, { correlationId });
            }
        });

        this.on(MESSAGE_TYPE.PLUGIN_RENDER, () => {
            const correlationId = this._logger.event("plugin.render.response.start");
            try {
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_RENDER,
                    response: PluginRegistry.callRenderer(),
                });
                this._logger.event("plugin.render.response.success", {}, { correlationId });
            } catch (error) {
                this._logger.error(new Error(`Error preparing render payload: ${error}`));
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_RENDER,
                    response: this.buildRenderFailureResponse("Invalid render payload."),
                });
                this._logger.event("plugin.render.response.error", {}, { correlationId });
            }
        });

        // 🔹 UI ↔ Plugin Communication
        this.on(MESSAGE_TYPE.UI_MESSAGE, async (data) => {
            const correlationId = this._logger.event("ui.message.response.start");
            let response: UIMessageResponse;

            try {
                const payload = validateUIMessagePayload(data);
                const handlerName = payload.handler || "defaultHandler";

                if (handlerName === PluginRegistry.DIAGNOSTICS_HANDLER) {
                    response = PluginRegistry.getDiagnostics(this.parseDiagnosticsRequest(payload.content));
                } else {
                    response = await PluginRegistry.callHandler(handlerName, payload.content);
                }
                this._logger.event("ui.message.response.success", { handler: handlerName }, { correlationId });
            } catch (error) {
                this._logger.error(new Error(`Error in UI message handling: ${error}`));
                response = {
                    error: error instanceof Error ? error.message : "Unknown error"
                };
                this._logger.event("ui.message.response.error", {}, { correlationId });
            }

            this.sendMessage({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response
            });
        });
    }
}
