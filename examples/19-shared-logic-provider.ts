import {FDO_SDK, PluginCapability, PluginMetadata} from '@anikitenko/fdo-sdk';

/** Start this plugin and explicitly approve its declared grants in Manage Plugins. */
export default class WebsiteAvailabilityProvider extends FDO_SDK {
    private readonly _metadata: PluginMetadata = {id:'website-availability-provider',name:'Website Availability Provider',version:'1.0.0',author:'FDO SDK Team',description:'Exports reusable, versioned website checks to explicitly approved plugins.',icon:'globe'};
    get metadata(): PluginMetadata { return this._metadata; }
    declareCapabilities(): PluginCapability[] {
        return ['plugins.shared.provide','system.network','system.network.https','system.network.scope.public-web-secure'];
    }
    init(): void {
        // Registration is synchronous; registration.ready can be awaited by background
        // startup work. The SDK observes registration failures and unregisters on unload.
        this.shared.register({name:'website-availability',version:1,description:'Check an approved HTTPS website with an HTTP HEAD request.'}, {
            check: async (input: {url: string}, context) => {
                if (!input || typeof input.url !== 'string') throw new Error('A URL is required.');
                const url = new URL(input.url);
                if (url.protocol !== 'https:' || url.username || url.password) throw new Error('An HTTPS URL without credentials is required.');
                const response = await fetch(url, {method:'HEAD',redirect:'error',signal:context.signal});
                return {available:response.ok,status:response.status};
            },
        });
    }
    render(): string {
        return '<p>This plugin exports website-availability v1. Consumers need a separate grant for its exported capability.</p>';
    }
}
