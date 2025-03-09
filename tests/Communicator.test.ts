import { Communicator } from "../src/Communicator";
import { PluginRegistry } from "../src/PluginRegistry";
import { MESSAGE_TYPE } from "../src";
import {Logger} from "winston";

describe("Communicator", () => {
    let communicator: Communicator;
    let mockPostMessage: jest.Mock;

    beforeEach(() => {
        communicator = new Communicator();
        jest.useFakeTimers(); // Control timers

        // Mock process.parentPort
        mockPostMessage = jest.fn();
        (global as any).process.parentPort = {
            postMessage: mockPostMessage,
        };

        // Mock PluginRegistry methods
        jest.spyOn(PluginRegistry, "callInit").mockImplementation(() => {}); // Ensure it doesn't hang
        jest.spyOn(PluginRegistry, "getQuickActions").mockReturnValue([{ name: "Test Action", message_type: "TEST_ACTION" }]);
        jest.spyOn(PluginRegistry, "getSidePanelConfig").mockReturnValue({ icon: "test-icon", label: "Test Panel", submenu_list: [] });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        delete (global as any).process.parentPort;
    });

    test("should process PLUGIN_READY message", async () => {
        const mockMessage = { data: { message: MESSAGE_TYPE.PLUGIN_READY } };

        communicator.processMessage(mockMessage as any);

        // Move time forward to ensure async tasks complete
        jest.advanceTimersByTime(100);

        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_READY,
            response: true,
        });
    });

    test("should process PLUGIN_INIT message", async () => {
        const mockMessage = { data: { message: MESSAGE_TYPE.PLUGIN_INIT } };

        communicator.processMessage(mockMessage as any);

        // Move time forward to ensure async tasks complete
        jest.advanceTimersByTime(100);

        expect(PluginRegistry.callInit).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: {
                quickActions: [{ name: "Test Action", message_type: "TEST_ACTION" }],
                sidePanelActions: { icon: "test-icon", label: "Test Panel", submenu_list: [] },
            },
        });
    });

    test("should process PLUGIN_RENDER message", async () => {
        const mockMessage = { data: { message: MESSAGE_TYPE.PLUGIN_RENDER } };
        const renderSpy = jest.spyOn(PluginRegistry, "callRenderer").mockImplementation(() => "Rendered Output");

        communicator.processMessage(mockMessage as any);

        // Move time forward to ensure async tasks complete
        jest.advanceTimersByTime(100);

        expect(renderSpy).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_RENDER,
            response: "Rendered Output",
        });
    });

    test("should not process invalid message", async () => {
        const mockLogger = jest.spyOn(Logger.prototype, "log").mockImplementation((level: string, message: any) => {
            console.log(`[MockLogger] ${level}: ${message}`); // Debugging output
            return undefined as any; // Explicitly return something to satisfy TypeScript
        });

        const mockMessage = { data: { message: "test123" } };

        communicator.processMessage(mockMessage as any);

        // Move time forward to ensure async tasks complete
        jest.advanceTimersByTime(100);

        expect(mockLogger).toHaveBeenCalledWith("info", "Received message: test123");
        expect(mockLogger).toHaveBeenCalledWith("info", "Received unknown message type: test123");
    });

});
