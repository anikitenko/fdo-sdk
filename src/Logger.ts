import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from "path";
const { combine, timestamp, json, errors, prettyPrint } = winston.format;

type LoggerContext = {
    pluginId?: string;
    component?: string;
    sessionId?: string;
};

type LoggerOptions = {
    logLevel?: string;
    logRoot?: string;
    context?: LoggerContext;
};

let correlationCounter = 0;

export class Logger {
    private readonly logger: winston.Logger;
    protected readonly logLevel: string;
    protected readonly IS_WIN: boolean = typeof process !== 'undefined' && process.platform === 'win32'
    protected readonly LINE_END: string = this.IS_WIN ? '\r\n' : '\n'
    protected readonly logRoot: string;
    protected readonly context: LoggerContext;

    constructor(options: LoggerOptions = {}) {
        this.logLevel = options.logLevel ?? process.env.LOG_LEVEL ?? 'info';
        this.logRoot = options.logRoot ?? process.env.FDO_SDK_LOG_ROOT ?? path.resolve(process.cwd(), "logs");
        this.context = {
            pluginId: options.context?.pluginId,
            component: options.context?.component ?? "sdk",
            sessionId: options.context?.sessionId ?? process.env.FDO_SDK_SESSION_ID ?? Logger.createCorrelationId("session"),
        };

        const pluginScope = this.sanitizePathSegment(this.context.pluginId ?? "global");
        const logDir = path.join(this.logRoot, pluginScope);
        this.logger = winston.createLogger({
            level: this.logLevel,
            defaultMeta: {
                pluginId: this.context.pluginId ?? "unknown-plugin",
                component: this.context.component ?? "sdk",
                sessionId: this.context.sessionId,
            },
            format: combine(
                timestamp(),
                json(),
                prettyPrint()
            ),
            transports: [
                new DailyRotateFile({
                    level: 'error',
                    dirname: logDir,
                    filename: 'error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '1m',
                    maxFiles: '7d',
                    eol: this.LINE_END,
                    format: combine(errors({ stack: true }), timestamp(), json(), prettyPrint()),
                }),
                new DailyRotateFile({
                    level: 'info',
                    dirname: logDir,
                    filename: 'info-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '1m',
                    maxFiles: '7d',
                    eol: this.LINE_END,
                }),
            ],
        });
    }

    public log(message: string, level: string = this.logLevel) {
        this.logger.log(level, message)
    }

    public info(message: string, ...meta: unknown[]) {
        this.logger.info(message, ...meta)
    }

    public error(error: Error) {
        this.logger.error(error)
    }

    public warn(message: string, ...meta: unknown[]) {
        this.logger.warn(message, ...meta)
    }

    public debug(message: string, ...meta: unknown[]) {
        this.logger.debug(message, ...meta)
    }

    public verbose(message: string, ...meta: unknown[]) {
        this.logger.verbose(message, ...meta)
    }

    public silly(message: string, ...meta: unknown[]) {
        this.logger.silly(message, ...meta)
    }

    public withContext(context: Partial<LoggerContext>): Logger {
        return new Logger({
            logLevel: this.logLevel,
            logRoot: this.logRoot,
            context: {
                ...this.context,
                ...context,
            },
        });
    }

    public event(
        name: string,
        payload: Record<string, unknown> = {},
        options: { level?: string; correlationId?: string } = {}
    ): string {
        const correlationId = options.correlationId ?? Logger.createCorrelationId(name);
        this.logger.log(options.level ?? "info", name, {
            event: name,
            correlationId,
            ...payload,
        });
        return correlationId;
    }

    public static createCorrelationId(prefix: string = "event"): string {
        correlationCounter += 1;
        return `${prefix}-${Date.now()}-${correlationCounter}`;
    }

    private sanitizePathSegment(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "") || "global";
    }
}

export default Logger
