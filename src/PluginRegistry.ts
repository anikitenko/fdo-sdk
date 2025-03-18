import {FDO_SDK} from "./index";
import {QuickAction, SidePanelConfig} from "./types";
import {Logger} from "./Logger";

export class PluginRegistry {
    private static readonly _logger: Logger = new Logger()
    private static pluginInstance: FDO_SDK | null = null;
    private static readonly handlers: Record<string, Function> = {};

    public static registerPlugin(plugin: FDO_SDK): void {
        this.pluginInstance = plugin;
    }

    public static registerHandler(name: string, handler: (data: any) => any) {
        this.handlers[name] = handler;
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
        return this.pluginInstance?.render()
    }

    public static callHandler(name: string, data: any) {
        if (PluginRegistry.handlers[name]) {
            return PluginRegistry.handlers[name](data);
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
