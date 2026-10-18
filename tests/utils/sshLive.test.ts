import { PluginRegistry, SSHClient, createSSHCapabilityBundle, runCapabilityPreflight, validatePluginInitPayload } from '../../src';
import type { HostServicesConfiguration } from '../../src';
import { resetCapabilityStateForTests } from '../../src/utils/capabilities';

const ssh = new SSHClient();
const options = { profileId: 'vm', command: 'uptime' };
const completed = { stdout: 'ok', stderr: '', exitCode: 0, signal: null, durationMs: 1, truncated: false };
async function* values(...items: unknown[]) { yield* items; }
function setup(adapters: Partial<HostServicesConfiguration> = {}) {
    PluginRegistry.configureCapabilities({ granted: createSSHCapabilityBundle({ monitorStatus: true }) });
    PluginRegistry.configureHostServices({ request: vi.fn(), ...adapters });
}
beforeEach(() => { resetCapabilityStateForTests(); setup(); });
afterEach(() => { PluginRegistry.configureHostServices(null); resetCapabilityStateForTests(); vi.unstubAllGlobals(); });

test('old hosts reject live APIs without running a buffered command', async () => {
    await expect(ssh.start(options)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await expect(ssh.watchStatus('vm').next()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
});

test('monitoring has a separate grant and secret consumption prerequisites', async () => {
    const watchSSHStatus = vi.fn();
    setup({ watchSSHStatus });
    PluginRegistry.configureCapabilities({ granted: createSSHCapabilityBundle() });
    await expect(ssh.watchStatus('vm').next()).rejects.toThrow('ssh.status.watch');
    expect(watchSSHStatus).not.toHaveBeenCalled();
    expect(runCapabilityPreflight({ declared: ['ssh.status.watch'], granted: [] }).missing[0].requiredCapabilities)
        .toEqual(['secrets.consume', 'secrets.use', 'ssh.status.watch', 'ssh.use']);
    expect(() => validatePluginInitPayload({ capabilities: ['ssh.status.watch'] })).not.toThrow();
});

test('status projection includes freshness and iterator return unsubscribes', async () => {
    const close = vi.fn();
    const status = { profileId: 'vm', state: 'connected', checkedAt: '2026-10-18T00:00:00Z', staleAfterMs: 5000 };
    setup({ watchSSHStatus: async () => (async function* () { try { yield { ...status, password: 'SECRET' }; } finally { close(); } })() });
    const monitor = ssh.watchStatus('vm');
    try {
        expect(await monitor.next()).toEqual({ value: status, done: false });
    } finally {
        await monitor.return();
    }
    expect(close).toHaveBeenCalledOnce();
});

test.each([
    { profileId: 'other' }, { state: 'ready' }, { checkedAt: null }, { staleAfterMs: 0 }, { checkedAt: 'SECRET' },
])('rejects malformed status %j', async invalid => {
    setup({ watchSSHStatus: async () => values({ profileId: 'vm', state: 'connected', checkedAt: '2026-10-18', staleAfterMs: 1, ...invalid }) });
    await expect(ssh.watchStatus('vm').next()).rejects.toThrow('Invalid host service response');
});

test('output arrives while execution is pending; cancel is scoped, sanitized and idempotent', async () => {
    let finish!: (value: unknown) => void;
    const cancel = vi.fn().mockResolvedValue({ remoteProcessStopped: null, secret: 'SECRET' });
    const startSSHExecution = vi.fn().mockResolvedValue({
        events: values({ sequence: 0, stream: 'stdout', data: 'o', secret: 'SECRET' }, { sequence: 1, stream: 'stderr', data: 'k' }),
        result: new Promise(resolve => { finish = resolve; }), cancel,
    });
    setup({ startSSHExecution });
    const execution = await ssh.start({ ...options, password: 'SECRET' } as never);
    expect(startSSHExecution).toHaveBeenCalledWith({ ...options, timeoutMs: 30000, maxOutputBytes: 1048576 });
    const output = [];
    for await (const event of execution.events) output.push(event);
    expect(output).toEqual([{ sequence: 0, stream: 'stdout', data: 'o' }, { sequence: 1, stream: 'stderr', data: 'k' }]);
    await expect(execution.cancel()).resolves.toEqual({ remoteProcessStopped: null });
    await expect(execution.cancel()).resolves.toEqual({ remoteProcessStopped: null });
    expect(cancel).toHaveBeenCalledOnce();
    finish(completed);
    await expect(execution.result).resolves.toEqual(completed);
});

test.each([
    [{ sequence: 1, stream: 'stdout', data: 'x' }],
    [{ sequence: 0, stream: 'stdin', data: 'x' }],
    [{ sequence: 0, stream: 'stdout', data: 'éé' }],
    [{ sequence: 0, stream: 'stdout', data: 'é' }, { sequence: 1, stream: 'stderr', data: 'é' }],
])('rejects output with invalid sequence, stream or combined UTF-8 budget: %j', async (...events) => {
    setup({ startSSHExecution: async () => ({ events: values(...events), result: Promise.resolve({ ...completed, stdout: '' }), cancel: async () => ({ remoteProcessStopped: null }) }) });
    const execution = await ssh.start({ ...options, maxOutputBytes: 3 });
    await expect((async () => { for await (const _event of execution.events) { /* drain */ } })()).rejects.toThrow('Invalid host service response');
});

test('completion before consumption preserves buffered events and truncation', async () => {
    setup({ startSSHExecution: async () => ({ events: values({ sequence: 0, stream: 'stdout', data: 'ok' }), result: Promise.resolve({ ...completed, truncated: true }), cancel: async () => ({ remoteProcessStopped: true }) }) });
    const execution = await ssh.start(options);
    expect((await execution.result).truncated).toBe(true);
    const received = [];
    for await (const event of execution.events) received.push(event.data);
    expect(received).toEqual(['ok']);
});

test('teardown invalidates in-flight results and cancels pending execution', async () => {
    let finish!: (value: unknown) => void;
    const cancel = vi.fn().mockResolvedValue({ remoteProcessStopped: null });
    setup({ startSSHExecution: async () => ({ events: values(), result: new Promise(resolve => { finish = resolve; }), cancel }) });
    const execution = await ssh.start(options);
    PluginRegistry.configureHostServices(null);
    finish(completed);
    await expect(execution.result).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(cancel).toHaveBeenCalledOnce();
});

test('a start resolved after teardown is cancelled without returning a live handle', async () => {
    let finish!: (value: any) => void;
    const cancel = vi.fn().mockResolvedValue({ remoteProcessStopped: null });
    setup({ startSSHExecution: () => new Promise(resolve => { finish = resolve; }) });
    const pending = ssh.start(options);
    PluginRegistry.configureHostServices(null);
    finish({ events: values(), result: Promise.resolve(completed), cancel });
    await expect(pending).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(cancel).toHaveBeenCalledOnce();
});

test('live adapters require backend execution and all existing exec grants', async () => {
    const startSSHExecution = vi.fn();
    setup({ startSSHExecution });
    vi.stubGlobal('window', {});
    await expect(ssh.start(options)).rejects.toThrow('backend runtime');
    vi.unstubAllGlobals();
    PluginRegistry.configureCapabilities({ granted: ['ssh.use', 'ssh.exec', 'secrets.use'] });
    await expect(ssh.start(options)).rejects.toThrow('secrets.consume');
    expect(startSSHExecution).not.toHaveBeenCalled();
});

test('host live errors are sanitized and commands are never retried', async () => {
    const startSSHExecution = vi.fn().mockRejectedValue({ code: 'TIMEOUT', message: 'SECRET' });
    setup({ startSSHExecution });
    await expect(ssh.start(options)).rejects.toMatchObject({ code: 'TIMEOUT', message: 'Host service request failed (TIMEOUT).' });
    expect(startSSHExecution).toHaveBeenCalledOnce();
});

test('event and cancellation failures preserve safe codes and hide provider messages', async () => {
    setup({ startSSHExecution: async () => ({
        events: (async function* () { throw { code: 'CONNECTION_FAILED', message: 'SECRET' }; })(),
        result: Promise.reject({ code: 'CANCELLED', message: 'SECRET' }),
        cancel: async () => { throw { code: 'ACCESS_DENIED', message: 'SECRET' }; },
    }) });
    const execution = await ssh.start(options);
    await expect(execution.result).rejects.toMatchObject({ code: 'CANCELLED', message: 'Host service request failed (CANCELLED).' });
    await expect(execution.events[Symbol.asyncIterator]().next()).rejects.toMatchObject({ code: 'CONNECTION_FAILED' });
    await expect(execution.cancel()).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
});

test('monitoring teardown closes subscriptions and suppresses later delivery', async () => {
    const close = vi.fn();
    setup({ watchSSHStatus: async () => (async function* () {
        try {
            yield { profileId: 'vm', state: 'unknown', checkedAt: null, staleAfterMs: 1000 };
            yield { profileId: 'vm', state: 'connected', checkedAt: '2026-10-18', staleAfterMs: 1000 };
        } finally { close(); }
    })() });
    const monitor = ssh.watchStatus('vm');
    await monitor.next();
    PluginRegistry.configureHostServices(null);
    await expect(monitor.next()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(close).toHaveBeenCalledOnce();
});

test('grant revocation prevents delivery and caller cancellation while cleaning up execution', async () => {
    const cancel = vi.fn();
    setup({ startSSHExecution: async () => ({ events: values({ sequence: 0, stream: 'stdout', data: 'ok' }), result: Promise.resolve(completed), cancel }) });
    const execution = await ssh.start(options);
    await execution.result;
    PluginRegistry.configureCapabilities({ granted: [] });
    await expect(execution.events[Symbol.asyncIterator]().next()).rejects.toThrow('Capability');
    expect(cancel).toHaveBeenCalledOnce();
    await expect(execution.cancel()).rejects.toThrow('Capability');
    expect(cancel).toHaveBeenCalledOnce();
});

test.each([undefined, null, {}, { [Symbol.asyncIterator]: () => ({}) }])(
    'cancels a started execution when its event source is malformed: %j', async events => {
        let rejectResult!: (reason: unknown) => void;
        const cancel = vi.fn(() => {
            rejectResult({ code: 'CANCELLED' });
            return Promise.reject(new Error('provider cancellation failed'));
        });
        setup({ startSSHExecution: async () => ({
            events: events as AsyncIterable<unknown>,
            result: new Promise((_, reject) => { rejectResult = reject; }), cancel,
        }) });
        await expect(ssh.start(options)).rejects.toThrow('Invalid host service response');
        expect(cancel).toHaveBeenCalledOnce();
        PluginRegistry.configureHostServices(null);
        expect(cancel).toHaveBeenCalledOnce();
    },
);

test.each(['clear', 'replace'] as const)('invalidates provider rejections after transport %s', async action => {
    let rejectResult!: (reason: unknown) => void;
    const cancel = vi.fn(async () => {
        rejectResult({ code: 'CANCELLED', message: 'SECRET' });
        return { remoteProcessStopped: null };
    });
    setup({ startSSHExecution: async () => ({
        events: values(), result: new Promise((_, reject) => { rejectResult = reject; }), cancel,
    }) });
    const execution = await ssh.start(options);
    if (action === 'clear') PluginRegistry.configureHostServices(null);
    else setup();
    await expect(execution.result).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'Host service request failed (UNAVAILABLE).' });
    expect(cancel).toHaveBeenCalledOnce();
});

test.each([false, true])('teardown closes output after result settles (consumer started: %j)', async consume => {
    const close = vi.fn().mockResolvedValue({ done: true });
    const cancel = vi.fn().mockResolvedValue({ remoteProcessStopped: null });
    setup({ startSSHExecution: async () => ({
        events: { [Symbol.asyncIterator]: () => ({
            next: async () => ({ value: { sequence: 0, stream: 'stdout', data: 'ok' }, done: false }),
            return: close,
        }) },
        result: Promise.resolve(completed), cancel,
    }) });
    const execution = await ssh.start(options);
    const consumer = consume ? execution.events[Symbol.asyncIterator]() : undefined;
    if (consumer) await consumer.next();
    await execution.result;
    expect(close).not.toHaveBeenCalled();
    PluginRegistry.configureHostServices(null);
    expect(close).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    if (consumer) await consumer.return?.();
    expect(close).toHaveBeenCalledOnce();
});

test.each([false, true])('releases completed execution after result and output close (result first: %j)', async resultFirst => {
    let finish!: (value: unknown) => void;
    const cancel = vi.fn();
    const close = vi.fn().mockResolvedValue({ done: true });
    setup({ startSSHExecution: async () => ({
        events: { [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true }), return: close }) },
        result: new Promise(resolve => { finish = resolve; }), cancel,
    }) });
    const execution = await ssh.start(options);
    if (resultFirst) { finish(completed); await execution.result; }
    for await (const _event of execution.events) { /* drain */ }
    if (!resultFirst) { finish(completed); await execution.result; }
    PluginRegistry.configureHostServices(null);
    expect(close).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
});

test('retains teardown cleanup while asynchronous output closure is pending', async () => {
    let finishClose!: () => void;
    let notifyCloseStarted!: () => void;
    const closeStarted = new Promise<void>(resolve => { notifyCloseStarted = resolve; });
    const close = vi.fn(() => new Promise<{ done: true }>(resolve => {
        finishClose = () => resolve({ done: true });
        notifyCloseStarted();
    }));
    const cancel = vi.fn().mockResolvedValue({ remoteProcessStopped: null });
    setup({ startSSHExecution: async () => ({
        events: { [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true }), return: close }) },
        result: Promise.resolve(completed), cancel,
    }) });
    const execution = await ssh.start(options);
    await execution.result;
    const outputDone = execution.events[Symbol.asyncIterator]().next();
    await closeStarted;
    PluginRegistry.configureHostServices(null);
    expect(cancel).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    finishClose();
    await outputDone;
});
