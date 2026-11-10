import {EventEmitter} from 'node:events';
import {PluginRegistry, SharedLogic} from '../src';

// Exercise each executable entry as FDO does: import it, without constructing
// its default export in the test (which would hide a missing startup statement).
describe('shared logic example startup', () => {
    const previousPort = (process as any).parentPort;
    let port: EventEmitter & {postMessage: ReturnType<typeof vi.fn>};

    beforeEach(async () => {
        await PluginRegistry.clearPlugin();
        PluginRegistry.clearAllHandlers();
        port = Object.assign(new EventEmitter(), {postMessage: vi.fn()});
        (process as any).parentPort = port;
    });

    afterEach(async () => {
        await PluginRegistry.clearPlugin();
        PluginRegistry.clearAllHandlers();
        vi.restoreAllMocks();
        expect(port.listenerCount('message')).toBe(0);
        (process as any).parentPort = previousPort;
    });

    it('the provider entry registers itself and renders its UI', async () => {
        await import('../examples/19-shared-logic-provider');
        const payload = PluginRegistry.callRenderer();
        expect(payload.render).toBeTypeOf('string');
        expect(JSON.parse(payload.render!)).toContain('This plugin exports website-availability v1.');
        expect(JSON.parse(payload.render!)).toContain('<style>');
        expect(JSON.parse(payload.render!)).toContain('@media');
        let check!: (input: {url:string}, context: {signal:AbortSignal}) => Promise<unknown>;
        vi.spyOn(SharedLogic.prototype, 'register').mockImplementation((_definition, methods) => {
            check = methods.check as typeof check;
            return {ready:Promise.resolve(), dispose:async () => {}};
        });
        const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ok:true,status:200} as Response);
        PluginRegistry.callInit();
        const signal = new AbortController().signal;
        await expect(check({url:'https://example.com'}, {signal})).resolves.toEqual({available:true,status:200});
        expect(fetch).toHaveBeenCalledWith('https://example.com/', {method:'HEAD',redirect:'error',signal});
        expect(port.listenerCount('message')).toBe(1);
    });

    it('the consumer entry registers itself and renders its UI', async () => {
        await import('../examples/20-shared-logic-consumer');
        const payload = PluginRegistry.callRenderer();
        expect(payload.render).toBeTypeOf('string');
        const markup = JSON.parse(payload.render!);
        expect(markup).toContain('The checkWebsite backend handler');
        expect(markup).toContain('id="check-website-button"');
        expect(markup).toContain('type="button"');
        expect(markup).not.toContain('<form');
        expect(markup).toContain('<style>');
        expect(markup).toContain('@media');
        expect(markup).not.toContain('bp6-');
        expect(markup).toContain('aria-live="polite"');
        const onLoad = JSON.parse(payload.onLoad!);
        expect(onLoad).toMatch(/window\.createBackendReq\(['"]UI_MESSAGE['"]/);
        expect(onLoad).not.toMatch(/fetch\s*\(|XMLHttpRequest|WebSocket/);
        expect(onLoad).toContain('shared-website-check');
        const target = {providerId:'website-availability-provider',name:'website-availability',version:1};
        const requestAccess = vi.spyOn(SharedLogic.prototype, 'requestAccess').mockResolvedValue({state:'pending'});
        const call = vi.fn().mockResolvedValue({available:true,status:200});
        vi.spyOn(SharedLogic.prototype, 'client').mockReturnValue({call});
        PluginRegistry.callInit();
        await expect(PluginRegistry.callHandler('requestSharedWebsiteAccess', null)).resolves.toEqual({state:'pending'});
        expect(requestAccess).toHaveBeenCalledWith(target);
        for (const input of [null, {}, {url:42}, {url:'invalid URL'}, {url:'http://example.com'}, {url:'https://user:password@example.com'}]) {
            await expect(PluginRegistry.callHandler('checkWebsite', input)).resolves.toEqual({ok:false,code:'INVALID_REQUEST'});
        }
        expect(call).not.toHaveBeenCalled();
        await expect(PluginRegistry.callHandler('checkWebsite', {url:' https://example.com '})).resolves.toEqual({ok:true,available:true,status:200});
        expect(call).toHaveBeenCalledWith('check', {url:'https://example.com/'}, {timeoutMs:10000});
        expect(port.listenerCount('message')).toBe(1);
    });
});
