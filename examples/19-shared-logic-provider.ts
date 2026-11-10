import {FDO_SDK, PluginCapability, PluginMetadata, SharedLogicContext, sharedFunction} from '@anikitenko/fdo-sdk';
import {createWebsiteCheckUI} from './shared/website-check-ui';

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
    async check(input: {url: string}, context: SharedLogicContext) {
        if (!input || typeof input.url !== 'string') throw new Error('A URL is required.');
        const url = new URL(input.url);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('An HTTPS URL without credentials is required.');
        // The host fetch policy inspects a normalized URL before dispatch.
        const response = await fetch(url.href, {method:'HEAD',redirect:'error',signal:context.signal});
        return {available:response.ok,status:response.status};
    }
    render(): string {
        const {dom, text, styles} = createWebsiteCheckUI();
        return dom.renderHTML(dom.createElement('main', {className:styles.shell, 'aria-label':'Website availability provider'}, [
            dom.createElement('header', {className:styles.card}, [
                text.createPText('Shared plugin logic', {classes:[styles.eyebrow]}),
                text.createHText(1, 'Website availability'),
                text.createPText('Provider · v1', {classes:[styles.badge]}),
                text.createPText('This plugin exports website-availability v1.'),
                text.createPText('Reuse the same website checks across your plugins, with explicit approval for each consumer.'),
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
}

// FDO registers the plugin when its entry constructs the SDK subclass.
new WebsiteAvailabilityProvider();
