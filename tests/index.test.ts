import {FDO_SDK} from "../src";
import { PluginRegistry } from "../src/PluginRegistry";
import { Communicator } from "../src/Communicator";
import { Logger } from "../src/Logger";

describe("FDO_SDK", () => {
    let sdk: FDO_SDK;
    let mockLogger: jest.SpyInstance;
    let mockLoggerInfo: jest.SpyInstance;
    let mockCommunicator: jest.SpyInstance;

    beforeEach(() => {
        // Mock process.parentPort to prevent errors
        (global as any).process.parentPort = {
            on: jest.fn(),
            postMessage: jest.fn(),
        };

        // Mock Logger methods
        mockLogger = jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
        mockLoggerInfo = jest.spyOn(Logger.prototype, "info").mockImplementation(() => {});
        jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

        // Mock PluginRegistry
        jest.spyOn(PluginRegistry, "registerPlugin").mockImplementation(() => {});

        // Mock Communicator
        mockCommunicator = jest.spyOn(Communicator.prototype, "processMessage").mockImplementation(() => {});

        sdk = new FDO_SDK();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete (global as any).process.parentPort;
    });

    test("should have correct static properties", () => {
        expect(FDO_SDK.API_VERSION).toBe("1.0.0");
        expect(FDO_SDK.TYPE_TAG).toBeDefined();
    });

    test("should register itself in PluginRegistry on instantiation", () => {
        expect(PluginRegistry.registerPlugin).toHaveBeenCalledWith(sdk);
    });

    test("should set up process.parentPort message listener", () => {
        expect(process.parentPort.on).toHaveBeenCalledWith("message", expect.any(Function));
    });

    test("should process messages from parent process", () => {
        const mockMessage = { data: "test-message" };

        // Simulate the callback execution (extract the actual function from the Jest mock)
        const messageCallback = (process.parentPort.on as jest.Mock).mock.calls[0][1];

        // Call the extracted function manually with a test message
        messageCallback(mockMessage);

        // Expect logger to log the message
        expect(mockLoggerInfo).toHaveBeenCalledWith("Received from main process:", mockMessage.data);
        expect(mockLogger).toHaveBeenCalledWith("FDO_SDK initialized!");

        // Expect communicator to process the message
        expect(mockCommunicator).toHaveBeenCalledWith(mockMessage);
    });

    test("should log initialization message", () => {
        expect(mockLogger).toHaveBeenCalledWith("FDO_SDK initialized!");
    });

    test("should throw error when init() is called", () => {
        expect(() => sdk.init()).toThrow("Method 'init' must be implemented by plugin.");
    });

    test("should throw error when render() is called", () => {
        expect(() => sdk.render()).toThrow("Method 'render' must be implemented by plugin.");
    });

    test("should log messages using log()", () => {
        sdk.log("Test message");
        expect(mockLogger).toHaveBeenCalledWith("Test message");
    });

    test("should log errors using error()", () => {
        const error = new Error("Test error");
        sdk.error(error);
        expect(Logger.prototype.error).toHaveBeenCalledWith(error);
    });
});
