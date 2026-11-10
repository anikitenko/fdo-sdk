import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from "path";
import fs from "fs";
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
const loggingDiagnostics = { activeFamilies: 0, stderrFallbacks: 0, fileFailures: 0, lastFailureCode: undefined as string | undefined };


export class Logger {
    private readonly logger: winston.Logger;
    private readonly backend: { logger: winston.Logger; closed: boolean; state: { failed: boolean; closed: boolean } };
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

        const logDir = Logger.resolveLogDirectory(this.logRoot);
        // A context view must never own file streams: contexts are refreshed on
        // every render/handler call in PluginRegistry.
        const fallback = new winston.transports.Console({
            silent: true,
            stderrLevels: Object.keys(winston.config.npm.levels),
        });
        const files: DailyRotateFile[] = [];
        let failed = false;
        const state = { failed: false, closed: false };
        const failover = (error: Error) => {
            if (failed || state.closed) return;
            failed = true;
            state.failed = true;
            loggingDiagnostics.stderrFallbacks++;
            loggingDiagnostics.fileFailures++;
            loggingDiagnostics.lastFailureCode = (error as NodeJS.ErrnoException).code;
            fallback.silent = false;
            for (const file of files) {
                file.silent = true;
                try { file.close?.(); } catch { /* Keep logging failures isolated. */ }
            }
            // Never report a file-logging failure through the failed file sink.
            console.error("[FDO SDK] File logging unavailable; using stderr until restart.", error);
        };
        try {
            fs.mkdirSync(logDir, { recursive: true });
            for (const level of ['error', 'info']) {
                const file = new DailyRotateFile({
                    level,
                    dirname: logDir,
                    filename: `${level}-%DATE%.log`,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '1m',
                    maxFiles: '7d',
                    eol: this.LINE_END,
                });
                files.push(file);
                file.on('error', failover);
                // daily-rotate-file does not forward the rotator's stream errors
                // (including asynchronous open/rotation EMFILE) to its transport.
                file.logStream.on('error', failover);
            }
        } catch (error) {
            failover(error instanceof Error ? error : new Error(String(error)));
        }
        const root = winston.createLogger({
            level: this.logLevel,
            format: combine(errors({ stack: true }), timestamp(), json(), prettyPrint()),
            transports: [...files, fallback],
        });
        root.on('error', failover);
        this.backend = { logger: root, closed: false, state };
        loggingDiagnostics.activeFamilies++;
        this.logger = root.child(this.getMetadata());
    }

    private getMetadata(): Record<string, unknown> {
        return {
            pluginId: this.context.pluginId ?? "unknown-plugin",
            component: this.context.component ?? "sdk",
            sessionId: this.context.sessionId,
        };
    }

    /** Release this logger family's transports. Context views share this lifecycle. */
    public close(): void {
        if (this.backend.closed) return;
        this.backend.closed = true;
        this.backend.state.closed = true;
        loggingDiagnostics.activeFamilies--;
        if (this.backend.state.failed) loggingDiagnostics.stderrFallbacks--;
        this.backend.logger.close();
    }

    public log(message: string, level: string = this.logLevel) {
        if (!this.backend.closed) this.logger.log(level, message)
    }

    public info(message: string, ...meta: unknown[]) {
        if (!this.backend.closed) this.logger.info(message, ...meta)
    }

    public error(error: Error) {
        if (!this.backend.closed) this.logger.error(error)
    }

    public warn(message: string, ...meta: unknown[]) {
        if (!this.backend.closed) this.logger.warn(message, ...meta)
    }

    public debug(message: string, ...meta: unknown[]) {
        if (!this.backend.closed) this.logger.debug(message, ...meta)
    }

    public verbose(message: string, ...meta: unknown[]) {
        if (!this.backend.closed) this.logger.verbose(message, ...meta)
    }

    public silly(message: string, ...meta: unknown[]) {
        if (!this.backend.closed) this.logger.silly(message, ...meta)
    }

    public withContext(context: Partial<LoggerContext>): Logger {
        const child: Logger = Object.assign(Object.create(Logger.prototype), {
            logLevel: this.logLevel,
            logRoot: this.logRoot,
            IS_WIN: this.IS_WIN,
            LINE_END: this.LINE_END,
            context: { ...this.context, ...context },
            backend: this.backend,
        });
        Object.defineProperty(child, 'logger', {
            value: this.backend.logger.child(child.getMetadata()),
        });
        return child;
    }

    public event(
        name: string,
        payload: Record<string, unknown> = {},
        options: { level?: string; correlationId?: string } = {}
    ): string {
        const correlationId = options.correlationId ?? Logger.createCorrelationId(name);
        if (!this.backend.closed) this.logger.log(options.level ?? "info", name, {
            event: name,
            correlationId,
            ...payload,
        });
        return correlationId;
    }

    public getLogDirectory(): string {
        return Logger.resolveLogDirectory(this.logRoot);
    }

    public static getDiagnostics() {
        return { ...loggingDiagnostics };
    }

    public static createCorrelationId(prefix: string = "event"): string {
        correlationCounter += 1;
        return `${prefix}-${Date.now()}-${correlationCounter}`;
    }

    public static resolveLogDirectory(logRoot: string): string {
        return path.resolve(logRoot);
    }
}

export default Logger
