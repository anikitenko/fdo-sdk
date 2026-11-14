import { defineRenderOnLoadActions, DOMButton, DOMInput, FDO_SDK, handler, type PluginCapability, type PluginMetadata, sharedLogicCapability } from '@anikitenko/fdo-sdk';
import { createWebsiteCheckUI } from './shared/website-check-ui';

// Replace providerId with the installed provider ID shown in Manage Plugins.
const target = {providerId:'website-availability-provider',name:'website-availability',version:1} as const;
type WebsiteChecks = {check: (input: {url:string}) => {available:boolean;status:number}};

export default class WebsiteCheckConsumer extends FDO_SDK {
    private readonly _metadata: PluginMetadata = {id:'website-check-consumer',name:'Shared Website Check Consumer',version:'1.0.0',author:'FDO SDK Team',description:'Reuses a website-check provider through an explicitly approved service capability.',icon:'link'};
    get metadata(): PluginMetadata { return this._metadata; }
    declareCapabilities(): PluginCapability[] {
        return ['plugins.shared.use',sharedLogicCapability(target)];
    }
    init(): void {}

    @handler()
    requestSharedWebsiteAccess() {
        return this.shared.requestAccess(target);
    }

    @handler()
    async checkWebsite(input: unknown) {
        const checks = this.shared.client<WebsiteChecks>(target);
        if (!input || typeof (input as {url?: unknown}).url !== 'string') {
            return {ok:false,code:'INVALID_REQUEST'};
        }
        let url: URL;
        try {
            url = new URL((input as {url: string}).url.trim());
        } catch { return {ok:false,code:'INVALID_REQUEST'}; }
        if (url.protocol !== 'https:' || url.username || url.password) {
            return {ok:false,code:'INVALID_REQUEST'};
        }
        try {
            const result = await checks.call('check',{url:url.href},{timeoutMs:10000});
            return {ok:true,...result};
        } catch (error) {
            // Return failures explicitly: the legacy handler bridge converts
            // thrown handler errors to null, losing useful shared-service codes.
            const code = (error as {code?: string})?.code;
            return {ok:false,code:code || 'SERVICE_ERROR'};
        }
    }
    render(): string {
        const {dom, text, styles} = createWebsiteCheckUI();
        const input = new DOMInput('check-website-url', {style:{
            width:'100%', boxSizing:'border-box', minHeight:'44px', borderRadius:'6px',
            border:'1px solid rgba(127,127,127,0.5)', padding:'10px 12px',
            background:'transparent', color:'inherit', font:'inherit',
        }}, {value:'https://example.com',placeholder:'https://example.com',required:true,'aria-describedby':'check-website-hint'});
        const button = new DOMButton();
        dom.collectStylesFrom(input, button);
        const actions = dom.createClassFromStyle({
            display:'flex', flexWrap:'wrap', gap:'12px',
            '& button':{minHeight:'44px',padding:'10px 16px',borderRadius:'6px',font:'inherit',fontWeight:'600',cursor:'pointer'},
            '& button:disabled':{opacity:'0.6',cursor:'wait'},
            '& button:focus-visible':{outline:'2px solid var(--fdo-ui-accent-color, #2d72d2)',outlineOffset:'3px'},
            '@media (max-width: 560px)':{'& button':{width:'100%'}},
        });
        const status = dom.createClassFromStyle({
            padding:'16px',border:'1px solid rgba(127,127,127,0.3)',borderLeftWidth:'4px',borderRadius:'6px',
            '&[data-state="pending"]':{borderLeftColor:'#2d72d2'},
            '&[data-state="success"]':{borderLeftColor:'#0f9960'},
            '&[data-state="warning"]':{borderLeftColor:'#d9822b'},
            '&[data-state="error"]':{borderLeftColor:'#db3737'},
        });
        return dom.renderHTML(dom.createElement('main', {className:styles.shell,'aria-label':'Shared website check'}, [
            dom.createElement('header', {className:styles.card}, [
                text.createPText('Shared plugin logic', {classes:[styles.eyebrow]}),
                text.createHText(1, 'Shared website check'),
                text.createPText('Consumer · v1', {classes:[styles.badge]}),
                text.createPText('The checkWebsite backend handler reuses website-availability v1.'),
            ]),
            dom.createElement('div', {className:styles.grid}, [
                dom.createElement('section', {id:'check-website-controls',className:styles.card,'aria-label':'Website check'}, [
                    text.createHText(2, 'Check a website'),
                    text.createLabelText('HTTPS website URL', 'check-website-url'),
                    input.createInput('url'),
                    text.createPText('Use an HTTPS URL without embedded credentials.', {}, 'check-website-hint'),
                    dom.createElement('div', {className:actions}, [
                        button.createStaticButton('Check website', {style:{background:'var(--fdo-ui-accent-color, #2d72d2)',color:'#fff',border:'1px solid transparent'}}, 'check-website-button', {type:'button'}),
                        button.createStaticButton('Request shared-service access', {style:{background:'transparent',color:'inherit',border:'1px solid rgba(127,127,127,0.5)'}}, 'request-shared-access', {type:'button'}),
                    ]),
                    dom.createElement('p', {id:'check-website-result',className:status,role:'status','aria-live':'polite','data-state':'ready'}, 'Ready to check through the shared provider.'),
                ]),
                dom.createElement('section', {className:styles.card}, [
                    text.createHText(2, 'Provider and permissions'),
                    dom.createElement('code', {}, `${target.providerId} / ${target.name} v${target.version}`),
                    text.createPText('Start the provider and approve its exact service capability under Use shared plugin logic.'),
                    text.createPText('Requesting access creates a pending review in Manage Plugins. It does not grant permissions or start the provider.'),
                ]),
            ]),
        ]));
    }

    renderOnLoad() {
        return defineRenderOnLoadActions({
            lifecycleKey:'shared-website-check',
            handlers: {
                requestAccess: async ({element, document, window}) => {
                    const access = element as HTMLButtonElement;
                    const output = document.getElementById('check-website-result');
                    if (!output || access.disabled) return;
                    access.disabled = true;
                    try {
                        const reply = await window.createBackendReq('UI_MESSAGE', { handler: 'requestSharedWebsiteAccess' });
                        const result = reply?.result ?? reply;
                        output.textContent = result?.state === 'pending'
                            ? 'Access request created. Open Manage Plugins to review and approve or dismiss it.'
                            : result?.state === 'approved' ? 'This shared service is already approved.'
                                : 'Could not create the request. Open Manage Plugins to create it manually.';
                        output.dataset.state = result?.state === 'pending' || result?.state === 'approved' ? 'ready' : 'error';
                    } catch {
                        output.textContent = 'Could not create the request. Open Manage Plugins to create it manually.';
                        output.dataset.state = 'error';
                    } finally {
                        access.disabled = false;
                    }
                },
                checkWebsite: async ({element, document, window}) => {
                    const button = element as HTMLButtonElement;
                    const input = document.getElementById('check-website-url') as HTMLInputElement | null;
                    const controls = document.getElementById('check-website-controls');
                    const output = document.getElementById('check-website-result');
                    if (!input || !controls || !output || button.disabled) return;
                    const errors: Record<string, string> = {
                        INVALID_REQUEST: 'Enter an HTTPS URL without embedded credentials.',
                        ACCESS_DENIED: 'Approve the consumer shared-service grants and the provider network grants in Manage Plugins, then restart them.',
                        UNAVAILABLE: 'The shared provider is unavailable. Start Website Availability Provider and try again.',
                        NOT_FOUND: 'The website check service was not found. Check the provider ID and service version.',
                        TIMEOUT: 'The website check timed out. Try again when the website responds.',
                        BACKPRESSURE: 'The shared provider is busy. Try again shortly.',
                        CANCELLED: 'The website check was cancelled.',
                        SERVICE_ERROR: 'The provider could not check this website. Check its URL and network access.',
                    };
                    button.disabled = true;
                    button.textContent = 'Checking…';
                    controls.setAttribute('aria-busy', 'true');
                    output.textContent = 'Checking through website-availability v1…';
                    output.dataset.state = 'pending';
                    try {
                        const response = await window.createBackendReq('UI_MESSAGE', { handler: 'checkWebsite', content: { url: input.value.trim() } });
                        const result = response?.result ?? response;
                        if (!result?.ok) {
                            output.textContent = errors[result?.code] || 'The check failed. Make sure both plugins are running and their permissions are approved.';
                            output.dataset.state = 'error';
                        } else if (typeof result.available === 'boolean' && Number.isInteger(result.status)) {
                            output.textContent = (result.available ? 'Available' : 'Unavailable') + ' — HTTP ' + result.status + ' (checked by the shared provider).';
                            output.dataset.state = result.available ? 'success' : 'warning';
                        } else {
                            output.textContent = 'The provider returned an unexpected response.';
                            output.dataset.state = 'error';
                        }
                    } catch {
                        output.textContent = 'Could not reach the plugin backend. Restart the consumer and try again.';
                        output.dataset.state = 'error';
                    } finally {
                        button.disabled = false;
                        button.textContent = 'Check website';
                        controls.removeAttribute('aria-busy');
                    }
                },
                enterToCheck: ({event, document}) => {
                    if ((event as KeyboardEvent).key === 'Enter') {
                        event.preventDefault();
                        document.getElementById('check-website-button')?.click();
                    }
                },
            },
            bindings:[
                {selector:'#request-shared-access',event:'click',handler:'requestAccess',preventDefault:true},
                {selector:'#check-website-button',event:'click',handler:'checkWebsite',preventDefault:true},
                {selector:'#check-website-url',event:'keydown',handler:'enterToCheck'},
            ],
        });
    }
}

// FDO registers the plugin when its entry constructs the SDK subclass.
new WebsiteCheckConsumer();
