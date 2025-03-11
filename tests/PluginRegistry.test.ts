import { PluginRegistry } from "../src/PluginRegistry";
import { QuickActionMixin } from "../src/QuickActionMixin";
import { SidePanelMixin } from "../src/SidePanelMixin";
import {QuickAction, SidePanelConfig} from "../src/types";
import { FDO_SDK } from "../src";

// Mock process.parentPort to prevent errors in tests
beforeEach(() => {
    (global as any).process.parentPort = {
        on: jest.fn(),
        postMessage: jest.fn(),
    };
});

afterEach(() => {
    delete (global as any).process.parentPort;
    PluginRegistry.clearPlugin();
});

describe("PluginRegistry", () => {
    test("should return empty quick actions and side panel when no mixins are used", () => {
        class NoMixinPlugin extends FDO_SDK {
            init() {}
            render(): any {}
        }
        PluginRegistry.registerPlugin(new NoMixinPlugin());

        expect(PluginRegistry.getQuickActions()).toEqual([]);
        expect(PluginRegistry.getSidePanelConfig()).toBeNull();
    });

    test("should return only side panel config when using SidePanelMixin", () => {
        class SidePanelPlugin extends SidePanelMixin(FDO_SDK) {
            defineSidePanel(): SidePanelConfig {
                return { icon: "settings", label: "Settings Panel", submenu_list: [] };
            }
            init() {}
            render(): any {}
        }
        PluginRegistry.registerPlugin(new SidePanelPlugin());

        expect(PluginRegistry.getQuickActions()).toEqual([]);
        expect(PluginRegistry.getSidePanelConfig()).toEqual({
            icon: "settings",
            label: "Settings Panel",
            submenu_list: [],
        });
    });

    test("should return only quick actions when using QuickActionMixin", () => {
        class QuickActionPlugin extends QuickActionMixin(FDO_SDK) {
            defineQuickActions(): QuickAction[] {
                return [{ name: "Run Task", message_type: "RUN_TASK" }];
            }
            init() {}
            render(): any {}
        }
        PluginRegistry.registerPlugin(new QuickActionPlugin());

        expect(PluginRegistry.getQuickActions()).toEqual([
            { name: "Run Task", message_type: "RUN_TASK" },
        ]);
        expect(PluginRegistry.getSidePanelConfig()).toBeNull();
    });

    test("should return both quick actions and side panel config when using both mixins", () => {
        class FullFeaturePlugin extends QuickActionMixin(SidePanelMixin(FDO_SDK)) {
            defineQuickActions(): QuickAction[] {
                return [{ name: "Test Action", message_type: "TEST_ACTION" }];
            }
            defineSidePanel(): SidePanelConfig {
                return { icon: "test-icon", label: "Test Panel", submenu_list: [] };
            }
            init() {}
            render(): any {}
        }
        PluginRegistry.registerPlugin(new FullFeaturePlugin());

        expect(PluginRegistry.getQuickActions()).toEqual([
            { name: "Test Action", message_type: "TEST_ACTION" },
        ]);
        expect(PluginRegistry.getSidePanelConfig()).toEqual({
            icon: "test-icon",
            label: "Test Panel",
            submenu_list: [],
        });
    });

    test("should call init() on the registered plugin", () => {
        class TestPlugin extends QuickActionMixin(SidePanelMixin(FDO_SDK)) {
            init() {}
            render():any {}
        }

        const plugin = new TestPlugin();
        const initSpy = jest.spyOn(plugin, "init");

        PluginRegistry.registerPlugin(plugin);
        PluginRegistry.callInit();

        expect(initSpy).toHaveBeenCalled();
    });

    test("should call render() on the registered plugin", () => {
        class TestPlugin extends QuickActionMixin(SidePanelMixin(FDO_SDK)) {
            init() {}
            render():any {}
        }

        const plugin = new TestPlugin();
        const renderSpy = jest.spyOn(plugin, "render");

        PluginRegistry.registerPlugin(plugin);
        PluginRegistry.callRenderer();

        expect(renderSpy).toHaveBeenCalled();
    });
});
