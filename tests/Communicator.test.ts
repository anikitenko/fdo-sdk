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
        error: jest.fn(),
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

    test("should handle unknown message types", () => {
        const mockEmit = jest.spyOn(communicator, "emit"); // Spy on emit

        const mockMessage = { data: { message: "UNKNOWN_TYPE", content: "test" } };

        // Simulate message event
        const callback = mockOnMessage.mock.calls[0][1];
        callback(mockMessage);

        // Ensure logger logs the message
        expect((communicator as any)._logger.log).toHaveBeenCalledWith("Received from main process: UNKNOWN_TYPE");

        // Ensure emit was called with expected values
        expect(mockEmit).toHaveBeenCalledWith("UNKNOWN_TYPE", "test");

        mockEmit.mockRestore(); // Cleanup after test
    })

    test("should handle unknown content", () => {
        const mockEmit = jest.spyOn(communicator, "emit"); // Spy on emit
        const mockMessage = { data: { message: "test", undefined } };
        const callback = mockOnMessage.mock.calls[0][1];
        callback(mockMessage);
        expect(mockEmit).toHaveBeenCalledWith("test", undefined);
    })

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

    test("should handle UI_MESSAGE event", async () => {
        communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
            handler: "customHandler",
            content: "test_data"
        });

        // Wait for next event loop tick or async operation
        await Promise.resolve(); // or use waitFor or flushPromises if needed

        expect(PluginRegistry.callHandler).toHaveBeenCalledWith("customHandler", "test_data");
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.UI_MESSAGE,
            response: "mock_handler_output"
        });
    });

    test("should handle UI_MESSAGE event with default handler", async () => {
        communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
            content: "test_data"
        });

        await Promise.resolve();

        expect(PluginRegistry.callHandler).toHaveBeenCalledWith("defaultHandler", "test_data");
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.UI_MESSAGE,
            response: "mock_handler_output"
        });
    });

    it("should handle message with undefined data", () => {
        const communicator = new Communicator();
        const emitSpy = jest.spyOn(communicator, "emit");

        // simulate parentPort.on listener call
        const onMock = (process.parentPort.on as jest.Mock).mock.calls[0][1]; // second arg is the callback
        onMock({ data: undefined });

        expect(emitSpy).toHaveBeenCalledTimes(0)
    });

    describe("Error handling in UI_MESSAGE", () => {
        test("should handle Error objects thrown by handler", async () => {
            // Setup PluginRegistry.callHandler to throw an Error
            const error = new Error("Test error");
            (PluginRegistry.callHandler as jest.Mock).mockRejectedValueOnce(error);

            communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
                handler: "errorHandler",
                content: "test_data"
            });

            // Wait for async operation to complete
            await Promise.resolve();

            // Verify error was logged
            expect((communicator as any)._logger.error).toHaveBeenCalled();

            // Verify error response was sent
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response: {
                    error: "Test error"
                }
            });
        });

        test("should handle non-Error objects thrown by handler", async () => {
            // Setup PluginRegistry.callHandler to throw a non-Error
            (PluginRegistry.callHandler as jest.Mock).mockRejectedValueOnce("String error");

            communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
                handler: "errorHandler",
                content: "test_data"
            });

            // Wait for async operation to complete
            await Promise.resolve();

            // Verify error was logged
            expect((communicator as any)._logger.error).toHaveBeenCalled();

            // Verify error response was sent
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response: {
                    error: "Unknown error"
                }
            });
        });
    });

    describe("Comprehensive message handling", () => {
        test("should handle null message data", () => {
            const emitSpy = jest.spyOn(communicator, "emit");

            // Simulate message event with null data
            const callback = mockOnMessage.mock.calls[0][1];
            callback({ data: null });

            // Should not emit any event
            expect(emitSpy).toHaveBeenCalledTimes(0);
        });

        test("should handle message with missing message property", () => {
            const emitSpy = jest.spyOn(communicator, "emit");

            // Simulate message event with data but no message property
            const callback = mockOnMessage.mock.calls[0][1];
            callback({ data: { content: "test" } });

            // Should log with undefined message
            expect((communicator as any)._logger.log).toHaveBeenCalledWith("Received from main process: undefined");

            // Should emit with undefined message type
            expect(emitSpy).toHaveBeenCalledWith(undefined, "test");
        });

        test("should handle message with empty object data", () => {
            const emitSpy = jest.spyOn(communicator, "emit");

            // Simulate message event with empty object data
            const callback = mockOnMessage.mock.calls[0][1];
            callback({ data: {} });

            // Should log with undefined message
            expect((communicator as any)._logger.log).toHaveBeenCalledWith("Received from main process: undefined");

            // Should emit with undefined message type and content
            expect(emitSpy).toHaveBeenCalledWith(undefined, undefined);
        });
    });
});
