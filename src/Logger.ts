import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
const { combine, timestamp, json, errors, prettyPrint } = winston.format;

export class Logger {
    private readonly logger: winston.Logger;
    protected readonly logLevel: string = process.env.LOG_LEVEL ?? 'info'
    protected readonly IS_WIN: boolean = typeof process !== 'undefined' && process.platform === 'win32'
    protected readonly LINE_END: string = this.IS_WIN ? '\r\n' : '\n'

    constructor() {
        this.logger = winston.createLogger({
            level: this.logLevel,
            format: combine(
                timestamp(),
                json(),
                prettyPrint()
            ),
            transports: [
                new DailyRotateFile({
                    level: 'error',
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

    public info(message: string, ...meta: any[]) {
        this.logger.info(message, ...meta)
    }

    public error(error: Error) {
        this.logger.error(error)
    }

    public warn(message: string, ...meta: any[]) {
        this.logger.warn(message, ...meta)
    }

    public debug(message: string, ...meta: any[]) {
        this.logger.debug(message, ...meta)
    }

    public verbose(message: string, ...meta: any[]) {
        this.logger.verbose(message, ...meta)
    }

    public silly(message: string, ...meta: any[]) {
        this.logger.silly(message, ...meta)
    }
}

export default Logger
