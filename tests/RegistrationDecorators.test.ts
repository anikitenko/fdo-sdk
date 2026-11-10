import {EventEmitter} from 'events';
import {
    FDO_SDK, PluginRegistry, handler, sharedFunction, handleError, SharedLogic,
    configureSharedLogic, dispatchSharedLogic,
} from '../src';

class Fixture extends FDO_SDK {
    get metadata() {return {id: 'decorator-test', name: 'Decorators', version: '1.0.0', author: 'SDK', description: 'test', icon: 'cog'};}
    init() {}
    render() {return '';}
}
// Apply legacy method decorators directly, as in the ErrorHandler unit tests.
// The executable example tests also exercise real @ syntax.
function decorate(Type: {prototype: object}, key: string, decorators: MethodDecorator[]) {
    let descriptor = Object.getOwnPropertyDescriptor(Type.prototype, key)!;
    for (const decorator of [...decorators].reverse()) descriptor = decorator(Type.prototype, key, descriptor) ?? descriptor;
    Object.defineProperty(Type.prototype, key, descriptor);
}
let port: EventEmitter & {postMessage: ReturnType<typeof vi.fn>};
let instances: FDO_SDK[];
function create<T extends FDO_SDK>(Type: new () => T): T {const plugin = new Type(); instances.push(plugin); return plugin;}
beforeEach(() => {
    instances = [];
    port = Object.assign(new EventEmitter(), {postMessage: vi.fn()});
    (process as any).parentPort = port;
    PluginRegistry.configureCapabilities({granted: []});
    PluginRegistry.clearAllHandlers();
});
afterEach(async () => {
    await PluginRegistry.shutdown().catch(() => {});
    await Promise.all(instances.map(plugin => plugin.dispose().catch(() => {})));
    configureSharedLogic(null);
    vi.restoreAllMocks();
    delete (process as any).parentPort;
    expect(port.listenerCount('message')).toBe(0);
});

test('decorated handlers bind after fields are initialized, before init(), and remain instance-local', async () => {
    class Plugin extends Fixture {
        prefix = 'ready';
        init() {expect(PluginRegistry.getDiagnostics().capabilities.registeredHandlers).toContain('echo');}

        echo(value: string) {return `${this.prefix}:${value}`;}
    }
    decorate(Plugin, "echo", [handler()]);
    const one = create(Plugin);
    expect(PluginRegistry.getDiagnostics().capabilities.registeredHandlers).not.toContain('echo');
    PluginRegistry.callInit();
    await expect(PluginRegistry.callHandler('echo', 'one')).resolves.toBe('ready:one');
    await PluginRegistry.shutdown();
    const two = create(Plugin);two.prefix = 'second';
    PluginRegistry.callInit();
    await expect(PluginRegistry.callHandler('echo', 'two')).resolves.toBe('second:two');
    expect(one.prefix).toBe('ready');
});

test('inherits registrations, resolves overrides and supports an explicit alias', async () => {
    class Base extends Fixture {

        check() {return 'base';}
    }
    decorate(Base, "check", [handler('public.check')]);
    class Child extends Base {check() {return 'child';}}
    create(Child);PluginRegistry.callInit();
    await expect(PluginRegistry.callHandler('public.check', null)).resolves.toBe('child');
});

test('uses the final error-handling wrapper in either decorator order', async () => {
    class Plugin extends Fixture {

        async first() {return 1;}

        second() {return 2;}
    }
    decorate(Plugin, "first", [handler(), handleError()]);
    decorate(Plugin, "second", [handleError(), handler()]);
    create(Plugin);PluginRegistry.callInit();
    await expect(PluginRegistry.callHandler('first', null)).resolves.toEqual({success: true, result: 1});
    await expect(PluginRegistry.callHandler('second', null)).resolves.toEqual({success: true, result: 2});
});

test('groups shared methods into one versioned registration and preserves contracts and this binding', async () => {
    class Plugin extends Fixture {
        multiplier = 3;

        double(input: number) {return input * this.multiplier;}

        add(input: number) {return input + 1;}
    }
    decorate(Plugin, "double", [sharedFunction({service: 'numbers', version: 1, description: 'Reusable arithmetic',
                contract: {input: {type: 'number'}, output: {type: 'number'}}})]);
    decorate(Plugin, "add", [sharedFunction({service: 'numbers', version: 1, description: 'Reusable arithmetic', method: 'increment'})]);
    const request = vi.fn(async (value: any) => value.op === 'register' ? {registrationId: 'numbers-1'} : null);
    configureSharedLogic({request});
    PluginRegistry.configureCapabilities({granted: ['plugins.shared.provide']});
    create(Plugin);
    const register = vi.spyOn(SharedLogic.prototype, 'register');
    PluginRegistry.callInit();PluginRegistry.callInit();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({name: 'numbers', version: 1, contract: {double: {input: {type: 'number'}, output: {type: 'number'}}}}),
        expect.objectContaining({double: expect.any(Function), increment: expect.any(Function)}));
    await expect(dispatchSharedLogic({providerId: 'provider', name: 'numbers', version: 1, registrationId: 'numbers-1',
        callId: 'call-1', callerId: 'consumer', method: 'double', input: 4})).resolves.toEqual({result: 12});
    await PluginRegistry.shutdown();
    expect(request).toHaveBeenCalledWith({op: 'unregister', registrationId: 'numbers-1'});
});

test('decorators do not bypass shared capability checks', () => {
    class Plugin extends Fixture {

        check() {return true;}
    }
    decorate(Plugin, "check", [sharedFunction({service: 'restricted', version: 1, description: 'Needs approval'})]);
    configureSharedLogic({request: vi.fn()});
    create(Plugin);
    expect(() => PluginRegistry.callInit()).toThrow('plugins.shared.provide');
});

test('rejects duplicate public names before applying any handler bindings', () => {
    class Plugin extends Fixture {
        first() {}
        second() {}
    }
    decorate(Plugin, "first", [handler('duplicate')]);
    decorate(Plugin, "second", [handler('duplicate')]);
    create(Plugin);
    expect(() => PluginRegistry.callInit()).toThrow('Duplicate decorated handler');
    expect(PluginRegistry.getDiagnostics().capabilities.registeredHandlers).not.toContain('duplicate');
});

test('rejects duplicate shared names and inconsistent metadata', () => {
    class Duplicate extends Fixture {
        first() {}
        second() {}
    }
    decorate(Duplicate, "first", [sharedFunction({service: 'one', version: 1, description: 'One', method: 'same'})]);
    decorate(Duplicate, "second", [sharedFunction({service: 'one', version: 1, description: 'One', method: 'same'})]);
    create(Duplicate);
    expect(() => PluginRegistry.callInit()).toThrow('Duplicate decorated shared method');
    class Conflict extends Fixture {
        first() {}
        second() {}
    }
    decorate(Conflict, "first", [sharedFunction({service: 'one', version: 1, description: 'One'})]);
    decorate(Conflict, "second", [sharedFunction({service: 'one', version: 1, description: 'Different'})]);
    create(Conflict);
    expect(() => PluginRegistry.callInit()).toThrow('Conflicting descriptions');
});

test('rejects static methods, accessors and unsafe public names', () => {
    const method = {value() {}};
    expect(() => handler()(class Static {}, 'check', method)).toThrow('instance methods');
    expect(() => handler()({}, 'check', {get() {return 1;}})).toThrow('instance methods');
    expect(() => handler('__sdk.getDiagnostics')({}, 'check', method)).toThrow('non-reserved');
    expect(() => sharedFunction({service: 'one', version: 1, description: 'One', method: 'constructor'})({}, 'check', method)).toThrow('non-reserved');
});
