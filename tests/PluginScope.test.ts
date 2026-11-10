import {PluginScope} from '../src';

afterEach(() => vi.useRealTimers());

test('aborts immediately, disposes once in reverse order and releases every resource despite errors', async () => {
    const errors = vi.fn();
    const scope = new PluginScope(errors);
    const order: number[] = [];
    scope.add(() => { order.push(1); });
    scope.add(() => { order.push(2); throw new Error('failure'); });
    scope.add(async () => { order.push(3); });
    const done = scope.dispose();
    expect(scope.signal.aborted).toBe(true);
    expect(scope.dispose()).toBe(done);
    await expect(done).resolves.toEqual({success: false, failed: 1, timedOut: false});
    expect(order).toEqual([3, 2, 1]);
    expect(errors).toHaveBeenCalledTimes(1);
});

test('bounds shutdown time without letting a hung cleanup prevent the remaining cleanups', async () => {
    vi.useFakeTimers();
    const scope = new PluginScope();
    const released = vi.fn();
    scope.add(released);
    scope.add(() => new Promise(() => {}));
    const done = scope.dispose(100);
    await vi.advanceTimersByTimeAsync(100);
    expect(released).toHaveBeenCalledOnce();
    await expect(done).resolves.toMatchObject({success: false, timedOut: true});
    expect(vi.getTimerCount()).toBe(0);
});

test('clears timers and unregisters completed timeouts', async () => {
    vi.useFakeTimers();
    const scope = new PluginScope();
    const tick = vi.fn();
    scope.interval(tick, 10);
    scope.timeout(tick, 20);
    await vi.advanceTimersByTimeAsync(20);
    expect(tick).toHaveBeenCalledTimes(3);
    await scope.dispose();
    await vi.advanceTimersByTimeAsync(100);
    expect(tick).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
});

test('observes async timer failures and immediately releases resources registered after shutdown', async () => {
    vi.useFakeTimers();
    const errors = vi.fn();
    const scope = new PluginScope(errors);
    scope.timeout(async () => { throw new Error('async timer'); }, 1);
    await vi.advanceTimersByTimeAsync(1);
    expect(errors).toHaveBeenCalledOnce();
    await scope.dispose();
    const close = vi.fn();
    expect(() => scope.use({close}, resource => resource.close())).toThrow('disposed');
    expect(close).toHaveBeenCalledOnce();
});

test('releases event subscriptions and observes rejected asynchronous listeners', async () => {
    const {EventEmitter} = await import('events');
    const source = new EventEmitter();
    const errors = vi.fn();
    const scope = new PluginScope(errors);
    scope.listen(source, 'data', async () => { throw new Error('listener failure'); });
    source.emit('data');
    await Promise.resolve();
    expect(errors).toHaveBeenCalledOnce();
    await scope.dispose();
    expect(source.listenerCount('data')).toBe(0);
});

test('async intervals do not overlap or accumulate work when callbacks are slow', async () => {
    vi.useFakeTimers();
    const scope = new PluginScope();
    let finish!: () => void;
    const callback = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    scope.interval(callback, 10);
    await vi.advanceTimersByTimeAsync(100);
    expect(callback).toHaveBeenCalledOnce();
    finish();
    await vi.advanceTimersByTimeAsync(10);
    expect(callback).toHaveBeenCalledTimes(2);
    finish();
    await scope.dispose();
});
