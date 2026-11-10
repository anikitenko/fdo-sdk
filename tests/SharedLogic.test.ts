import {PluginScope} from '../src';
import {SharedLogic, configureSharedLogic, dispatchSharedLogic, cancelSharedLogicInvocation, sharedLogicCapability, cloneSharedLogicValue} from '../src';
import {configureCapabilities, describeCapability, runCapabilityPreflight} from '../src/utils/capabilities';
import {validatePluginInitPayload} from '../src';
const target = {providerId: 'website-plugin', name: 'website-availability', version: 1};
const capability = sharedLogicCapability(target);
let scope: PluginScope;
beforeEach(() => {scope = new PluginScope();configureCapabilities({granted: ['plugins.shared.use','plugins.shared.provide',capability]});});
afterEach(async () => {await scope.dispose();configureSharedLogic(null);configureCapabilities({granted: []});});

test('discovers services and calls a typed exported method with the exact capability', async () => {
    const request = vi.fn(async (value: any) => value.op === 'list' ? [{...target, description: 'Website checks', methods: ['check']}] : {available: true});
    configureSharedLogic({request});
    const client = new SharedLogic(scope);
    const services = await client.list();
    expect(services).toEqual([{...target, description: 'Website checks', methods: ['check'], capability}]);
    const result = await client.client<{check: (input: {url: string}) => {available: boolean}}>(services[0]).call('check', {url: 'https://example.com'});
    expect(result.available).toBe(true);
    expect(request).toHaveBeenLastCalledWith(expect.objectContaining({op: 'call', target, method: 'check', input: {url: 'https://example.com'}}));
});

test('requires exact provider, service and version approval, never just the base grant', async () => {
    const request = vi.fn();configureSharedLogic({request});
    configureCapabilities({granted: ['plugins.shared.use']});
    await expect(new SharedLogic(scope).call(target, 'check', null)).rejects.toThrow(capability);
    expect(request).not.toHaveBeenCalled();
    expect(validatePluginInitPayload({capabilities: [capability]}).capabilities).toEqual([capability]);
    expect(() => validatePluginInitPayload({capabilities: ['plugins.shared.call.*']})).toThrow('not supported');
    expect(describeCapability(capability).category).toBe('shared-logic');
    expect(runCapabilityPreflight({declared:[capability], granted: []}).missing[0].missingPrerequisites.includes('plugins.shared.use')).toBe(true);
});

test('exports only registered methods, passes authenticated caller identity and aborts on cancellation', async () => {
    configureSharedLogic({request: vi.fn(async () => ({registrationId: 'registration-1'}))});
    const handler = vi.fn(async (_input, context) => {
        await new Promise<void>(resolve => context.signal.addEventListener('abort', () => resolve(), {once: true}));
        return {private: 'not returned after cancel'};
    });
    const shared = new SharedLogic(scope);
    const registration = shared.register({name: target.name, version: 1, description: 'Website checks'}, {check: handler});
    await registration.ready;
    const call = {...target, registrationId: 'registration-1', callerId: 'consumer', callId: 'call-1', method: 'check', input: null};
    const pending = dispatchSharedLogic(call);
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(handler.mock.calls[0][1].callerId).toBe('consumer');
    cancelSharedLogicInvocation('call-1');
    await expect(pending).resolves.toEqual({error: 'CANCELLED'});
    await expect(dispatchSharedLogic({...call, callId: 'private', method: 'privateHandler'})).resolves.toEqual({error: 'NOT_FOUND'});
    expect(() => shared.register({name: target.name, version: 1, description: 'Duplicate'}, {check: handler})).toThrow('CONFLICT');
    await registration.dispose();
});

test('contains provider exceptions and automatically unregisters on disposal', async () => {
    const request = vi.fn(async () => ({registrationId: 'registration-2'}));configureSharedLogic({request});
    const shared = new SharedLogic(scope);
    const registration = shared.register({name: 'failure', version: 1, description: 'Failure test'}, {run: () => {throw new Error('private credentials');}});
    await registration.ready;
    const result = await dispatchSharedLogic({...target,name:'failure',method:'run',input:null,callerId:'consumer',callId:'failure-1',registrationId:'registration-2'});
    expect(result).toEqual({error:'SERVICE_ERROR'});
    await scope.dispose();
    expect(request).toHaveBeenCalledWith({op:'unregister',registrationId:'registration-2'});
});

test('cancelled consumers notify the host, and local call concurrency is bounded', async () => {
    const controller = new AbortController();
    const request = vi.fn((value: any) => value.op === 'cancel' ? Promise.resolve(null) : new Promise(() => {}));configureSharedLogic({request});
    const shared = new SharedLogic(scope);
    const pending = shared.call(target,'check',null,{signal:controller.signal});
    await Promise.resolve();controller.abort();
    await expect(pending).rejects.toMatchObject({code:'CANCELLED'});
    expect(request).toHaveBeenCalledWith(expect.objectContaining({op:'cancel'}));
    const calls = Array.from({length:16},()=>shared.call(target,'check',null).catch(error=>error.code));
    await expect(shared.call(target,'check',null)).rejects.toMatchObject({code:'BACKPRESSURE'});
    await scope.dispose();
    expect(await Promise.all(calls)).toEqual(Array(16).fill('CANCELLED'));
});

test('finite JSON validation rejects executable, cyclic and oversized values', () => {
    for (const value of [undefined, ()=>{}, NaN, Infinity, new Date(), {fn(){}}, {get secret(){throw new Error('must not run');}}, 'x'.repeat(262145)]) {
        expect(()=>cloneSharedLogicValue(value)).toThrow('INVALID_REQUEST');
    }
    const cycle: any = {};cycle.self=cycle;
    expect(()=>cloneSharedLogicValue(cycle)).toThrow('INVALID_REQUEST');
    expect(cloneSharedLogicValue({checks:[true,200,null],then:'next'})).toEqual({checks:[true,200,null],then:'next'});
});

test('an already-cancelled call performs no host request, and a local deadline cancels a silent host', async () => {
    const request = vi.fn((value: any) => value.op === 'cancel' ? Promise.resolve(null) : new Promise(() => {}));configureSharedLogic({request});
    const shared = new SharedLogic(scope);
    const controller = new AbortController();controller.abort();
    await expect(shared.call(target,'check',null,{signal:controller.signal})).rejects.toMatchObject({code:'CANCELLED'});
    expect(request).not.toHaveBeenCalled();
    vi.useFakeTimers();
    try {
        const pending = expect(shared.call(target,'check',null,{timeoutMs:10})).rejects.toMatchObject({code:'TIMEOUT'});
        await vi.advanceTimersByTimeAsync(10);await pending;
        expect(request).toHaveBeenCalledWith(expect.objectContaining({op:'cancel'}));
    } finally {vi.useRealTimers();}
});

test('adapter replacement cancels old calls and browser code cannot access shared logic', async () => {
    configureSharedLogic({request:vi.fn(()=>new Promise(()=>{}))});
    const shared = new SharedLogic(scope);
    const pending = expect(shared.call(target,'check',null)).rejects.toMatchObject({code:'CANCELLED'});
    await Promise.resolve();configureSharedLogic(null);await pending;
    configureSharedLogic({request:vi.fn(async()=>[])});
    vi.stubGlobal('window',{});
    try {await expect(shared.list()).rejects.toMatchObject({code:'UNAVAILABLE'});}
    finally {vi.unstubAllGlobals();}
});

test('cancellation before registration is ready prevents the exported method from starting', async () => {
    let ready!: (value: unknown) => void;
    configureSharedLogic({request:vi.fn((request: any)=>request.op==='register'?new Promise(resolve=>{ready=resolve;}):Promise.resolve(null))});
    const handler=vi.fn(()=>true);
    const registration=new SharedLogic(scope).register({name:target.name,version:1,description:'Pending startup'},{check:handler});
    const pending=dispatchSharedLogic({...target,callId:'early-cancel',registrationId:'early-registration',callerId:'consumer',method:'check',input:null});
    cancelSharedLogicInvocation('early-cancel');
    await Promise.resolve();ready({registrationId:'early-registration'});
    await expect(pending).resolves.toEqual({error:'CANCELLED'});
    expect(handler).not.toHaveBeenCalled();
    await registration.dispose();
});


test.each(['clear', 'replace'] as const)('transport %s before the dispatch microtask never sends the cancelled call', async change => {
    const oldRequest = vi.fn(async () => ({mutated: true}));
    const replacementRequest = vi.fn(async () => ({mutated: true}));
    configureSharedLogic({request: oldRequest});
    const pending = new SharedLogic(scope).call(target, 'check', null);
    const cancelled = expect(pending).rejects.toMatchObject({code: 'CANCELLED'});
    // No await here: revocation must beat the already queued request microtask.
    configureSharedLogic(change === 'clear' ? null : {request: replacementRequest});
    await cancelled;
    expect(oldRequest).not.toHaveBeenCalled();
    expect(replacementRequest).not.toHaveBeenCalled();
});


test('access requests need no grant and never enable permissions or execute a provider', async () => {
    configureCapabilities({granted:[]});
    const response={state:'pending',request:{id:'review-1',...target,capability,createdAt:'now'}};
    const request=vi.fn(async()=>response);configureSharedLogic({request});
    const shared=new SharedLogic(scope);
    expect(await shared.requestAccess(target)).toEqual(response);
    expect(request).toHaveBeenCalledWith({op:'requestAccess',target});
    await expect(shared.call(target,'check',null)).rejects.toThrow('plugins.shared.use');
    expect(request).toHaveBeenCalledTimes(1);
    await scope.dispose();
    await expect(shared.requestAccess(target)).rejects.toMatchObject({code:'CANCELLED'});
});

test('registration sends a copy of the public method contract', async () => {
    const request=vi.fn(async()=>({registrationId:'typed-1'}));configureSharedLogic({request});
    const contract={check:{input:{type:'string' as const},output:{type:'boolean' as const}}};
    const registration=new SharedLogic(scope).register({name:'typed',version:1,description:'Typed checks',contract},{check:()=>true});
    await registration.ready;
    expect(request).toHaveBeenCalledWith({op:'register',definition:{name:'typed',version:1,description:'Typed checks',contract},methods:['check']});
    await registration.dispose();
});
