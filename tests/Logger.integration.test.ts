import fs from 'fs';
import os from 'os';
import path from 'path';
import winston from 'winston';
import { Logger } from '../src/Logger';

describe('Logger resource lifecycle (real Winston transports)', () => {
    let directory: string;
    let logger: Logger | undefined;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fdo-logger-'));
    });

    afterEach(async () => {
        logger?.close();
        vi.restoreAllMocks();
        await fs.promises.rm(directory, { recursive: true, force: true });
    });

    it('keeps file handles bounded through repeated context refreshes and releases them on close', async () => {
        const streams: fs.WriteStream[] = [];
        const createStream = fs.createWriteStream.bind(fs);
        vi.spyOn(fs, 'createWriteStream').mockImplementation((...args) => {
            const stream = createStream(...args);
            streams.push(stream);
            return stream;
        });
        logger = new Logger({ logRoot: directory, context: { pluginId: 'parent' } });
        let context = logger;
        for (let i = 0; i < 20000; i++) {
            context = context.withContext({ pluginId: `plugin-${i}`, component: 'handler' });
            context.info(`request-${i}`);
        }
        context.error(new Error('stack-preserved'));
        // Size rotation may create more streams; context refreshes must not.
        expect(streams.length).toBeLessThan(10);
        await vi.waitFor(() => {
            const content = fs.readdirSync(directory)
                .filter(name => name.startsWith('info-'))
                .map(name => fs.readFileSync(path.join(directory, name), 'utf8')).join('');
            expect(content).toContain('plugin-19999');
            expect(content).toContain('handler');
            expect(content).toContain('stack-preserved');
            expect(content).toContain('Logger.integration.test.ts');
        });
        await vi.waitFor(() => expect(streams.filter(stream => !stream.closed)).toHaveLength(2));
        expect(fs.readdirSync(directory).some(name => /^info-.*\.log\.1$/.test(name))).toBe(true);
        context.close();
        logger.close(); // Shared lifecycle is idempotent.
        await vi.waitFor(() => expect(streams.every(stream => stream.closed)).toBe(true));
        expect(() => context.info('after close')).not.toThrow();
    });

    it.each([1, 3])('survives asynchronous EMFILE on stream %i (initial open or size rotation)', async (failureAt) => {
        const createStream = fs.createWriteStream.bind(fs);
        const streams: fs.WriteStream[] = [];
        vi.spyOn(fs, 'createWriteStream').mockImplementation((...args) => {
            const stream = createStream(...args);
            streams.push(stream);
            if (streams.length === failureAt) {
                queueMicrotask(() => stream.destroy(Object.assign(new Error('too many open files'), { code: 'EMFILE' })));
            }
            return stream;
        });
        const warning = vi.spyOn(console, 'error').mockImplementation(() => {});
        const stderr = vi.spyOn(winston.transports.Console.prototype, 'log').mockImplementation((_info, callback) => callback());
        logger = new Logger({ logRoot: directory });
        if (failureAt === 3) {
            for (let i = 0; streams.length < 3 && i < 1000; i++) {
                logger.info('rotation pressure ' + 'x'.repeat(4096));
            }
            expect(streams).toHaveLength(3);
        }
        await vi.waitFor(() => expect(warning).toHaveBeenCalledTimes(1));
        logger.withContext({ pluginId: 'still-running' }).info('fallback message');
        expect(JSON.stringify(stderr.mock.calls)).toContain('fallback message');
        expect(JSON.stringify(stderr.mock.calls)).toContain('still-running');
        await vi.waitFor(() => expect(streams.every(stream => stream.closed)).toBe(true));
    });

    it('falls back when the log directory cannot be created', () => {
        const file = path.join(directory, 'file');
        fs.writeFileSync(file, 'not a directory');
        const warning = vi.spyOn(console, 'error').mockImplementation(() => {});
        const stderr = vi.spyOn(winston.transports.Console.prototype, 'log').mockImplementation((_info, callback) => callback());
        logger = new Logger({ logRoot: path.join(file, 'logs') });
        logger.warn('still operational');
        expect(warning).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(stderr.mock.calls)).toContain('still operational');
    });
});
