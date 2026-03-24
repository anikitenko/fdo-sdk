import {FDO_SDK} from "../src";
import { PluginRegistry } from "../src/PluginRegistry";
import { Logger } from "../src/Logger";

class MockPlugin extends FDO_SDK {
    public render(): string {
        return `<style>.test{"color": "green"}</style><h1>Hello from plugin!</h1>`
    }
}

class AsyncRejectRenderPlugin extends FDO_SDK {
    public render(): any {
        return Promise.reject(new Error("async-render-failure"));
    }
}

class AsyncRejectRenderOnLoadPlugin extends FDO_SDK {
    public render(): string {
        return "<div>ok</div>";
    }

    public renderOnLoad(): any {
        return Promise.reject(new Error("async-onload-failure"));
    }
}

describe("FDO_SDK", () => {
    let sdk: FDO_SDK;
    let mockLogger: jest.SpyInstance;
    let mockLoggerInfo: jest.SpyInstance;
    let mockLoggerWarn: jest.SpyInstance;
    let mockLoggerDebug: jest.SpyInstance;
    let mockLoggerVerbose: jest.SpyInstance;
    let mockLoggerSilly: jest.SpyInstance;
    let mockLoggerEvent: jest.SpyInstance;

    beforeEach(() => {
        // Mock process.parentPort to prevent errors
        (global as any).process.parentPort = {
            on: jest.fn(),
            postMessage: jest.fn(),
        };

        // Mock Logger methods
        mockLogger = jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
        mockLoggerInfo = jest.spyOn(Logger.prototype, "info").mockImplementation(() => {});
        mockLoggerWarn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
        mockLoggerDebug = jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});
        mockLoggerVerbose = jest.spyOn(Logger.prototype, "verbose").mockImplementation(() => {});
        mockLoggerSilly = jest.spyOn(Logger.prototype, "silly").mockImplementation(() => {});
        mockLoggerEvent = jest.spyOn(Logger.prototype, "event").mockImplementation(() => "mock-correlation-id");
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

    test("should keep render implementation on the plugin instance", () => {
        const mockSdk = new MockPlugin();

        expect(mockSdk.render).toBe(MockPlugin.prototype.render);
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

    test("should return raw render output when render is implemented", () => {
        const mockSdk = new MockPlugin();

        const renderSpy = jest.spyOn(mockSdk, "render");
        const result = mockSdk.render();

        expect(renderSpy).toHaveBeenCalled();
        expect(result).toBe(`<style>.test{"color": "green"}</style><h1>Hello from plugin!</h1>`);
    });

    test("should serialize render output explicitly", () => {
        const mockSdk = new MockPlugin();

        expect(mockSdk.serializeRender()).toBe(
            JSON.stringify(`<style>.test{"color": "green"}</style><h1>Hello from plugin!</h1>`)
        );
    });

    test("should serialize renderOnLoad output explicitly", () => {
        expect(sdk.serializeRenderOnLoad()).toBe(JSON.stringify('() => {}'));
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

    test("should log info messages using info()", () => {
        sdk.info("Info message", { a: 1 });
        expect(mockLoggerInfo).toHaveBeenCalledWith("Info message", { a: 1 });
    });

    test("should log warnings using warn()", () => {
        sdk.warn("Warn message", { b: 2 });
        expect(mockLoggerWarn).toHaveBeenCalledWith("Warn message", { b: 2 });
    });

    test("should log debug messages using debug()", () => {
        sdk.debug("Debug message", { c: 3 });
        expect(mockLoggerDebug).toHaveBeenCalledWith("Debug message", { c: 3 });
    });

    test("should log verbose messages using verbose()", () => {
        sdk.verbose("Verbose message", { d: 4 });
        expect(mockLoggerVerbose).toHaveBeenCalledWith("Verbose message", { d: 4 });
    });

    test("should log silly messages using silly()", () => {
        sdk.silly("Silly message", { e: 5 });
        expect(mockLoggerSilly).toHaveBeenCalledWith("Silly message", { e: 5 });
    });

    test("should emit structured events using event()", () => {
        const correlationId = sdk.event("plugin.custom.event", { value: 1 });
        expect(correlationId).toBe("mock-correlation-id");
        expect(mockLoggerEvent).toHaveBeenCalledWith("plugin.custom.event", { value: 1 });
    });

    test('renderOnLoad returns a function as string', () => {
        const result = sdk.renderOnLoad();

        expect(typeof result).toBe('string');
        expect(result).toContain('() =>'); // Optional, to verify it's a function
    });

    test("should reject async render promises at serialization boundary", async () => {
        const asyncPlugin = new AsyncRejectRenderPlugin();
        const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

        expect(() => asyncPlugin.serializeRender()).toThrow(
            "Method 'render' must return a synchronous string. Async render promises are not supported."
        );

        await Promise.resolve();
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "async-render-failure" }));
    });

    test("should reject async renderOnLoad promises at serialization boundary", async () => {
        const asyncPlugin = new AsyncRejectRenderOnLoadPlugin();
        const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

        expect(() => asyncPlugin.serializeRenderOnLoad()).toThrow(
            "Method 'renderOnLoad' must return a synchronous string. Async on-load promises are not supported."
        );

        await Promise.resolve();
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "async-onload-failure" }));
    });
});
