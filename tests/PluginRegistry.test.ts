import { PluginRegistry } from "../src/PluginRegistry";
import { QuickActionMixin } from "../src/QuickActionMixin";
import { SidePanelMixin } from "../src/SidePanelMixin";
import {QuickAction, SidePanelConfig, FDO_SDK} from "../src";
import { Logger } from "../src/Logger";
import { StoreDefault } from "../src/StoreDefault";
import { StoreJson } from "../src/StoreJson";
import { NotificationManager } from "../src/utils/NotificationManager";

describe("PluginRegistry", () => {
    let mockLogger: jest.SpyInstance;
    let mockErrorLogger: jest.SpyInstance;

    // Mock process.parentPort to prevent errors in tests
    beforeEach(() => {
        (global as any).process.parentPort = {
            on: jest.fn(),
            postMessage: jest.fn(),
        };
        delete process.env.FDO_SDK_STORAGE_ROOT;
        mockLogger = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
        mockErrorLogger = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
        PluginRegistry.clearAllHandlers();
        PluginRegistry.clearAllStoreInstances();
        PluginRegistry.configureStorage({ rootDir: undefined });
        NotificationManager.getInstance().clearNotifications();
    });

    afterEach(() => {
        delete (global as any).process.parentPort;
        PluginRegistry.clearPlugin();
        PluginRegistry.clearAllStoreInstances();
        NotificationManager.getInstance().clearNotifications();
    });

    test("should return empty quick actions and side panel when no mixins are used", () => {
        class NoMixinPlugin extends FDO_SDK {
            init() {}
            render(): any {}
            get metadata() {
                return {
                    name: "NoMixin",
                    version: "1.0.0",
                    author: "Test",
                    description: "Test plugin",
                    icon: "cog",
                };
            }
        }
        PluginRegistry.registerPlugin(new NoMixinPlugin());

        expect(PluginRegistry.getQuickActions()).toEqual([]);
        expect(PluginRegistry.getSidePanelConfig()).toBeNull();
    });

    test("should return only side panel config when using SidePanelMixin", () => {
        class SidePanelPlugin extends SidePanelMixin(FDO_SDK) {
            get metadata() {
                return {
                    name: "SidePanel",
                    version: "1.0.0",
                    author: "Test",
                    description: "Test plugin",
                    icon: "cog",
                };
            }
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
            get metadata() {
                return {
                    name: "QuickAction",
                    version: "1.0.0",
                    author: "Test",
                    description: "Test plugin",
                    icon: "cog",
                };
            }
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
            serializeRender: jest.fn().mockReturnValue(JSON.stringify("<div>Hello</div>")),
            serializeRenderOnLoad: jest.fn().mockReturnValue(JSON.stringify("() => console.log('loaded')"))
        };

        PluginRegistry['pluginInstance'] = mockPlugin as any;

        PluginRegistry.callInit();
        expect(mockPlugin.init).toHaveBeenCalled();

        const output = PluginRegistry.callRenderer();
        expect(output).toEqual({
            render: JSON.stringify("<div>Hello</div>"),
            onLoad: JSON.stringify("() => console.log('loaded')")
        });
    });

    test("should return both quick actions and side panel config when using both mixins", () => {
        class FullFeaturePlugin extends QuickActionMixin(SidePanelMixin(FDO_SDK)) {
            get metadata() {
                return {
                    name: "FullFeature",
                    version: "1.0.0",
                    author: "Test",
                    description: "Test plugin",
                    icon: "cog",
                };
            }
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
            get metadata() {
                return {
                    name: "TestPlugin",
                    version: "1.0.0",
                    author: "Test",
                    description: "Test plugin",
                    icon: "cog",
                };
            }
            init() {}
            render():any {}
        }

        const plugin = new TestPlugin();
        const initSpy = jest.spyOn(plugin, "init");

        PluginRegistry.registerPlugin(plugin);
        PluginRegistry.callInit();

        expect(initSpy).toHaveBeenCalled();
    });

    test("should call serializeRender() on the registered plugin", () => {
        class TestPlugin extends QuickActionMixin(SidePanelMixin(FDO_SDK)) {
            get metadata() {
                return {
                    name: "TestPlugin",
                    version: "1.0.0",
                    author: "Test",
                    description: "Test plugin",
                    icon: "cog",
                };
            }
            init() {}
            render():any { return "<div>ok</div>"; }
        }

        const plugin = new TestPlugin();
        const renderSpy = jest.spyOn(plugin, "serializeRender");

        PluginRegistry.registerPlugin(plugin);
        PluginRegistry.callRenderer();

        expect(renderSpy).toHaveBeenCalled();
    });

    test("should validate plugin metadata during registration", () => {
        class InvalidMetadataPlugin extends FDO_SDK {
            get metadata() {
                return {
                    name: "",
                    version: "1.0.0",
                    author: "Test",
                    description: "Invalid plugin",
                    icon: "cog",
                };
            }
            init() {}
            render(): string {
                return "<div>test</div>";
            }
        }

        expect(() => PluginRegistry.registerPlugin(new InvalidMetadataPlugin())).toThrow(
            'Plugin metadata field "name" must be a non-empty string.'
        );
    });

    test("should reject invalid BlueprintJS icon names during registration", () => {
        class InvalidIconPlugin extends FDO_SDK {
            get metadata() {
                return {
                    name: "InvalidIcon",
                    version: "1.0.0",
                    author: "Test",
                    description: "Invalid icon plugin",
                    icon: "totally-invalid-icon",
                };
            }
            init() {}
            render(): string {
                return "<div>test</div>";
            }
        }

        expect(() => PluginRegistry.registerPlugin(new InvalidIconPlugin())).toThrow(
            'Plugin metadata field "icon" must be a valid BlueprintJS v6 icon name. Received "totally-invalid-icon".'
        );
    });

    test("should suggest close BlueprintJS icon names during registration", () => {
        class SuggestionIconPlugin extends FDO_SDK {
            get metadata() {
                return {
                    name: "SuggestionIcon",
                    version: "1.0.0",
                    author: "Test",
                    description: "Suggestion icon plugin",
                    icon: "warnng-sign",
                };
            }
            init() {}
            render(): string {
                return "<div>test</div>";
            }
        }

        expect(() => PluginRegistry.registerPlugin(new SuggestionIconPlugin())).toThrow(
            /Received "warnng-sign"\. Did you mean: .*"warning-sign"/
        );
    });

    test("should validate serialized render payload shape", () => {
        const invalidPlugin = {
            serializeRender: jest.fn().mockReturnValue(undefined),
            serializeRenderOnLoad: jest.fn().mockReturnValue(JSON.stringify("() => {}")),
        };

        PluginRegistry["pluginInstance"] = invalidPlugin as any;

        expect(() => PluginRegistry.callRenderer()).toThrow('Render payload field "render" must be a string.');
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
    });

    test("should provide plugin diagnostics with health, capabilities, and notifications", async () => {
        class DiagnosticsPlugin extends FDO_SDK {
            get metadata() {
                return {
                    id: "tests.diagnostics-plugin",
                    name: "DiagnosticsPlugin",
                    version: "1.0.0",
                    author: "Test",
                    description: "Diagnostics test plugin",
                    icon: "warning-sign",
                };
            }
            init() {}
            render(): string {
                return "<div>diagnostics</div>";
            }
        }

        const plugin = new DiagnosticsPlugin();
        PluginRegistry.registerHandler("ping", (data) => data);
        PluginRegistry.callInit();
        PluginRegistry.callRenderer();
        await PluginRegistry.callHandler("ping", "pong");
        NotificationManager.getInstance().addNotification("diagnostics-ready", "info", { origin: "test" });

        const diagnostics = PluginRegistry.getDiagnostics({ notificationsLimit: 1 });

        expect(diagnostics.apiVersion).toBe(FDO_SDK.API_VERSION);
        expect(diagnostics.pluginId).toBe("tests-diagnostics-plugin");
        expect(diagnostics.metadata?.name).toBe(plugin.metadata.name);
        expect(diagnostics.health.status).toBe("healthy");
        expect(diagnostics.health.initCount).toBe(1);
        expect(diagnostics.health.renderCount).toBe(1);
        expect(diagnostics.health.handlerCount).toBe(1);
        expect(diagnostics.capabilities.registeredHandlers).toContain("ping");
        expect(diagnostics.capabilities.diagnosticsHandler).toBe(PluginRegistry.DIAGNOSTICS_HANDLER);
        expect(diagnostics.notifications.recent).toHaveLength(1);
        expect(diagnostics.notifications.recent[0].message).toBe("diagnostics-ready");
    });

    test("should mark diagnostics as degraded after lifecycle errors", () => {
        class FailingInitPlugin extends FDO_SDK {
            get metadata() {
                return {
                    id: "tests.failing-init-plugin",
                    name: "FailingInitPlugin",
                    version: "1.0.0",
                    author: "Test",
                    description: "Failing init plugin",
                    icon: "warning-sign",
                };
            }
            init(): void {
                throw new Error("boom");
            }
            render(): string {
                return "<div>test</div>";
            }
        }

        new FailingInitPlugin();
        expect(() => PluginRegistry.callInit()).toThrow("boom");

        const diagnostics = PluginRegistry.getDiagnostics();
        expect(diagnostics.health.status).toBe("degraded");
        expect(diagnostics.health.errorCount).toBeGreaterThanOrEqual(1);
        expect(diagnostics.health.lastErrorMessage).toBe("boom");
    });

    describe("Store management", () => {
        const registerScopedPlugin = () => {
            class ScopedPlugin extends FDO_SDK {
                get metadata() {
                    return {
                        id: "tests.scoped-plugin",
                        name: "ScopedPlugin",
                        version: "1.0.0",
                        author: "Test",
                        description: "Scoped test plugin",
                        icon: "cog",
                    };
                }
                init() {}
                render(): string {
                    return "<div>test</div>";
                }
            }

            return new ScopedPlugin();
        };

        test("should return default store when using useStore without parameters", () => {
            registerScopedPlugin();
            const store = PluginRegistry.useStore();
            expect(store).not.toBe(StoreDefault);
        });

        test("should return specific store when using useStore with valid store name", () => {
            registerScopedPlugin();
            PluginRegistry.configureStorage({ rootDir: "/tmp/fdo-sdk-test-storage" });
            const store = PluginRegistry.useStore("json");
            expect(store).not.toBe(StoreJson);
            expect((store as any)._filePath).toContain("/tmp/fdo-sdk-test-storage/tests-scoped-plugin/store.json");
        });

        test("should return default store and log warning when using useStore with invalid store name", () => {
            registerScopedPlugin();
            const store = PluginRegistry.useStore("nonexistent");
            expect(store).not.toBe(StoreDefault);
            expect(mockLogger).toHaveBeenCalledWith("Store 'nonexistent' is not registered. Using default store...");
        });

        test("should register a new store", () => {
            const mockStore = {} as any;
            registerScopedPlugin();
            PluginRegistry.registerStore("custom", mockStore);

            const store = PluginRegistry.useStore("custom");
            expect(store).toBe(mockStore);
        });

        test("should not register a store with existing name and log warning", () => {
            const mockStore = {} as any;
            PluginRegistry.registerStore("default", mockStore);

            expect(mockLogger).toHaveBeenCalledWith("Store 'default' is already registered. Skipping...");
            const store = PluginRegistry.useStore("default");
            expect(store).not.toBe(StoreDefault);
        });

        test("should create plugin-scoped default stores", () => {
            class FirstPlugin extends FDO_SDK {
                get metadata() {
                    return {
                        id: "tests.first-plugin",
                        name: "FirstPlugin",
                        version: "1.0.0",
                        author: "Test",
                        description: "First test plugin",
                        icon: "cog",
                    };
                }
                init() {}
                render(): string {
                    return "<div>first</div>";
                }
            }

            class SecondPlugin extends FDO_SDK {
                get metadata() {
                    return {
                        id: "tests.second-plugin",
                        name: "SecondPlugin",
                        version: "1.0.0",
                        author: "Test",
                        description: "Second test plugin",
                        icon: "cog",
                    };
                }
                init() {}
                render(): string {
                    return "<div>second</div>";
                }
            }

            new FirstPlugin();
            const firstStore = PluginRegistry.useStore("default");
            firstStore.set("shared", "first");

            new SecondPlugin();
            const secondStore = PluginRegistry.useStore("default");

            expect(secondStore.get("shared")).toBeUndefined();
            expect(firstStore).not.toBe(secondStore);
        });

        test("should require explicit storage root for json store", () => {
            registerScopedPlugin();

            expect(() => PluginRegistry.useStore("json")).toThrow(
                "JSON store requires a configured storage root. Set PluginRegistry.configureStorage({ rootDir }) or FDO_SDK_STORAGE_ROOT."
            );
        });

        test("should allow JSON store root from environment", () => {
            process.env.FDO_SDK_STORAGE_ROOT = "/tmp/fdo-sdk-env-storage";
            registerScopedPlugin();

            const store = PluginRegistry.useStore("json");

            expect((store as any)._filePath).toContain("/tmp/fdo-sdk-env-storage/tests-scoped-plugin/store.json");
        });

        test("should register store factories for plugin-scoped custom stores", () => {
            registerScopedPlugin();
            PluginRegistry.registerStore("factoryStore", ({ pluginId }) => ({
                get: jest.fn((key: string) => `${pluginId}:${key}`),
                set: jest.fn(),
                remove: jest.fn(),
                clear: jest.fn(),
                has: jest.fn(),
                keys: jest.fn(),
            }) as any);

            const store = PluginRegistry.useStore("factoryStore");

            expect(store.get("key")).toBe("tests-scoped-plugin:key");
        });

        test("should execute store lifecycle hooks", async () => {
            const init = jest.fn();
            const flush = jest.fn().mockResolvedValue(undefined);
            const dispose = jest.fn().mockResolvedValue(undefined);

            registerScopedPlugin();
            PluginRegistry.registerStore("lifecycleStore", () => ({
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
                clear: jest.fn(),
                has: jest.fn(),
                keys: jest.fn(),
                init,
                flush,
                dispose,
                capabilities: { persistent: true, supportsAsyncFlush: true },
            }) as any);

            PluginRegistry.useStore("lifecycleStore");
            await Promise.resolve();

            expect(init).toHaveBeenCalled();

            PluginRegistry.clearPlugin();
            await Promise.resolve();
            await Promise.resolve();

            expect(flush).toHaveBeenCalled();
            expect(dispose).toHaveBeenCalled();
        });
    });

    describe("Error handling in callHandler", () => {
        test("should handle errors in handler and return null", async () => {
            const errorHandler = jest.fn().mockImplementation(() => {
                throw new Error("Test error");
            });

            PluginRegistry.registerHandler("errorHandler", errorHandler);

            const result = await PluginRegistry.callHandler("errorHandler", "test");

            expect(errorHandler).toHaveBeenCalledWith("test");
            expect(mockErrorLogger).toHaveBeenCalled();
            expect(result).toBeNull();
        });

        test("should handle non-Error exceptions in handler", async () => {
            const errorHandler = jest.fn().mockImplementation(() => {
                throw "String error"; // Not an Error object
            });

            PluginRegistry.registerHandler("errorHandler", errorHandler);

            const result = await PluginRegistry.callHandler("errorHandler", "test");

            expect(errorHandler).toHaveBeenCalledWith("test");
            expect(mockErrorLogger).toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });
});
