import { Logger } from "../src/Logger";
import * as winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";

vi.mock("winston", () => {
    const logMethods = {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn(),
    };

    const winstonMock = {
        createLogger: vi.fn(() => logMethods),
        format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
            prettyPrint: vi.fn(),
            errors: vi.fn(),
        },
        transports: {
            DailyRotateFile: vi.fn(),
        },
    };
    return {
        ...winstonMock,
        default: winstonMock,
    };
});

vi.mock("winston-daily-rotate-file", () => {
    const mocked = vi.fn().mockImplementation(function (this: unknown, options: unknown) {
        return options;
    });
    return {
        default: mocked,
    };
});

describe("Logger", () => {
    let logger: Logger;
    let winstonLoggerMock: any;
    let mkdirSyncSpy: vi.SpyInstance;
    const originalPlatform = process.platform;

    const setPlatform = (platform: string) => {
        Object.defineProperty(process, 'platform', {
            value: platform,
        });
    };

    beforeEach(() => {
        // Capture the mocked logger that Winston creates
        mkdirSyncSpy = vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as unknown as string);
        winstonLoggerMock = winston.createLogger();
        logger = new Logger();
    });

    afterEach(() => {
        delete process.env.LOG_LEVEL;
        delete process.env.FDO_SDK_LOG_ROOT;
        delete process.env.FDO_SDK_SESSION_ID;
        setPlatform(originalPlatform);
        vi.resetModules();
        vi.clearAllMocks();
    });

    it("should use LOG_LEVEL from environment", () => {
        process.env.LOG_LEVEL = 'debug';
        const logger = new Logger();
        expect(logger['logLevel']).toBe('debug');
    });

    it("should default to 'info' when LOG_LEVEL is not set", () => {
        const logger = new Logger();
        expect(logger['logLevel']).toBe('info');
    });

    it("should use Windows line ending", async () => {
        setPlatform('win32');
        const { Logger } = await import('../src/Logger'); // dynamic re-import
        const logger = new Logger();
        expect(logger['LINE_END']).toBe('\r\n');
    });

    it("should use Unix line ending", async () => {
        setPlatform('linux');
        const { Logger } = await import('../src/Logger');
        const logger = new Logger();
        expect(logger['LINE_END']).toBe('\n');
    });

    test("should log message", () => {
        logger.log("Test Info Message");
        expect(winstonLoggerMock.log).toHaveBeenCalledWith("info", "Test Info Message");
    });

    test("should log info messages", () => {
        logger.info("Test Info Message");
        expect(winstonLoggerMock.info).toHaveBeenCalledWith("Test Info Message");
    });

    test("should log error messages", () => {
        const error = new Error("Test Error");
        logger.error(error);
        expect(winstonLoggerMock.error).toHaveBeenCalledWith(error);
    });

    test("should log warnings", () => {
        logger.warn("Test Warning");
        expect(winstonLoggerMock.warn).toHaveBeenCalledWith("Test Warning");
    });

    test("should log debug messages", () => {
        logger.debug("Debug Message");
        expect(winstonLoggerMock.debug).toHaveBeenCalledWith("Debug Message");
    });

    test("should log verbose messages", () => {
        logger.verbose("Verbose Message");
        expect(winstonLoggerMock.verbose).toHaveBeenCalledWith("Verbose Message");
    });

    test("should log silly messages", () => {
        logger.silly("Silly Message");
        expect(winstonLoggerMock.silly).toHaveBeenCalledWith("Silly Message");
    });

    test("should derive log root from environment", () => {
        process.env.FDO_SDK_LOG_ROOT = "/tmp/fdo-sdk-logs";
        new Logger({ context: { pluginId: "test-plugin" } });

        expect(DailyRotateFile).toHaveBeenCalledWith(
            expect.objectContaining({
                dirname: "/tmp/fdo-sdk-logs",
            })
        );
    });

    test("should create the configured log directory eagerly", () => {
        process.env.FDO_SDK_LOG_ROOT = "/tmp/fdo-sdk-logs";

        new Logger({ context: { pluginId: "test-plugin" } });

        expect(mkdirSyncSpy).toHaveBeenCalledWith("/tmp/fdo-sdk-logs", { recursive: true });
    });

    test("should create child logger with merged context", () => {
        const parent = new Logger({
            logRoot: "/tmp/fdo-sdk-logs",
            context: { pluginId: "parent-plugin", component: "parent-component", sessionId: "parent-session" },
        });

        parent.withContext({ component: "child-component" });

        expect(DailyRotateFile).toHaveBeenCalledWith(
            expect.objectContaining({
                dirname: "/tmp/fdo-sdk-logs",
            })
        );
    });

    test("should expose the resolved log directory", () => {
        const fileLogger = new Logger({
            logRoot: "/tmp/fdo-sdk-logs",
            context: { pluginId: "test-plugin" },
        });

        expect(fileLogger.getLogDirectory()).toBe("/tmp/fdo-sdk-logs");
    });

    test("should write structured events and return correlation id", () => {
        const correlationId = logger.event("plugin.init.start", { source: "unit-test" });

        expect(typeof correlationId).toBe("string");
        expect(winstonLoggerMock.log).toHaveBeenCalledWith(
            "info",
            "plugin.init.start",
            expect.objectContaining({
                event: "plugin.init.start",
                source: "unit-test",
                correlationId,
            })
        );
    });

    test("should enable error stack serialization in the base logger format", () => {
        new Logger();

        expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
    });
});
