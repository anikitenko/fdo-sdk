import { FDO_SDK } from "../src";
import { MESSAGE_TYPE } from "../src/enums";
import { Logger } from "../src/Logger";
import { PluginRegistry } from "../src/PluginRegistry";
import { QuickAction, SidePanelConfig } from "../src/types";

class IntegrationPlugin extends FDO_SDK {
    public initCallCount = 0;

    public get metadata() {
        return {
            name: "IntegrationPlugin",
            version: "1.0.0",
            author: "Test",
            description: "Integration test plugin",
            icon: "cog",
        };
    }

    public init(): void {
        this.initCallCount += 1;
    }

    public render(): string {
        return "<div data-testid=\"integration-plugin\">Hello integration flow</div>";
    }

    public renderOnLoad(): string {
        return "() => window.__integrationLoaded = true";
    }

    public defineQuickActions(): QuickAction[] {
        return [{ name: "Run Integration", message_type: "RUN_INTEGRATION" }];
    }

    public defineSidePanel(): SidePanelConfig {
        return {
            icon: "settings",
            label: "Integration Panel",
            submenu_list: [],
        };
    }
}

describe("Plugin host message flow", () => {
    const mockPostMessage = vi.fn();
    const mockOnMessage = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        PluginRegistry.clearAllHandlers();
        PluginRegistry.clearPlugin();
        (global as any).process.parentPort = {
            on: mockOnMessage,
            postMessage: mockPostMessage,
        };
        vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
        vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        PluginRegistry.clearAllHandlers();
        PluginRegistry.clearPlugin();
        delete (global as any).process.parentPort;
    });

    test("responds to PLUGIN_INIT and PLUGIN_RENDER with serialized plugin data", () => {
        const plugin = new IntegrationPlugin();
        const messageCallback = mockOnMessage.mock.calls[0][1];

        messageCallback({ data: { message: MESSAGE_TYPE.PLUGIN_INIT } });

        expect(plugin.initCallCount).toBe(1);
        expect(mockPostMessage).toHaveBeenNthCalledWith(1, {
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: {
                quickActions: [{ name: "Run Integration", message_type: "RUN_INTEGRATION" }],
                sidePanelActions: {
                    icon: "settings",
                    label: "Integration Panel",
                    submenu_list: [],
                },
            },
        });

        messageCallback({ data: { message: MESSAGE_TYPE.PLUGIN_RENDER } });

        expect(mockPostMessage).toHaveBeenNthCalledWith(2, {
            type: MESSAGE_TYPE.PLUGIN_RENDER,
            response: {
                render: JSON.stringify("<div data-testid=\"integration-plugin\">Hello integration flow</div>"),
                onLoad: JSON.stringify("() => window.__integrationLoaded = true"),
            },
        });
    });
});
