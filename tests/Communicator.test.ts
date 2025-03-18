import { Communicator } from "../src/Communicator";
import { PluginRegistry } from "../src/PluginRegistry";
import { MESSAGE_TYPE } from "../src/enums";

// Mock process.parentPort
const mockPostMessage = jest.fn();
const mockOnMessage = jest.fn();
global.process.parentPort = {
    postMessage: mockPostMessage,
    on: mockOnMessage,
} as any;

jest.mock("../src/Logger", () => ({
    Logger: jest.fn().mockImplementation(() => ({
        log: jest.fn(),
    })),
}));

jest.mock("../src/PluginRegistry", () => ({
    PluginRegistry: {
        callInit: jest.fn(),
        callRenderer: jest.fn().mockReturnValue("mock_rendered_output"),
        callHandler: jest.fn().mockReturnValue("mock_handler_output"),
        getQuickActions: jest.fn().mockReturnValue(["action1", "action2"]),
        getSidePanelConfig: jest.fn().mockReturnValue(["panel1", "panel2"]),
    },
}));

describe("Communicator", () => {
    let communicator: Communicator;

    beforeEach(() => {
        jest.clearAllMocks();
        communicator = new Communicator();
    });

    test("should initialize and call init()", () => {
        expect(mockOnMessage).toHaveBeenCalledTimes(1);
    });

    test("should send a message correctly", () => {
        (communicator as any).sendMessage({ test: "message" });
        expect(mockPostMessage).toHaveBeenCalledWith({ test: "message" });
    });

    test("should listen to messages from main process and emit event", () => {
        const mockEmit = jest.spyOn(communicator, "emit"); // Spy on emit

        const mockMessage = { data: { message: MESSAGE_TYPE.PLUGIN_READY, content: "test" } };

        // Simulate message event
        const callback = mockOnMessage.mock.calls[0][1];
        callback(mockMessage);

        // Ensure logger logs the message
        expect((communicator as any)._logger.log).toHaveBeenCalledWith("Received from main process: PLUGIN_READY");

        // Ensure emit was called with expected values
        expect(mockEmit).toHaveBeenCalledWith(MESSAGE_TYPE.PLUGIN_READY, "test");

        mockEmit.mockRestore(); // Cleanup after test
    });

    test("should handle PLUGIN_READY event", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_READY);
        expect(mockPostMessage).toHaveBeenCalledWith({ type: MESSAGE_TYPE.PLUGIN_READY, response: true });
    });

    test("should handle PLUGIN_INIT event", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_INIT);
        expect(PluginRegistry.callInit).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: { quickActions: ["action1", "action2"], sidePanelActions: ["panel1", "panel2"] },
        });
    });

    test("should handle PLUGIN_RENDER event", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_RENDER);
        expect(PluginRegistry.callRenderer).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({ type: MESSAGE_TYPE.PLUGIN_RENDER, response: "mock_rendered_output" });
    });

    test("should handle UI_MESSAGE event", () => {
        communicator.emit(MESSAGE_TYPE.UI_MESSAGE, { handler: "customHandler", content: "test_data" });

        expect(PluginRegistry.callHandler).toHaveBeenCalledWith("customHandler", "test_data");
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.UI_MESSAGE,
            response: "mock_handler_output",
        });
    });

    test("should handle UI_MESSAGE event with default handler", () => {
        communicator.emit(MESSAGE_TYPE.UI_MESSAGE, { content: "test_data" });

        expect(PluginRegistry.callHandler).toHaveBeenCalledWith("defaultHandler", "test_data");
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.UI_MESSAGE,
            response: "mock_handler_output",
        });
    });
});
