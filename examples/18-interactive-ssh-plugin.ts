/** Minimal lossless, one-view terminal. Requires the proposed host terminal renderer injection
 * in docs/SSH_TERMINALS.md; current FDO has no such injection. No emulator dependency is bundled.
 */
import {FDO_SDK, PluginRegistry, HostServiceError, createSSHCapabilityBundle} from '@anikitenko/fdo-sdk';
import type {SSHTerminalSession, SSHTerminalResult, SSHTerminalOutput} from '@anikitenko/fdo-sdk';
import {randomUUID} from 'node:crypto';

type Run = {id:string; touched:number; session?:SSHTerminalSession; controller:AbortController;
    packet?:SSHTerminalOutput; acknowledge?:()=>void; done:boolean; result?:SSHTerminalResult; error?:string};
export default class InteractiveSSHExample extends FDO_SDK {
    get metadata() {return {name:'Interactive SSH example',version:'1.0.0',author:'FDO SDK',description:'PTY and optional X11 through host profiles',icon:'console'};}
    // Explicit declarations only. Host approval of arbitrary input and X11 mode is separate.
    declareCapabilities() {return createSSHCapabilityBundle({terminal:true,x11:true});}
    init():void {
        let run:Run|undefined;
        const release = () => {if(run){const old=run;run=undefined;old.controller.abort();old.acknowledge?.();void old.session?.close().catch(()=>{});}};
        const timer=setInterval(()=>{if(run && Date.now()-run.touched>30000)release();},1000);timer.unref?.();
        const data = (v:unknown):Record<string,unknown> => {
            if(!v || typeof v!=='object' || Array.isArray(v))throw new HostServiceError('INVALID_REQUEST');return v as Record<string,unknown>;
        };
        const current = (v:Record<string,unknown>) => {
            if(!run || v.id!==run.id)throw new HostServiceError('ACCESS_DENIED');run.touched=Date.now();return run;
        };
        const register = (name:string,handler:(v:Record<string,unknown>)=>unknown) => PluginRegistry.registerHandler(`terminal.${name}`,async(v:unknown)=>{
            try{return {ok:true,data:await handler(data(v))};}catch(e){return {ok:false,code:e instanceof HostServiceError?e.code:'UNAVAILABLE'};}
        });
        register('open',v=>{
            if(run)throw new HostServiceError('SESSION_LIMIT');
            if(typeof v.profileId!=='string'||!['off','trusted','untrusted'].includes(v.mode as string))throw new HostServiceError('INVALID_REQUEST');
            const entry:Run={id:randomUUID(),touched:Date.now(),controller:new AbortController(),done:false};run=entry;
            // Return promptly: FDO serializes UI handlers. Never await the whole session in a handler.
            void (async()=>{
                try{
                    const session=entry.session=await this.ssh.openTerminal({profileId:v.profileId as string,
                        ...(v.mode==='off'?{}:{x11:{mode:v.mode as 'trusted'|'untrusted'}})},entry.controller.signal);
                    const result=session.result.then(value=>{entry.result=value;},e=>{entry.error=e instanceof HostServiceError?e.code:'UNAVAILABLE';});
                    for await(const packet of session.output){
                        if(run!==entry)break;
                        await new Promise<void>(resolve=>{entry.acknowledge=resolve;entry.packet=packet;});
                    }
                    await result;
                }catch(e){entry.error=e instanceof HostServiceError?e.code:'UNAVAILABLE';}
                finally{entry.done=true;void entry.session?.close().catch(()=>{});}
            })();
            return {id:entry.id};
        });
        register('poll',v=>{
            const r=current(v);
            if(r.packet && v.ack===r.packet.sequence){r.packet=undefined;r.acknowledge?.();r.acknowledge=undefined;}
            return {ready:!!r.session,packet:r.packet?{sequence:r.packet.sequence,bytes:Array.from(r.packet.data)}:null,done:r.done,result:r.result,error:r.error};
        });
        register('input',async v=>{
            const r=current(v);if(!r.session)throw new HostServiceError('UNAVAILABLE');
            if(typeof v.text!=='string' || v.text.length>8192)throw new HostServiceError('INVALID_REQUEST');
            await r.session.write(v.text);return {};
        });
        register('resize',async v=>{const r=current(v);if(!r.session)throw new HostServiceError('UNAVAILABLE');await r.session.resize(v.rows as number,v.columns as number);return {};});
        register('eof',async v=>{const r=current(v);await r.session?.endInput();return {};});
        register('close',v=>{current(v);release();return {};});
        register('cancel',v=>{const r=current(v);r.controller.abort();return {requested:true,remoteProcessStopped:null};});
        // Host worker teardown must close its authenticated endpoint even if this timer cannot run.
    }
    render():string {return '<div><label>Host profile ID <input id="terminal-profile" /></label><label> X11 <select id="terminal-mode"><option value="off">Off</option><option value="untrusted">Untrusted (requires X SECURITY)</option><option value="trusted">Trusted (local display access)</option></select></label><button id="terminal-open" class="pure-button">Open terminal</button><button id="terminal-close" class="pure-button">Close session</button><p id="terminal-status" role="status"></p><div id="terminal-screen" aria-label="Remote terminal" /></div>';}
    renderOnLoad():string {return `(${mountTerminalExample.toString()})();`;}
}

/** Serialized into the iframe; depends only on host-injected globals. */
function mountTerminalExample() {
    const win=window as any, screen=document.getElementById('terminal-screen')!,status=document.getElementById('terminal-status')!;
    // Proposed, documented host wrapper, NOT an existing FDO injected API.
    if(!win.FDOTerminal){status.textContent='This host needs a terminal emulator injection. See the SDK terminal host handoff.';return;}
    let id='',ready=false,disposed=false,polling=false,ack=-1,queued=0,pending=0,tail=Promise.resolve();
    const term=win.FDOTerminal.create(screen,{term:'xterm-256color',rows:24,columns:80});
    const request=async(name:string,content:Record<string,unknown>)=>{
        const raw=await win.createBackendReq('UI_MESSAGE',{handler:`terminal.${name}`,content});
        const response=typeof raw==='string'?JSON.parse(raw):raw;
        const result=response?.result??response?.content??response;
        if(!result.ok)throw new Error(result.code||'UNAVAILABLE');return result.data;
    };
    const report=(e:unknown)=>{status.textContent=e instanceof Error?e.message:'Terminal failed';};
    const subscriptions=[term.onData((text:string)=>{
        if(!id||!ready)return;
        const active=id;
        const bytes=new TextEncoder().encode(text).length;
        if(text.length>8192||pending>=32||bytes>32768||queued+bytes>65536){report(new Error('Input pressure limit reached; session closed.'));void close();return;}
        pending++;queued+=bytes;
        tail=tail.then(()=>id===active?request('input',{id:active,text}):undefined).catch(e=>{report(e);void close();}).finally(()=>{pending--;queued-=bytes;});
    }),term.onResize(({rows,columns}:{rows:number;columns:number})=>{
        const active=id;
        if(active && ready && queued===0){queued=1;tail=tail.then(()=>id===active?request('resize',{id:active,rows,columns}):undefined).catch(report).finally(()=>{queued-=1;});}
    })];
    const close=async()=>{const old=id;id='';ready=false;if(old)await request('close',{id:old}).catch(report);};
    document.getElementById('terminal-open')!.onclick=async()=>{
        try{
            await close();term.reset();ack=-1;
            const opened=await request('open',{profileId:(document.getElementById('terminal-profile') as HTMLInputElement).value,mode:(document.getElementById('terminal-mode') as HTMLSelectElement).value});
            id=opened.id;status.textContent='Opening authorized session…';term.focus();
        }catch(e){report(e);}
    };
    document.getElementById('terminal-close')!.onclick=()=>{void close();};
    const timer=setInterval(async()=>{
        if(!id||polling||disposed)return;polling=true;const active=id;
        try{
            const state=await request('poll',{id:active,ack});if(id!==active)return;
            if(state.ready&&!ready){const {rows,columns}=term.getSize();await request('resize',{id:active,rows,columns});if(id!==active)return;ready=true;}
            if(state.packet && state.packet.sequence!==ack){
                if(state.packet.sequence!==ack+1){report(new Error('Terminal output gap'));await close();return;}
                // The host wrapper must acknowledge only after emulator consumption; bytes remain raw.
                await new Promise<void>(resolve=>term.write(Uint8Array.from(state.packet.bytes),resolve));ack=state.packet.sequence;
            }
            if(state.done){status.textContent=state.error||`Session ${state.result?.reason}; exit ${state.result?.exitCode??'unknown'}.`;await close();}
            else if(state.ready)status.textContent='Interactive shell. Ctrl+C sends terminal input.';
        }catch(e){report(e);await close();}finally{polling=false;}
    },50);
    const dispose=()=>{if(disposed)return;disposed=true;clearInterval(timer);void close();subscriptions.forEach(s=>s.dispose());term.dispose();observer.disconnect();};
    const observer=new MutationObserver(()=>{if(!screen.isConnected)dispose();});observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pagehide',dispose,{once:true});
}
new InteractiveSSHExample();
