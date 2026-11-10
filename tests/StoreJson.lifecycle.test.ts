import fs from 'fs';
import os from 'os';
import path from 'path';
import {createJsonStore, getJsonStorageDiagnostics, type JsonStore} from '../src/StoreJson';
import {atomicWriteFile} from '../src';
vi.mock('../src/utils/atomic', () => ({atomicWriteFile: vi.fn().mockResolvedValue(undefined)}));

function gate() {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return {promise, resolve};
}

describe('JSON storage backpressure and ownership', () => {
    let directory: string;
    let store: JsonStore;
    const logger = {warn: vi.fn()} as any;
    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fdo-store-'));
        vi.mocked(atomicWriteFile).mockReset().mockResolvedValue(undefined);
        store = createJsonStore({filePath: path.join(directory, 'store.json'), logger});
    });
    afterEach(async () => {
        await store.dispose!().catch(() => {});
        fs.rmSync(directory, {recursive: true, force: true});
    });

    it('coalesces bursts while retaining only one running and one pending write', async () => {
        const blocked = gate();
        vi.mocked(atomicWriteFile).mockImplementationOnce(() => blocked.promise);
        store.set('value', 0);
        await vi.waitFor(() => expect(atomicWriteFile).toHaveBeenCalledTimes(1));
        for (let i = 1; i <= 10000; i++) store.set('value', i);
        expect(store.getWriteDiagnostics().pendingWrites).toBe(2);
        expect(atomicWriteFile).toHaveBeenCalledTimes(1);
        const flushed = store.flush!();
        blocked.resolve();
        await flushed;
        expect(atomicWriteFile).toHaveBeenCalledTimes(2);
        expect(JSON.parse(vi.mocked(atomicWriteFile).mock.calls[1][1] as string)).toEqual({value: 10000});
        expect(store.getWriteDiagnostics().pendingWrites).toBe(0);
    });

    it('preserves a flush outcome when a later snapshot succeeds after failure', async () => {
        const first = gate();
        vi.mocked(atomicWriteFile).mockImplementationOnce(async () => { await first.promise; throw new Error('disk full'); });
        store.set('first', 1);
        await vi.waitFor(() => expect(atomicWriteFile).toHaveBeenCalledTimes(1));
        const barrier = expect(store.flush!()).rejects.toThrow('JSON storage write failed');
        store.set('second', 2);
        first.resolve();
        await barrier;
        await expect(store.flush!()).resolves.toBeUndefined();
        expect(store.getWriteDiagnostics().writeFailures).toBe(1);
    });

    it('does not let a later failure invalidate an already completed flush', async () => {
        const first = gate();
        const second = gate();
        vi.mocked(atomicWriteFile).mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(async () => { await second.promise; throw new Error('disk full'); });
        store.set('first', 1);
        await vi.waitFor(() => expect(atomicWriteFile).toHaveBeenCalledTimes(1));
        const barrier = store.flush!();
        store.set('second', 2);
        first.resolve();
        await expect(barrier).resolves.toBeUndefined();
        const failed = expect(store.flush!()).rejects.toThrow('JSON storage write failed');
        second.resolve();
        await failed;
    });

    it('rejects mutations and duplicate owners while disposal drains, then allows reopening', async () => {
        const blocked = gate();
        vi.mocked(atomicWriteFile).mockImplementationOnce(() => blocked.promise);
        store.set('value', 1);
        const closing = store.dispose!();
        expect(store.dispose!()).toBe(closing);
        expect(() => store.set('value', 2)).toThrow('disposed');
        expect(() => store.remove('value')).toThrow('disposed');
        expect(() => store.clear()).toThrow('disposed');
        expect(store.get('value')).toBe(1);
        expect(() => createJsonStore({filePath: store._filePath, logger})).toThrow('already owns');
        blocked.resolve();
        await closing;
        store = createJsonStore({filePath: store._filePath, logger});
        store.set('reopened', true);
        await store.flush!();
    });

    it('gates mutations before a host flush while allowing the final drain', async () => {
        store.set('value', 1);
        store.beginShutdown!();
        expect(() => store.set('value', 2)).toThrow('disposed');
        await expect(store.flush!()).resolves.toBeUndefined();
        await store.dispose!();
    });

    it('resolves symlink and relative aliases to one owner', () => {
        const alias = path.join(directory, 'alias');
        fs.symlinkSync(directory, alias, 'dir');
        expect(() => createJsonStore({filePath: path.join(alias, 'store.json'), logger})).toThrow('already owns');
        expect(() => createJsonStore({filePath: path.join(directory, 'nested', '..', 'store.json'), logger})).toThrow('already owns');
    });

    it('releases ownership after failed disposal and exposes failure counters', async () => {
        vi.mocked(atomicWriteFile).mockRejectedValueOnce(Object.assign(new Error('disk full'), {code: 'ENOSPC'}));
        store.set('value', 1);
        await expect(store.dispose!()).rejects.toThrow('JSON storage write failed');
        expect(getJsonStorageDiagnostics()).toMatchObject({lastFailureCode: 'ENOSPC'});
        store = createJsonStore({filePath: store._filePath, logger});
    });
});
