import { PluginRegistry, SSHClient, createSSHCapabilityBundle, runCapabilityPreflight, validatePluginInitPayload } from '../../src';
import type { HostSSHTerminalSession } from '../../src';
import { resetCapabilityStateForTests } from '../../src/utils/capabilities';

const ssh = new SSHClient();
const exited = { reason: 'exited', exitCode: 0, signal: null, remoteProcessStopped: true };
async function* values(...items: unknown[]) { yield* items; }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (e: unknown) => void;
    const promise = new Promise<T>((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function host(overrides: Partial<HostSSHTerminalSession> = {}): HostSSHTerminalSession {
    return { output: values(), result: new Promise(() => {}), write: vi.fn().mockResolvedValue(undefined),
        resize: vi.fn().mockResolvedValue(undefined), endInput: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined), cancel: vi.fn().mockResolvedValue({ remoteProcessStopped: null }), ...overrides };
}
function setup(h?: HostSSHTerminalSession) {
    PluginRegistry.configureCapabilities({ granted: createSSHCapabilityBundle({ terminal: true, x11: true }) });
    const openSSHTerminal = h ? vi.fn().mockResolvedValue(h) : undefined;
    PluginRegistry.configureHostServices({ request: vi.fn(), openSSHTerminal });
    return openSSHTerminal;
}
beforeEach(() => { resetCapabilityStateForTests(); setup(); });
afterEach(() => { PluginRegistry.configureHostServices(null); resetCapabilityStateForTests(); });

test('optional adapter fails closed, without noninteractive fallback', async () => {
    await expect(ssh.openTerminal({ profileId: 'vm' })).rejects.toMatchObject({ code: 'UNAVAILABLE' });
});
test('new capabilities validate and require explicit grants; defaults do not grant them', async () => {
    expect(createSSHCapabilityBundle()).not.toContain('ssh.terminal.open');
    expect(createSSHCapabilityBundle({ terminal: true })).not.toContain('ssh.x11.forward');
    expect(validatePluginInitPayload({capabilities: ['ssh.terminal.open','ssh.x11.forward']})).toMatchObject({capabilities:['ssh.terminal.open','ssh.x11.forward']});
    setup(host());
    PluginRegistry.configureCapabilities({ granted: createSSHCapabilityBundle() });
    await expect(ssh.openTerminal({profileId:'vm'})).rejects.toMatchObject({code:'ACCESS_DENIED'});
    PluginRegistry.configureCapabilities({ granted: createSSHCapabilityBundle({terminal:true}) });
    await expect(ssh.openTerminal({profileId:'vm',x11:{mode:'trusted'}})).rejects.toMatchObject({code:'ACCESS_DENIED'});
    expect(runCapabilityPreflight({declared:['ssh.terminal.open'],granted:['ssh.terminal.open','ssh.use']} as never).ok).toBe(false);
});
test('normalizes a safe request and projects bytes/result without extra host data', async () => {
    const h = host({ output: values({sequence:0,data:Uint8Array.from([27,91,72]),cookie:'SECRET'}), result: Promise.resolve({...exited,cookie:'SECRET'}) });
    const adapter = setup(h);
    const s = await ssh.openTerminal({profileId:'vm',x11:{mode:'trusted',cookie:'SECRET'} } as never);
    expect(adapter).toHaveBeenCalledWith({profileId:'vm',term:'xterm-256color',rows:24,columns:80,idleTimeoutMs:300000,sessionTimeoutMs:3600000,x11:{mode:'trusted'}});
    const output = []; for await (const e of s.output) output.push(e);
    expect(output).toEqual([{sequence:0,data:Uint8Array.from([27,91,72])}]);
    expect(await s.result).toEqual(exited);
});
test('bidirectional bytes preserve ANSI, split UTF-8, keyboard control bytes and order', async () => {
    const h = host({output:values({sequence:0,data:Uint8Array.from([27,91,72,0xe2])},{sequence:1,data:Uint8Array.from([0x82,0xac])})}); setup(h);
    const s = await ssh.openTerminal({profileId:'vm',rows:40,columns:120});
    const decoder = new TextDecoder(); let text = '';
    for await (const e of s.output) { text += decoder.decode(e.data,{stream:true}); if(e.sequence===1) break; }
    text += decoder.decode(); expect(text).toBe('\x1b[H€');
    const h2 = host(); setup(h2); const t = await ssh.openTerminal({profileId:'vm'});
    await Promise.all([t.write('é'),t.write(Uint8Array.of(3)),t.resize(30,100),t.write('\x1b[A'),t.endInput()]);
    expect(h2.write).toHaveBeenNthCalledWith(1,Uint8Array.of(0xc3,0xa9));
    expect(h2.write).toHaveBeenNthCalledWith(2,Uint8Array.of(3));
    expect(h2.resize).toHaveBeenCalledWith(30,100);
    expect((h2.write as any).mock.invocationCallOrder[1]).toBeLessThan((h2.resize as any).mock.invocationCallOrder[0]);
    expect((h2.resize as any).mock.invocationCallOrder[0]).toBeLessThan((h2.write as any).mock.invocationCallOrder[2]);
    await expect(t.write('x')).rejects.toMatchObject({code:'SESSION_CLOSED'});
    expect(h2.close).not.toHaveBeenCalled(); // EOF is a half-close, not session release.
});
test('bounded input waits for acknowledgements, rejects overflow, never drops an accepted byte', async () => {
    const ack = deferred<void>(); const h = host({write:vi.fn().mockImplementation(()=>ack.promise)}); setup(h);
    const s = await ssh.openTerminal({profileId:'vm'});
    const bytes = new Uint8Array(32768).fill(65);
    const a = s.write(bytes), b = s.write(bytes); bytes.fill(66);
    await expect(s.write('x')).rejects.toMatchObject({code:'BACKPRESSURE'});
    expect(h.write).toHaveBeenCalledTimes(1);
    expect((h.write as any).mock.calls[0][0][0]).toBe(65);
    ack.resolve(); await Promise.all([a,b]);
    expect(h.write).toHaveBeenCalledTimes(2);
});
test('no output prefetch; concurrent reads reject; close wakes a blocked next and result', async () => {
    const next = vi.fn().mockReturnValue(new Promise(()=>{}));
    const h = host({output:{[Symbol.asyncIterator]:()=>({next})}}); setup(h);
    const s = await ssh.openTerminal({profileId:'vm'}); expect(next).not.toHaveBeenCalled();
    const iterator = s.output[Symbol.asyncIterator](); const waiting = iterator.next();
    await expect(iterator.next()).rejects.toMatchObject({code:'BACKPRESSURE'});
    await s.close(); await expect(waiting).resolves.toMatchObject({done:true});
    expect(await s.result).toEqual({reason:'closed',exitCode:null,signal:null,remoteProcessStopped:null});
    await s.close(); expect(h.close).toHaveBeenCalledOnce();
});
test.each([ {sequence:1,data:Uint8Array.of(1)}, {sequence:0,data:'x'}, {sequence:0,data:new Uint8Array(32769)}, {sequence:0,data:new Uint8Array()} ])('malformed output fails safely and closes: %j', async event => {
    const h=host({output:values(event)});setup(h);const s=await ssh.openTerminal({profileId:'vm'});
    await expect(s.output[Symbol.asyncIterator]().next()).rejects.toMatchObject({code:'INVALID_REQUEST'});
    expect(h.close).toHaveBeenCalledOnce();
});
test('returning the output iterator explicitly releases this terminal', async () => {
    const h=host({output:values({sequence:0,data:Uint8Array.of(1)})});setup(h);
    const s=await ssh.openTerminal({profileId:'vm'});
    const iterator=s.output[Symbol.asyncIterator]();
    expect(await iterator.next()).toMatchObject({done:false,value:{sequence:0,data:Uint8Array.of(1)}});
    await iterator.return?.();
    await s.close(); expect(h.close).toHaveBeenCalledOnce();
});
test('abort during pending open closes late session, without retry', async () => {
    const pending=deferred<HostSSHTerminalSession>(), controller=new AbortController(), h=host(); setup();
    const openSSHTerminal=vi.fn().mockReturnValue(pending.promise);
    PluginRegistry.configureHostServices({request:vi.fn(),openSSHTerminal});
    const opening=ssh.openTerminal({profileId:'vm'},controller.signal);await Promise.resolve();controller.abort();
    await expect(opening).rejects.toMatchObject({code:'CANCELLED'});pending.resolve(h);
    await new Promise(resolve=>setTimeout(resolve,0)); expect(h.close).toHaveBeenCalledOnce();expect(openSSHTerminal).toHaveBeenCalledOnce();
});
test('cancel is idempotent, preserves completed exit, and never invents termination evidence', async () => {
    const done=deferred<unknown>(), h=host({result:done.promise});setup(h);
    const s=await ssh.openTerminal({profileId:'vm'});done.resolve(exited);expect(await s.result).toEqual(exited);
    expect(await s.cancel()).toEqual({remoteProcessStopped:null});await s.cancel();
    expect(h.cancel).toHaveBeenCalledOnce();expect(await s.result).toEqual(exited);
});
test('active abort invokes cancellation and closes forwarding', async () => {
    const controller=new AbortController(), h=host();setup(h);
    const s=await ssh.openTerminal({profileId:'vm'},controller.signal);controller.abort();
    await expect(s.result).resolves.toMatchObject({reason:'cancelled',remoteProcessStopped:null});
    await s.close();expect(h.cancel).toHaveBeenCalledOnce();expect(h.close).toHaveBeenCalledOnce();
});
test('revocation rejects further input and tears down; reconfiguration closes active resources', async () => {
    const h=host();setup(h);const s=await ssh.openTerminal({profileId:'vm'});
    PluginRegistry.configureCapabilities({granted:[]});await Promise.resolve();expect(h.close).toHaveBeenCalledOnce();await expect(s.write('x')).rejects.toThrow();
    PluginRegistry.configureHostServices(null);await s.close();expect(h.close).toHaveBeenCalledOnce();expect(h.write).not.toHaveBeenCalled();
});
test.each(['X11_UNSUPPORTED','X11_UNAVAILABLE','X11_AUTH_UNAVAILABLE','X11_FORWARDING_DENIED','ACCESS_DENIED','IDLE_TIMEOUT','SESSION_LIMIT'])('safe host code %s excludes provider details', async code => {
    setup();PluginRegistry.configureHostServices({request:vi.fn(),openSSHTerminal:async()=>{throw {code,message:'COOKIE'};}});
    await expect(ssh.openTerminal({profileId:'vm',x11:{mode:'untrusted'}})).rejects.toMatchObject({code,message:`Host service request failed (${code}).`});
});
test.each([{rows:0},{columns:1001},{term:'x\n'},{idleTimeoutMs:0},{sessionTimeoutMs:86400001},{x11:{mode:'yes'}}])('invalid options never launch: %j', async bad => {
    const adapter=setup(host());await expect(ssh.openTerminal({profileId:'vm',...bad} as never)).rejects.toMatchObject({code:'INVALID_REQUEST'});expect(adapter).not.toHaveBeenCalled();
});

test('abort before adapter dispatch never starts a shell', async () => {
    const adapter=setup(host()),controller=new AbortController();
    const pending=ssh.openTerminal({profileId:'vm'},controller.signal);controller.abort();
    await expect(pending).rejects.toMatchObject({code:'CANCELLED'});expect(adapter).not.toHaveBeenCalled();
});
test('abort settles and wakes output even if cancellation acknowledgement stalls', async () => {
    const h=host({cancel:()=>new Promise(()=>{}),output:{[Symbol.asyncIterator]:()=>({next:()=>new Promise(()=>{})})}});setup(h);
    const controller=new AbortController(),s=await ssh.openTerminal({profileId:'vm'},controller.signal);
    const read=s.output[Symbol.asyncIterator]().next();controller.abort();
    expect(await s.result).toMatchObject({reason:'cancelled',remoteProcessStopped:null});
    expect(await read).toMatchObject({done:true});await s.close();expect(h.close).toHaveBeenCalledOnce();
});
