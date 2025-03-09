import { FDO_SDK } from "./index";
import { QuickAction, SidePanelConfig } from "./types";

export class PluginRegistry {
    private static pluginInstance: FDO_SDK | null = null;

    public static registerPlugin(plugin: FDO_SDK): void {
        this.pluginInstance = plugin;
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
        return this.pluginInstance?.render();
    }

    public static clearPlugin(): void {
        this.pluginInstance = null;
    }
}
