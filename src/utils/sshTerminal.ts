import type { HostServicesConfiguration, SSHTerminalOptions, SSHTerminalOpenOptions, SSHTerminalSession,
    SSHTerminalResult, SSHCancelResult } from '../types';
import { HostServiceError } from './hostServices';
import { onCapabilityChange } from './capabilities';

const CHUNK = 32768, INPUT = 65536, OPERATIONS = 32;
function fail(code: ConstructorParameters<typeof HostServiceError>[0]): never { throw new HostServiceError(code); }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const positive = (v: number, max: number) => Number.isSafeInteger(v) && v > 0 && v <= max;
function dimensions(rows: number, columns: number) {
    if (!positive(rows, 1000) || !positive(columns, 1000)) fail('INVALID_REQUEST');
}
function normalize(o: SSHTerminalOptions): SSHTerminalOpenOptions {
    if (!record(o) || typeof o.profileId !== 'string' || !o.profileId.trim()) fail('INVALID_REQUEST');
    const term = o.term ?? 'xterm-256color', rows = o.rows ?? 24, columns = o.columns ?? 80;
    if (typeof term !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9+._-]{0,63}$/.test(term)) fail('INVALID_REQUEST');
    dimensions(rows, columns);
    const idleTimeoutMs = o.idleTimeoutMs ?? 300000, sessionTimeoutMs = o.sessionTimeoutMs ?? 3600000;
    if (!positive(idleTimeoutMs, 3600000) || !positive(sessionTimeoutMs, 86400000)) fail('INVALID_REQUEST');
    if (o.x11 !== undefined && (!record(o.x11) || !['trusted', 'untrusted'].includes(o.x11.mode))) fail('INVALID_REQUEST');
    return { profileId: o.profileId, term, rows, columns, idleTimeoutMs, sessionTimeoutMs,
        ...(o.x11 ? { x11: { mode: o.x11.mode } } : {}) };
}

/** No prefetch or unbounded SDK queue. Host must implement byte credits and bounded channel windows. */
export async function openTerminal(options: SSHTerminalOptions, signal: AbortSignal | undefined,
    adapter: HostServicesConfiguration['openSSHTerminal'], check: () => void,
    resources: Set<() => void>, safe: (error: unknown) => HostServiceError): Promise<SSHTerminalSession> {
    const payload = normalize(options);
    if (!adapter) fail('UNAVAILABLE');
    if (signal?.aborted) fail('CANCELLED');
    let stop!: (result: SSHTerminalResult) => void;
    let stopped = false, inputEnded = false, settled = false;
    let wakeOutput: (() => void) | undefined;
    const localEnd = new Promise<SSHTerminalResult>(resolve => { stop = value => { stopped = true; resolve(value); wakeOutput?.(); }; });
    const closed: SSHTerminalResult = { reason: 'closed', exitCode: null, signal: null, remoteProcessStopped: null };
    const cancelled: SSHTerminalResult = { ...closed, reason: 'cancelled' };
    const abortPending = () => stop(cancelled);
    signal?.addEventListener('abort', abortPending, { once: true });
    let host: Awaited<ReturnType<NonNullable<typeof adapter>>>;
    const opening = Promise.resolve().then(() => { if (stopped) fail('CANCELLED'); check(); return adapter!(payload); });
    // A lost start acknowledgement is never retried. Clean up a late successful open once.
    let lateClosed = false;
    const closeLate = (value: Awaited<typeof opening>) => {
        if (lateClosed) return;
        lateClosed = true;
        try { void Promise.resolve(value.result).catch(() => {}); } catch {}
        try { void Promise.resolve(value.close()).catch(() => {}); } catch {}
    };
    void opening.then(value => { if (stopped) closeLate(value); }, () => {});
    try {
        host = await Promise.race([opening, localEnd.then(() => fail('CANCELLED'))]);
        check();
    } catch (error) {
        stopped = true;
        signal?.removeEventListener('abort', abortPending);
        void opening.then(closeLate, () => {});
        throw safe(error);
    }
    signal?.removeEventListener('abort', abortPending);
    let iterator: AsyncIterator<unknown> | undefined;
    let closePromise: Promise<void> | undefined, cancelPromise: Promise<SSHCancelResult> | undefined;
    const close = (): Promise<void> => {
        if (!closePromise) {
            stop(closed);
            try { void Promise.resolve(iterator?.return?.()).catch(() => {}); } catch {}
            unsubscribe();
            resources.delete(cleanup);
            signal?.removeEventListener('abort', abort);
            closePromise = Promise.resolve().then(() => host.close()).catch(e => { throw safe(e); });
        }
        return closePromise;
    };
    let unsubscribe = () => {};
    const cleanup = () => { unsubscribe(); void close().catch(() => {}); };
    const abort = () => { stop(cancelled); void cancel().catch(() => {}); cleanup(); };
    resources.add(cleanup);
    unsubscribe = onCapabilityChange(() => { try { check(); } catch { cleanup(); } });
    const resultHost = Promise.resolve(host?.result).then(value => {
        check();
        if (!record(value) || !['exited', 'closed', 'cancelled'].includes(value.reason as string)
            || !(value.exitCode === null || Number.isSafeInteger(value.exitCode))
            || !(value.signal === null || typeof value.signal === 'string' && value.signal.length <= 64)
            || !(value.remoteProcessStopped === null || typeof value.remoteProcessStopped === 'boolean')
            || (value.reason === 'exited' && value.exitCode === null && value.signal === null)
            || (value.reason === 'closed' && (value.exitCode !== null || value.signal !== null || value.remoteProcessStopped !== null))) fail('INVALID_REQUEST');
        return { reason: value.reason, exitCode: value.exitCode, signal: value.signal,
            remoteProcessStopped: value.remoteProcessStopped } as SSHTerminalResult;
    }, e => { throw safe(e); });
    const result = Promise.race([resultHost, localEnd]);
    void result.then(() => { settled = true; }, cleanup);
    // Attach rejection handling immediately, even when callers consume output first.
    void result.catch(() => {});
    try {
        if (!host || ['write', 'resize', 'endInput', 'close', 'cancel'].some(k => typeof host[k as 'write' | 'resize' | 'endInput' | 'close' | 'cancel'] !== 'function')
            || !host.result || typeof host.result.then !== 'function'
            || typeof host.output?.[Symbol.asyncIterator] !== 'function') fail('INVALID_REQUEST');
        iterator = host.output[Symbol.asyncIterator]();
        if (typeof iterator.next !== 'function') fail('INVALID_REQUEST');
        check();
    } catch (e) { cleanup(); throw safe(e); }
    const live = () => {
        try { check(); } catch(e) { cleanup(); throw safe(e); }
        if (stopped || settled) fail('SESSION_CLOSED');
    };
    // Admit before copying. At most 64 KiB / 32 queued operations, ordered across write/resize/EOF.
    let pendingBytes = 0, pending = 0, tail: Promise<void> = Promise.resolve();
    const enqueue = (bytes: number, task: () => Promise<void>): Promise<void> => {
        live();
        if (pending >= OPERATIONS || pendingBytes + bytes > INPUT) fail('BACKPRESSURE');
        pending++; pendingBytes += bytes;
        const operation = tail.then(() => { live(); return task(); }).then(() => check()).catch(e => { cleanup(); throw safe(e); });
        tail = operation.catch(() => {});
        return operation.finally(() => { pending--; pendingBytes -= bytes; });
    };
    const cancel = (): Promise<SSHCancelResult> => {
        check();
        return cancelPromise ??= Promise.resolve().then(() => host.cancel()).then(value => {
            check();
            if (!record(value) || !(value.remoteProcessStopped === null || typeof value.remoteProcessStopped === 'boolean')) fail('INVALID_REQUEST');
            if (!settled) stop(cancelled);
            return { remoteProcessStopped: value.remoteProcessStopped as boolean | null };
        }).catch(e => { throw safe(e); }).finally(cleanup);
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let consumed = false, sequence = 0;
    return {
        result, close, cancel,
        async write(data) {
            live();
            if (inputEnded) fail('SESSION_CLOSED');
            if (!(typeof data === 'string' || data instanceof Uint8Array)) fail('INVALID_REQUEST');
            const size = typeof data === 'string' ? Buffer.byteLength(data, 'utf8') : data.byteLength;
            if (size > CHUNK) fail('BACKPRESSURE');
            // Admission happens synchronously before the task captures the bounded copy.
            let copy: Uint8Array;
            const operation = enqueue(size, () => host.write(copy));
            copy = typeof data === 'string' ? new Uint8Array(Buffer.from(data, 'utf8')) : new Uint8Array(data);
            await operation;
        },
        async resize(rows, columns) { dimensions(rows, columns); await enqueue(0, () => host.resize(rows, columns)); },
        async endInput() {
            if (inputEnded) return;
            const operation = enqueue(0, () => host.endInput());
            inputEnded = true;
            await operation;
        },
        output: {
            [Symbol.asyncIterator]() {
                if (consumed) fail('INVALID_REQUEST');
                consumed = true;
                let reading = false;
                return {
                    async next() {
                        if (reading) fail('BACKPRESSURE');
                        if (stopped) return { done: true as const, value: undefined };
                        reading = true;
                        try {
                            check();
                            // A removable wakeup avoids retaining one localEnd.then handler per packet
                            // for the entire lifetime of a long-running terminal.
                            const next = await new Promise<IteratorResult<unknown>>((resolve, reject) => {
                                const wake = () => { if (wakeOutput === wake) wakeOutput = undefined; resolve({done: true, value: undefined}); };
                                wakeOutput = wake;
                                Promise.resolve().then(() => stopped ? {done: true, value: undefined} : iterator!.next()).then(value => {
                                    if (wakeOutput === wake) wakeOutput = undefined;
                                    resolve(value);
                                }, error => {
                                    if (wakeOutput === wake) wakeOutput = undefined;
                                    reject(error);
                                });
                            });
                            check();
                            if (next.done) { await result; cleanup(); return { done: true as const, value: undefined }; }
                            const v = next.value;
                            if (!record(v) || v.sequence !== sequence || !(v.data instanceof Uint8Array)
                                || !v.data.byteLength || v.data.byteLength > CHUNK) fail('INVALID_REQUEST');
                            return { done: false as const, value: { sequence: sequence++, data: new Uint8Array(v.data) } };
                        } catch (e) { cleanup(); throw safe(e); }
                        finally { reading = false; }
                    },
                    async return() { cleanup(); return { done: true as const, value: undefined }; },
                };
            },
        },
    };
}
