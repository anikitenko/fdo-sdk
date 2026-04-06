import { Communicator } from "../src/Communicator";
import { PluginRegistry } from "../src/PluginRegistry";
import { MESSAGE_TYPE } from "../src/enums";

// Mock process.parentPort
const mockPostMessage = vi.fn();
const mockOnMessage = vi.fn();
global.process.parentPort = {
    postMessage: mockPostMessage,
    on: mockOnMessage,
} as any;

vi.mock("../src/Logger", () => ({
    Logger: vi.fn().mockImplementation(function () {
        return {
        log: vi.fn(),
        error: vi.fn(),
        event: vi.fn().mockReturnValue("mock-correlation-id"),
        withContext: vi.fn(function () { return this; }),
        getLogDirectory: vi.fn().mockReturnValue("/tmp/fdo-sdk-logs/mock-plugin"),
        };
    }),
}));

vi.mock("../src/PluginRegistry", () => ({
    PluginRegistry: {
        DIAGNOSTICS_HANDLER: "__sdk.getDiagnostics",
        assertHostApiCompatibility: vi.fn(),
        configureCapabilities: vi.fn(),
        callInit: vi.fn(),
        callRenderer: vi.fn().mockReturnValue("mock_rendered_output"),
        callHandler: vi.fn().mockReturnValue("mock_handler_output"),
        getQuickActions: vi.fn().mockReturnValue(["action1", "action2"]),
        getSidePanelConfig: vi.fn().mockReturnValue(["panel1", "panel2"]),
        getDiagnostics: vi.fn().mockReturnValue({ health: { status: "healthy" } }),
        getPluginScopeForLogging: vi.fn().mockReturnValue("mock-plugin"),
    },
}));

describe("Communicator", () => {
    let communicator: Communicator;

    beforeEach(() => {
        vi.clearAllMocks();
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
        const mockEmit = vi.spyOn(communicator, "emit");

        const mockMessage = { data: { message: MESSAGE_TYPE.PLUGIN_READY, content: "test" } };

        const callback = mockOnMessage.mock.calls[0][1];
        callback(mockMessage);

        expect((communicator as any)._logger.log).toHaveBeenCalledWith("Received from main process: PLUGIN_READY");
        expect(mockEmit).toHaveBeenCalledWith(MESSAGE_TYPE.PLUGIN_READY, "test");
        mockEmit.mockRestore();
    });

    test("should reject invalid host message types", () => {
        const mockEmit = vi.spyOn(communicator, "emit");

        const mockMessage = { data: { message: "UNKNOWN_TYPE", content: "test" } };

        const callback = mockOnMessage.mock.calls[0][1];
        callback(mockMessage);

        expect((communicator as any)._logger.error).toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
        mockEmit.mockRestore();
    });

    test("should accept missing content for valid host messages", () => {
        const mockEmit = vi.spyOn(communicator, "emit");
        const mockMessage = { data: { message: MESSAGE_TYPE.PLUGIN_READY } };
        const callback = mockOnMessage.mock.calls[0][1];
        callback(mockMessage);
        expect(mockEmit).toHaveBeenCalledWith(MESSAGE_TYPE.PLUGIN_READY, undefined);
        mockEmit.mockRestore();
    });

    test("should handle PLUGIN_READY event", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_READY);
        expect(mockPostMessage).toHaveBeenCalledWith({ type: MESSAGE_TYPE.PLUGIN_READY, response: true });
    });

    test("should handle PLUGIN_INIT event", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_INIT);
        expect(PluginRegistry.assertHostApiCompatibility).toHaveBeenCalledWith(undefined);
        expect(PluginRegistry.configureCapabilities).toHaveBeenCalledWith({ granted: [] });
        expect(PluginRegistry.callInit).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: { quickActions: ["action1", "action2"], sidePanelActions: ["panel1", "panel2"] },
        });
    });

    test("should validate and pass plugin init apiVersion compatibility", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_INIT, { apiVersion: "1.4.0", capabilities: ["sudo.prompt"] });

        expect(PluginRegistry.assertHostApiCompatibility).toHaveBeenCalledWith("1.4.0");
        expect(PluginRegistry.configureCapabilities).toHaveBeenCalledWith({ granted: ["sudo.prompt"] });
        expect(PluginRegistry.callInit).toHaveBeenCalled();
    });

    test("should return init failure when plugin init payload is invalid", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_INIT, "invalid-payload" as any);

        expect(PluginRegistry.callInit).not.toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: {
                quickActions: [],
                sidePanelActions: null,
                error: "Plugin init payload must be an object.",
            },
        });
    });

    test("should return init failure when apiVersion is incompatible", () => {
        (PluginRegistry.assertHostApiCompatibility as vi.Mock).mockImplementationOnce(() => {
            throw new Error("Incompatible plugin API major version. Host requested \"2.0.0\", plugin SDK provides \"1.0.0\".");
        });

        communicator.emit(MESSAGE_TYPE.PLUGIN_INIT, { apiVersion: "2.0.0" });

        expect(PluginRegistry.callInit).not.toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: {
                quickActions: [],
                sidePanelActions: null,
                error: "Incompatible plugin API major version. Host requested \"2.0.0\", plugin SDK provides \"1.0.0\".",
            },
        });
    });

    test("should return a stable init failure response when plugin init fails", () => {
        (PluginRegistry.callInit as vi.Mock).mockImplementationOnce(() => {
            throw new Error("init failed");
        });

        communicator.emit(MESSAGE_TYPE.PLUGIN_INIT);

        expect((communicator as any)._logger.error).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_INIT,
            response: {
                quickActions: [],
                sidePanelActions: null,
                error: "init failed",
            },
        });
    });

    test("should handle PLUGIN_RENDER event", () => {
        communicator.emit(MESSAGE_TYPE.PLUGIN_RENDER);
        expect(PluginRegistry.callRenderer).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({ type: MESSAGE_TYPE.PLUGIN_RENDER, response: "mock_rendered_output" });
    });

    test("should fall back to default render payload when render preparation fails", () => {
        (PluginRegistry.callRenderer as vi.Mock).mockImplementationOnce(() => {
            throw new Error("invalid render payload");
        });

        communicator.emit(MESSAGE_TYPE.PLUGIN_RENDER);

        expect((communicator as any)._logger.error).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.PLUGIN_RENDER,
            response: {
                render: JSON.stringify(`<div style="padding: 20px; color: red;"><h2>Error rendering plugin</h2><p>Invalid render payload.</p></div>`),
                onLoad: JSON.stringify('() => {}'),
                error: "Invalid render payload.",
            },
        });
    });

    test("should handle UI_MESSAGE event", async () => {
        communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
            handler: "customHandler",
            content: "test_data"
        });

        await Promise.resolve();

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

    test("should return diagnostics through reserved SDK handler", async () => {
        communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
            handler: "__sdk.getDiagnostics",
            content: { notificationsLimit: 5 }
        });

        await Promise.resolve();

        expect(PluginRegistry.callHandler).not.toHaveBeenCalled();
        expect(PluginRegistry.getDiagnostics).toHaveBeenCalledWith({ notificationsLimit: 5 });
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: MESSAGE_TYPE.UI_MESSAGE,
            response: { health: { status: "healthy" } }
        });
    });

    it("should handle message with undefined data", () => {
        const emitSpy = vi.spyOn(communicator, "emit");

        const onMock = (process.parentPort.on as vi.Mock).mock.calls[0][1];
        onMock({ data: undefined });

        expect((communicator as any)._logger.error).toHaveBeenCalled();
        expect(emitSpy).toHaveBeenCalledTimes(0);
    });

    describe("Error handling in UI_MESSAGE", () => {
        test("should handle Error objects thrown by handler", async () => {
            const error = new Error("Test error");
            (PluginRegistry.callHandler as vi.Mock).mockRejectedValueOnce(error);

            communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
                handler: "errorHandler",
                content: "test_data"
            });

            await Promise.resolve();

            expect((communicator as any)._logger.error).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response: {
                    error: "Test error"
                }
            });
        });

        test("should handle non-Error objects thrown by handler", async () => {
            (PluginRegistry.callHandler as vi.Mock).mockRejectedValueOnce("String error");

            communicator.emit(MESSAGE_TYPE.UI_MESSAGE, {
                handler: "errorHandler",
                content: "test_data"
            });

            await Promise.resolve();

            expect((communicator as any)._logger.error).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response: {
                    error: "Unknown error"
                }
            });
        });

        test("should reject invalid UI_MESSAGE payloads before calling handlers", async () => {
            communicator.emit(MESSAGE_TYPE.UI_MESSAGE, "invalid_payload" as any);

            await Promise.resolve();

            expect(PluginRegistry.callHandler).not.toHaveBeenCalled();
            expect((communicator as any)._logger.error).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: MESSAGE_TYPE.UI_MESSAGE,
                response: {
                    error: "UI message payload must be an object."
                }
            });
        });
    });

    describe("Comprehensive message handling", () => {
        test("should handle null message data", () => {
            const emitSpy = vi.spyOn(communicator, "emit");

            const callback = mockOnMessage.mock.calls[0][1];
            callback({ data: null });

            expect((communicator as any)._logger.error).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledTimes(0);
        });

        test("should reject message with missing message property", () => {
            const emitSpy = vi.spyOn(communicator, "emit");

            const callback = mockOnMessage.mock.calls[0][1];
            callback({ data: { content: "test" } });

            expect((communicator as any)._logger.error).toHaveBeenCalled();
            expect(emitSpy).not.toHaveBeenCalled();
        });

        test("should reject message with empty object data", () => {
            const emitSpy = vi.spyOn(communicator, "emit");

            const callback = mockOnMessage.mock.calls[0][1];
            callback({ data: {} });

            expect((communicator as any)._logger.error).toHaveBeenCalled();
            expect(emitSpy).not.toHaveBeenCalled();
        });
    });
});
