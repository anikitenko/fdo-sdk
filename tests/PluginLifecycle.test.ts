import {EventEmitter} from 'events';
import {FDO_SDK, PluginRegistry} from '../src';
import {Logger} from '../src/Logger';

class Fixture extends FDO_SDK {
    get metadata() { return {id: 'lifecycle-fixture', name: 'Lifecycle', version: '1.0.0', author: 'SDK', description: 'test', icon: 'cog'}; }
    init() {}
    render() { return '<p>ok</p>'; }
}
let port: EventEmitter & {postMessage: ReturnType<typeof vi.fn>};
beforeEach(() => {
    port = Object.assign(new EventEmitter(), {postMessage: vi.fn()});
    (process as any).parentPort = port;
});
afterEach(async () => {
    await PluginRegistry.shutdown().catch(() => {});
    vi.restoreAllMocks();
    delete (process as any).parentPort;
});

test('shutdown aborts handlers, releases resources and listeners, and closes plugin loggers', async () => {
    const baseline = Logger.getDiagnostics().activeFamilies;
    const plugin = new Fixture();
    const source = new EventEmitter();
    const close = vi.fn();
    plugin.trackResource({close}, resource => resource.close());
    plugin.lifecycle.listen(source, 'change', () => {});
    plugin.lifecycle.interval(() => {}, 10000);
    PluginRegistry.registerHandler('wait', () => new Promise(resolve => plugin.signal.addEventListener('abort', () => resolve('aborted'), {once: true})));
    const pending = PluginRegistry.callHandler('wait');
    const done = PluginRegistry.shutdown();
    expect(PluginRegistry.shutdown()).toBe(done);
    expect(plugin.signal.aborted).toBe(true);
    await done;
    await expect(pending).resolves.toBe('aborted');
    expect(close).toHaveBeenCalledOnce();
    expect(source.listenerCount('change')).toBe(0);
    expect(port.listenerCount('message')).toBe(0);
    expect(port.listenerCount('close')).toBe(0);
    expect(Logger.getDiagnostics().activeFamilies).toBe(baseline);
});

test('initialization failure runs the same cleanup lifecycle', async () => {
    const close = vi.fn();
    class Failing extends Fixture {
        init() { this.onDispose(close); throw new Error('initialization failed'); }
    }
    const plugin = new Failing();
    port.emit('message', {data: {message: 'PLUGIN_INIT'}});
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(plugin.signal.aborted).toBe(true);
    expect(port.postMessage).toHaveBeenCalledWith(expect.objectContaining({type: 'PLUGIN_INIT', response: expect.objectContaining({error: expect.stringContaining('initialization failed')})}));
    expect(port.listenerCount('message')).toBe(0);
});

test('disconnect runs cleanup and drops replies from handlers already in flight', async () => {
    const plugin = new Fixture();
    const close = vi.fn();
    plugin.onDispose(close);
    let finish!: () => void;
    PluginRegistry.registerHandler('wait', () => new Promise<void>(resolve => { finish = resolve; }));
    port.emit('message', {data: {message: 'UI_MESSAGE', content: {handler: 'wait'}}});
    port.emit('close');
    finish();
    await PluginRegistry.shutdown();
    await new Promise(resolve => setImmediate(resolve));
    expect(close).toHaveBeenCalledOnce();
    expect(port.postMessage).not.toHaveBeenCalled();
});

test('observes a rejected async init, returns a clear error, and tears down its resources', async () => {
    class AsyncInit extends Fixture {
        init(): any { return Promise.reject(new Error('async startup failure')); }
    }
    const plugin = new AsyncInit();
    port.emit('message', {data: {message: 'PLUGIN_INIT'}});
    await PluginRegistry.shutdown();
    expect(plugin.signal.aborted).toBe(true);
    expect(port.postMessage).toHaveBeenCalledWith(expect.objectContaining({response: expect.objectContaining({error: expect.stringContaining('must be synchronous')})}));
});
