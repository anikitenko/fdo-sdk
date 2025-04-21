import { PluginRegistry } from "../src/PluginRegistry";
import { QuickActionMixin } from "../src/QuickActionMixin";
import { SidePanelMixin } from "../src/SidePanelMixin";
import {QuickAction, SidePanelConfig, FDO_SDK} from "../src";
import { Logger } from "../src/Logger";

describe("PluginRegistry", () => {
    let mockLogger: jest.SpyInstance;

    // Mock process.parentPort to prevent errors in tests
    beforeEach(() => {
        (global as any).process.parentPort = {
            on: jest.fn(),
            postMessage: jest.fn(),
        };
        mockLogger = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
        PluginRegistry.clearAllHandlers()
    });

    afterEach(() => {
        delete (global as any).process.parentPort;
        PluginRegistry.clearPlugin();
    });

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

    test("callInit and callRenderer with no plugin instance", () => {
        PluginRegistry['pluginInstance'] = null;

        expect(() => PluginRegistry.callInit()).not.toThrow();

        const output = PluginRegistry.callRenderer();
        expect(output).toEqual({ render: undefined, onLoad: undefined });
    });

    test("callInit and callRenderer with plugin instance", () => {
        const mockPlugin = {
            init: jest.fn(),
            render: jest.fn().mockReturnValue("<div>Hello</div>"),
            renderOnLoad: jest.fn().mockReturnValue("() => console.log('loaded')")
        };

        PluginRegistry['pluginInstance'] = mockPlugin as any;

        PluginRegistry.callInit();
        expect(mockPlugin.init).toHaveBeenCalled();

        const output = PluginRegistry.callRenderer();
        expect(output).toEqual({
            render: "<div>Hello</div>",
            onLoad: "() => console.log('loaded')"
        });
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

    test("should register a handler", () => {
        const mockHandler = jest.fn();
        PluginRegistry.registerHandler("testHandler", mockHandler);

        expect(PluginRegistry["handlers"]["testHandler"]).toBe(mockHandler);
    });

    test("should call a registered handler and return its output", async () => {
        const mockHandler = jest.fn((data) => `Received: ${data}`);
        PluginRegistry.registerHandler("testHandler", mockHandler);

        const result = await PluginRegistry.callHandler("testHandler", "Hello");

        expect(mockHandler).toHaveBeenCalledWith("Hello");
        expect(result).toBe("Received: Hello");
    });

    test("should log a warning and return null if handler is not registered", async () => {
        const result = await PluginRegistry.callHandler("unknownHandler", "Hello");

        expect(mockLogger).toHaveBeenCalledWith("Handler 'unknownHandler' is not registered.");
        expect(result).toBeNull();
    });

    test("should clear the plugin instance", () => {
        PluginRegistry.clearPlugin();

        expect(PluginRegistry["pluginInstance"]).toBeNull();
    });

    test("should clear all handlers", () => {
        PluginRegistry.registerHandler("testHandler", jest.fn());
        PluginRegistry.clearAllHandlers();

        expect(PluginRegistry["handlers"]).toEqual({});
    });

    test("should clear one handler", () => {
        PluginRegistry.registerHandler("testHandler", jest.fn());
        PluginRegistry.clearHandler("testHandler");

        expect(PluginRegistry["handlers"]["testHandler"]).toBeUndefined();
    })
});
