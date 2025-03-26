import {FDO_SDK} from "../src";
import { PluginRegistry } from "../src/PluginRegistry";
import { Logger } from "../src/Logger";

class MockPlugin extends FDO_SDK {
    public render(): string {
        return `<style>.test{"color": "green"}</style><h1>Hello from plugin!</h1>`
    }
}

describe("FDO_SDK", () => {
    let sdk: FDO_SDK;
    let mockLogger: jest.SpyInstance;
    let mockLoggerInfo: jest.SpyInstance;

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

        jest.mock("electron", () => ({
            shell: {
                openExternal: jest.fn(),
            },
        }));

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
    });

    test("should ensure render function is bound and modified to return JSON", () => {
        const mockSdk = new MockPlugin();

        // Check if the function is actually reassigned
        expect(mockSdk.render).not.toBe(MockPlugin.prototype.render);
    });

    test("should log initialization message", () => {
        expect(mockLogger).toHaveBeenCalledWith("FDO_SDK initialized!");
    });

    test("should throw error when init() is called", () => {
        expect(() => sdk.init()).toThrow("Method 'init' must be implemented by plugin.");
    });

    test("should log an error and throw when render() is called", () => {
        const logSpy = jest.spyOn(sdk["_logger"], "error"); // Spy on logger
        expect(() => sdk.render()).toThrow("Method 'render' must be implemented by plugin.");
        expect(logSpy).toHaveBeenCalledWith(expect.any(Error)); // Ensure logger was called
        expect(logSpy.mock.calls[0][0].message).toBe("Method 'render' must be implemented by plugin.");
    });

    test("should return JSON-stringify output when render is implemented", () => {
        const mockSdk = new MockPlugin();

        // Spy on the original render method
        const renderSpy = jest.spyOn(mockSdk, "render");

        // Call render and capture output
        const result = mockSdk.render();

        // Expected JSON output
        const expectedOutput = JSON.stringify(`<style>.test{"color": "green"}</style><h1>Hello from plugin!</h1>`);

        // Assertions
        expect(renderSpy).toHaveBeenCalled();
        expect(result).toBe(expectedOutput);
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

    test('renderOnLoad returns a function as string', () => {
        const result = sdk.renderOnLoad();

        expect(typeof result).toBe('string');
        expect(result).toContain('() =>'); // Optional, to verify it's a function
    });
});
