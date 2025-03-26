import { Logger } from "../src/Logger";
import * as winston from "winston";

jest.mock("winston", () => {
    const logMethods = {
        log: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        silly: jest.fn(),
    };

    return {
        createLogger: jest.fn(() => logMethods),
        format: {
            combine: jest.fn(),
            timestamp: jest.fn(),
            json: jest.fn(),
            prettyPrint: jest.fn(),
            errors: jest.fn(),
        },
        transports: {
            DailyRotateFile: jest.fn(),
        },
    };
});

describe("Logger", () => {
    let logger: Logger;
    let winstonLoggerMock: any;
    const originalPlatform = process.platform;

    const setPlatform = (platform: string) => {
        Object.defineProperty(process, 'platform', {
            value: platform,
        });
    };

    beforeEach(() => {
        // Capture the mocked logger that Winston creates
        winstonLoggerMock = winston.createLogger();
        logger = new Logger();
    });

    afterEach(() => {
        delete process.env.LOG_LEVEL;
        setPlatform(originalPlatform);
        jest.resetModules();
        jest.clearAllMocks();
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
});
