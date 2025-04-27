import {FDO_SDK, StoreType} from "./index";
import {QuickAction, SidePanelConfig} from "./types";
import {Logger} from "./Logger";
import {StoreDefault} from "./StoreDefault";
import {StoreJson} from "./StoreJson";

export class PluginRegistry {
    private static readonly _logger: Logger = new Logger()
    private static pluginInstance: FDO_SDK | null = null;
    private static readonly handlers: Record<string, Function> = {};
    private static readonly stores: Record<string, StoreType> = {
        default: StoreDefault,
        json: StoreJson,
    }

    public static registerPlugin(plugin: FDO_SDK): void {
        this.pluginInstance = plugin;
    }

    public static registerHandler(name: string, handler: (data: any) => any) {
        this.handlers[name] = handler;
    }

    public static useStore(name: string = "default") : StoreType {
        if (this.stores[name]) {
            return this.stores[name];
        } else {
            this._logger.warn(`Store '${name}' is not registered. Using default store...`);
            return StoreDefault
        }
    }

    public static registerStore(name: string, store: StoreType) {
        if (this.stores[name]) {
            this._logger.warn(`Store '${name}' is already registered. Skipping...`);
            return
        }
        this.stores[name] = store;
    }

    public static getQuickActions(): QuickAction[] {
        if (this.pluginInstance && "defineQuickActions" in this.pluginInstance) {
            return (this.pluginInstance as any).defineQuickActions();
        }
        return [];
    }

    public static getSidePanelConfig(): SidePanelConfig | null {
        if (this.pluginInstance && "defineSidePanel" in this.pluginInstance) {
            return (this.pluginInstance as any).defineSidePanel();
        }
        return null;
    }

    public static callInit(): void {
        this.pluginInstance?.init(); // Safe call without `!`
    }

    public static callRenderer(): any {
        return {
            render: this.pluginInstance?.render(),
            onLoad: this.pluginInstance?.renderOnLoad()
        }
    }

    public static async callHandler(name: string, data: any): Promise<any> {
        const handler = PluginRegistry.handlers[name];

        if (handler) {
            try {
                return await handler(data);
            } catch (err) {
                this._logger.error(new Error(`Handler '${name}' threw an error: ${err}`));
                return null;
            }
        } else {
            this._logger.warn(`Handler '${name}' is not registered.`);
            return null;
        }
    }

    public static clearPlugin(): void {
        this.pluginInstance = null;
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
}

export default PluginRegistry;
