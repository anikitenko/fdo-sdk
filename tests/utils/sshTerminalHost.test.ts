import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {Duplex} from 'node:stream';
const {openSSHTerminal}=createRequire(import.meta.url)('../../examples/host/sshTerminal.cjs');
class Channel extends Duplex {
    stderr=new Duplex({read(){},write(_b,_e,cb){cb();}});
    writes:Buffer[]=[];setWindow=vi.fn();signal=vi.fn();
    _read(){} _write(b:Buffer,_e:string,cb:()=>void){this.writes.push(Buffer.from(b));cb();}
}
function setup(extra:Record<string,unknown>={}) {
    const channel=new Channel(),client=Object.assign(new EventEmitter(),{shell:vi.fn((_p,_o,cb)=>cb(null,channel)),destroy:vi.fn()});
    const authorize=vi.fn(),onDispose=vi.fn();
    const options={profileId:'vm',term:'xterm-256color',rows:24,columns:80,idleTimeoutMs:100,sessionTimeoutMs:1000};
    return {channel,client,authorize,onDispose,open:()=>openSSHTerminal({client,options,authorize,onDispose,...extra})};
}
afterEach(()=>vi.useRealTimers());
test('host allocates requested PTY, ordered input/resize/EOF and preserves exit status',async()=>{
    const f=setup(),s=await f.open();expect(f.client.shell.mock.calls[0][0]).toMatchObject({term:'xterm-256color',rows:24,cols:80});
    const iterator=s.output[Symbol.asyncIterator](),waiting=iterator.next();f.channel.push(Buffer.from([27,91,72]));
    expect((await waiting).value).toEqual({sequence:0,data:Uint8Array.from([27,91,72])});
    await s.write(Uint8Array.of(3));await s.resize(40,120);await s.endInput();
    expect(f.channel.writes).toEqual([Buffer.from([3])]);expect(f.channel.setWindow).toHaveBeenCalledWith(40,120,0,0);
    f.channel.emit('exit',2,null);f.channel.emit('close');expect(await s.result).toMatchObject({reason:'exited',exitCode:2});expect(f.onDispose).toHaveBeenCalledOnce();
});
test('channel closure without an exit never confirms termination',async()=>{
    const f=setup(),s=await f.open();f.channel.emit('close');expect(await s.result).toEqual({reason:'closed',exitCode:null,signal:null,remoteProcessStopped:null});
});
test('idle and absolute deadlines terminate even with no output consumer',async()=>{
    vi.useFakeTimers();const f=setup(),s=await f.open();const idle=expect(s.result).rejects.toMatchObject({code:'IDLE_TIMEOUT'});await vi.advanceTimersByTimeAsync(101);await idle;
    const g=setup({options:{term:'xterm',rows:24,columns:80,idleTimeoutMs:10000,sessionTimeoutMs:50}}),t=await g.open();const absolute=expect(t.result).rejects.toMatchObject({code:'SESSION_LIMIT'});await vi.advanceTimersByTimeAsync(51);await absolute;
    expect(f.client.destroy).toHaveBeenCalledOnce();expect(g.client.destroy).toHaveBeenCalledOnce();
});
test('revocation, disconnect and explicit release wake blocked output readers',async()=>{
    for(const reason of ['revoke','disconnect','close']){
        const f=setup(),s=await f.open(),next=s.output[Symbol.asyncIterator]().next();
        const waiting=reason==='close'?expect(next).resolves.toMatchObject({done:true}):expect(next).rejects.toHaveProperty('code');
        const result=reason==='close'?expect(s.result).resolves.toMatchObject({reason:'closed'}):expect(s.result).rejects.toHaveProperty('code');
        if(reason==='revoke'){f.authorize.mockImplementation(()=>{throw {code:'ACCESS_DENIED'};});f.channel.push(Buffer.from('x'));}
        else if(reason==='disconnect')f.client.emit('close');else await s.close();
        await waiting;await result;expect(f.onDispose).toHaveBeenCalledOnce();
    }
});
test('bounded output pauses and fails explicitly if provider exceeds hard bound',async()=>{
    const f=setup(),s=await f.open();f.channel.push(Buffer.alloc(65536));await new Promise(r=>setTimeout(r,0));expect(f.channel.isPaused()).toBe(true);
    // A misbehaving provider can emit despite pause; fail rather than truncate terminal state.
    const failure=expect(s.result).rejects.toMatchObject({code:'BACKPRESSURE'});f.channel.emit('data',Buffer.alloc(262145));await failure;
});
test('X11 denial disposes local authorization and SSH transport, without shell fallback',async()=>{
    const f=setup(),dispose=vi.fn();f.client.shell.mockImplementation((_p,_o,cb)=>cb(new Error('provider private message')));
    await expect(openSSHTerminal({client:f.client,options:{term:'xterm',rows:24,columns:80,idleTimeoutMs:1000,sessionTimeoutMs:1000,x11:{mode:'trusted'}},authorize:f.authorize,localX11:{screen:0,cookie:Buffer.alloc(16),connect:vi.fn(),dispose}})).rejects.toMatchObject({code:'X11_FORWARDING_DENIED'});
    expect(dispose).toHaveBeenCalledOnce();expect(f.client.shell).toHaveBeenCalledOnce();expect(f.client.destroy).toHaveBeenCalledOnce();
});
test('cancel/close races are idempotent and cancellation is not termination proof',async()=>{
    const f=setup(),s=await f.open();expect(await s.cancel()).toEqual({remoteProcessStopped:null});await s.cancel();await s.close();
    expect(await s.result).toMatchObject({reason:'cancelled',remoteProcessStopped:null});expect(f.onDispose).toHaveBeenCalledOnce();
});
