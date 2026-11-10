import {Logger} from "./Logger";
import {PluginRegistry} from "./PluginRegistry";
import {MESSAGE_TYPE} from "./enums";
import { EventEmitter } from "events";
import { validateHostMessageEnvelope, validatePluginInitPayload, validateUIMessagePayload } from "./utils/contracts";
import {
    HostResponseEnvelope,
    PluginDiagnosticsRequest,
    PluginInitResponse,
    PluginRenderResponse,
    UIMessageResponse
} from "./types";

type ParentPortMessage = { data?: unknown } | unknown;

interface ParentPortBridge {
    postMessage: (message: HostResponseEnvelope) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    off?: (event: string, listener: (...args: any[]) => void) => void;
    removeListener?: (event: string, listener: (...args: any[]) => void) => void;
}

export class Communicator extends EventEmitter {
    private _logger: Logger = new Logger({ context: { component: "Communicator" } })
    private loggerScope: string = "global";
    private readonly parentPort: ParentPortBridge;
    private closed = false;
    private messageListener?: (message: ParentPortMessage) => void;
    private readonly disconnected = () => {
        this.dispose();
        void PluginRegistry.shutdown?.().catch(() => {});
    };

    constructor() {
        super({ captureRejections: true });
        this.on("error", error => this.reportError(error));
        try {
            this.parentPort = this.getParentPortBridge();
            this.init();
        } catch (error) {
            this._logger.close?.();
            throw error;
        }
    }

    private sendMessage(message: HostResponseEnvelope) {
        if (this.closed) return false;
        try { this.parentPort.postMessage(message); return true; }
        catch (error) { this.reportError(error); this.disconnected(); return false; }
    }

    private reportError(error: unknown): void {
        try { this.getLogger().error(error instanceof Error ? error : new Error(String(error))); } catch {}
    }

    public dispose(): void {
        if (this.closed) return;
        this.closed = true;
        const remove = this.parentPort.off ?? this.parentPort.removeListener;
        if (remove) {
            if (this.messageListener) remove.call(this.parentPort, 'message', this.messageListener);
            remove.call(this.parentPort, 'close', this.disconnected);
            remove.call(this.parentPort, 'disconnect', this.disconnected);
        }
        this.removeAllListeners();
        // Keep a rejection sink for event callbacks already in flight.
        this.on('error', () => {});
        this._logger.close?.();
    }

    private getParentPortBridge(): ParentPortBridge {
        const parentPort = (process as unknown as { parentPort?: unknown }).parentPort;
        if (!parentPort || typeof parentPort !== "object") {
            throw new Error("Plugin host messaging bridge is unavailable: process.parentPort is not initialized.");
        }

        const candidate = parentPort as Partial<ParentPortBridge>;
        if (typeof candidate.postMessage !== "function" || typeof candidate.on !== "function") {
            throw new Error("Plugin host messaging bridge is unavailable: process.parentPort is missing required methods.");
        }

        return candidate as ParentPortBridge;
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
        this.messageListener = (message: ParentPortMessage) => {
            if (this.closed) return;
            const data = message && typeof message === "object" && "data" in message
                ? (message as { data?: unknown }).data
                : message;

            try {
                const validatedMessage = validateHostMessageEnvelope(data);
                this.getLogger().log(`Received from main process: ${validatedMessage.message}`);
                this.getLogger().event("ipc.message.received", { type: validatedMessage.message });
                this.emit(validatedMessage.message, validatedMessage.content);
            } catch (error) {
                this.getLogger().error(new Error(`Ignoring invalid host message: ${error}`));
            }
        };
        this.parentPort.on("message", this.messageListener);
        this.parentPort.on('close', this.disconnected);
        this.parentPort.on('disconnect', this.disconnected);

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

        this.on(MESSAGE_TYPE.PLUGIN_INIT, (data) => {
            const correlationId = this.getLogger().event("plugin.init.response.start");
            try {
                const request = validatePluginInitPayload(data);
                PluginRegistry.assertHostApiCompatibility(request.apiVersion);
                PluginRegistry.configureCapabilities({ granted: request.capabilities ?? [] });
                PluginRegistry.callInit();
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_INIT,
                    response: {
                        quickActions: PluginRegistry.getQuickActions(),
                        sidePanelActions: PluginRegistry.getSidePanelConfig(),
                    } satisfies PluginInitResponse,
                });
                this.getLogger().event("plugin.init.response.success", {}, { correlationId });
            } catch (error) {
                this.getLogger().error(new Error(`Error preparing plugin initialization response: ${error}`));
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_INIT,
                    response: this.buildInitFailureResponse(error),
                });
                this.getLogger().event("plugin.init.response.error", {}, { correlationId });
                void PluginRegistry.shutdown?.().catch(error => this.reportError(error));
            }
        });

        this.on(MESSAGE_TYPE.PLUGIN_RENDER, () => {
            const correlationId = this.getLogger().event("plugin.render.response.start");
            try {
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_RENDER,
                    response: PluginRegistry.callRenderer(),
                });
                this.getLogger().event("plugin.render.response.success", {}, { correlationId });
            } catch (error) {
                this.getLogger().error(new Error(`Error preparing render payload: ${error}`));
                this.sendMessage({
                    type: MESSAGE_TYPE.PLUGIN_RENDER,
                    response: this.buildRenderFailureResponse("Invalid render payload."),
                });
                this.getLogger().event("plugin.render.response.error", {}, { correlationId });
            }
        });

        // 🔹 UI ↔ Plugin Communication
        this.on(MESSAGE_TYPE.UI_MESSAGE, async (data) => {
            const correlationId = this.getLogger().event("ui.message.response.start");
            let response: UIMessageResponse;

            try {
                const payload = validateUIMessagePayload(data);
                const handlerName = payload.handler || "defaultHandler";

                if (handlerName === PluginRegistry.DIAGNOSTICS_HANDLER) {
                    response = PluginRegistry.getDiagnostics(this.parseDiagnosticsRequest(payload.content));
                } else {
                    response = await PluginRegistry.callHandler(handlerName, payload.content);
                }
                this.getLogger().event("ui.message.response.success", { handler: handlerName }, { correlationId });
            } catch (error) {
                this.getLogger().error(new Error(`Error in UI message handling: ${error}`));
                response = {
                    error: error instanceof Error ? error.message : "Unknown error"
                };
                this.getLogger().event("ui.message.response.error", {}, { correlationId });
            }

            this.sendMessage({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response
            });
        });
    }

    private getLogger(): Logger {
        const pluginScope = PluginRegistry.getPluginScopeForLogging();
        if (pluginScope !== this.loggerScope) {
            this._logger = this._logger.withContext({ component: "Communicator", pluginId: pluginScope });
            this.loggerScope = pluginScope;
        }
        return this._logger;
    }
}
