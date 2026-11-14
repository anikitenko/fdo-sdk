import type { PluginCapability, PluginMetadata, SharedLogicContext } from '@anikitenko/fdo-sdk';
import { DOMButton, DOMInput, FDO_SDK, SharedLogicError, defineRenderOnLoadActions, handler, sharedFunction } from '@anikitenko/fdo-sdk';
import { createWebsiteCheckUI } from './shared/website-check-ui';

/** Start this plugin and explicitly approve its declared grants in Manage Plugins. */
export default class WebsiteAvailabilityProvider extends FDO_SDK {
    private readonly _metadata: PluginMetadata = {id:'website-availability-provider',name:'Website Availability Provider',version:'1.0.0',author:'FDO SDK Team',description:'Exports reusable, versioned website checks to explicitly approved plugins.',icon:'globe'};
    get metadata(): PluginMetadata { return this._metadata; }
    declareCapabilities(): PluginCapability[] {
        return ['plugins.shared.provide','system.network','system.network.https','system.network.scope.public-web-secure'];
    }
    init(): void {}

    @sharedFunction({
        service:'website-availability', version:1,
        description:'Check an approved HTTPS website with an HTTP HEAD request.',
        contract:{input:{type:'object',properties:{url:{type:'string'}},required:['url']},
            output:{type:'object',properties:{available:{type:'boolean'},status:{type:'integer'}},required:['available','status']}},
    })
    async check(input: {url: string}, context?: SharedLogicContext) {
        if (!input || typeof input.url !== 'string') throw new SharedLogicError('INVALID_REQUEST');
        let url: URL;
        try { url = new URL(input.url.trim()); }
        catch { throw new SharedLogicError('INVALID_REQUEST'); }
        if (url.protocol !== 'https:' || url.username || url.password) throw new SharedLogicError('INVALID_REQUEST');
        // Shared calls carry the caller's cancellation signal. Local calls use
        // this plugin's lifecycle signal, so unloading also aborts its own checks.
        const signal = context?.signal ?? this.signal;
        if (signal.aborted) throw new SharedLogicError('CANCELLED');
        // The host fetch policy inspects a normalized URL before dispatch.
        const response = await fetch(url.href, {method:'HEAD',redirect:'error',signal});
        return {available:response.ok,status:response.status};
    }

    @handler()
    async checkWebsite(input: unknown) {
        try {
            // Reuse our exported method directly; only other plugins need a
            // shared client and an explicitly approved service capability.
            const result = await this.check(input as {url: string});
            return {ok:true,...result};
        } catch (error) {
            return {ok:false,code:this.signal.aborted ? 'CANCELLED'
                : error instanceof SharedLogicError ? error.code : 'SERVICE_ERROR'};
        }
    }

    render(): string {
        const {dom, text, styles} = createWebsiteCheckUI();
        const input = new DOMInput('provider-check-url', {style:{
            width:'100%',boxSizing:'border-box',minHeight:'44px',borderRadius:'6px',
            border:'1px solid rgba(127,127,127,0.5)',padding:'10px 12px',
            background:'transparent',color:'inherit',font:'inherit',
        }}, {value:'https://example.com',placeholder:'https://example.com',required:true,'aria-describedby':'provider-check-hint'});
        const button = new DOMButton();
        dom.collectStylesFrom(input, button);
        const action = dom.createClassFromStyle({
            justifySelf:'start',minHeight:'44px',padding:'10px 16px',borderRadius:'6px',
            font:'inherit',fontWeight:'600',cursor:'pointer',
            '&:disabled':{opacity:'0.6',cursor:'wait'},
            '&:focus-visible':{outline:'2px solid var(--fdo-ui-accent-color, #2d72d2)',outlineOffset:'3px'},
            '@media (max-width: 560px)':{width:'100%'},
        });
        return dom.renderHTML(dom.createElement('main', {className:styles.shell, 'aria-label':'Website availability provider'}, [
            dom.createElement('header', {className:styles.card}, [
                text.createPText('Shared plugin logic', {classes:[styles.eyebrow]}),
                text.createHText(1, 'Website availability'),
                text.createPText('Provider · v1', {classes:[styles.badge]}),
                text.createPText('This plugin exports website-availability v1.'),
                text.createPText('Reuse the same website checks across your plugins, with explicit approval for each consumer.'),
            ]),
            dom.createElement('section', {id:'provider-check-controls',className:styles.card,'aria-label':'Run a local website check'}, [
                text.createHText(2, 'Check a website here'),
                text.createPText('This plugin calls its own exported check() method. Approved consumers reuse that same implementation.'),
                text.createLabelText('HTTPS website URL', 'provider-check-url'),
                input.createInput('url'),
                text.createPText('Use an HTTPS URL without embedded credentials.', {}, 'provider-check-hint'),
                button.createStaticButton('Check website', {classes:[action],style:{background:'var(--fdo-ui-accent-color, #2d72d2)',color:'#fff',border:'1px solid transparent'}}, 'provider-check-button', {type:'button'}),
                dom.createElement('p', {id:'provider-check-result',role:'status','aria-live':'polite'}, 'Ready to run this plugin’s website check.'),
            ]),
            dom.createElement('div', {className:styles.grid}, [
                dom.createElement('section', {className:styles.card}, [
                    text.createHText(2, 'Exported method'),
                    dom.createElement('code', {}, 'check({ url }) → { available, status }'),
                    text.createPText('Checks an HTTPS website using HEAD. It does not download the page or follow redirects.'),
                ]),
                dom.createElement('section', {className:styles.card}, [
                    text.createHText(2, 'Approve before sharing'),
                    text.createPText('Approve this provider’s export and network permissions in Manage Plugins. Consumers need their own exact service grant.'),
                    text.createPText('The provider must stay running. Stopping it removes its shared service.'),
                ]),
            ]),
        ]));
    }

    renderOnLoad() {
        return defineRenderOnLoadActions({
            lifecycleKey:'provider-website-check',
            handlers:{
                checkWebsite: async ({element, document, window}) => {
                    const button = element as HTMLButtonElement;
                    const input = document.getElementById('provider-check-url') as HTMLInputElement | null;
                    const controls = document.getElementById('provider-check-controls');
                    const output = document.getElementById('provider-check-result');
                    if (!input || !controls || !output || button.disabled) return;
                    button.disabled = true;
                    button.textContent = 'Checking…';
                    controls.setAttribute('aria-busy', 'true');
                    output.textContent = 'Running this plugin’s website check…';
                    try {
                        const reply = await window.createBackendReq('UI_MESSAGE', {handler:'checkWebsite',content:{url:input.value.trim()}});
                        const result = reply?.result ?? reply;
                        if (result?.ok && typeof result.available === 'boolean' && Number.isInteger(result.status)) {
                            output.textContent = (result.available ? 'Available' : 'Unavailable')
                                + ' — HTTP ' + result.status + ' (checked by this plugin’s exported method).';
                        } else {
                            output.textContent = result?.code === 'INVALID_REQUEST'
                                ? 'Enter an HTTPS URL without embedded credentials.'
                                : result?.code === 'CANCELLED' ? 'The website check was cancelled.'
                                : 'Could not check this website. Review its URL and this plugin’s network permissions in Manage Plugins.';
                        }
                    } catch {
                        output.textContent = 'Could not reach the plugin backend. Restart the provider and try again.';
                    } finally {
                        button.disabled = false;
                        button.textContent = 'Check website';
                        controls.removeAttribute('aria-busy');
                    }
                },
                enterToCheck: ({event, document}) => {
                    if ((event as KeyboardEvent).key === 'Enter') {
                        event.preventDefault();
                        document.getElementById('provider-check-button')?.click();
                    }
                },
            },
            bindings:[
                {selector:'#provider-check-button',event:'click',handler:'checkWebsite',preventDefault:true},
                {selector:'#provider-check-url',event:'keydown',handler:'enterToCheck'},
            ],
        });
    }
}

// FDO registers the plugin when its entry constructs the SDK subclass.
new WebsiteAvailabilityProvider();
