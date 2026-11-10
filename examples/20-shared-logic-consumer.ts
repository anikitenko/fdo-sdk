import {FDO_SDK, PluginRegistry, PluginCapability, PluginMetadata, sharedLogicCapability} from '@anikitenko/fdo-sdk';

// Replace providerId with the installed provider ID shown in Manage Plugins.
const target = {providerId:'website-availability-provider',name:'website-availability',version:1};
type WebsiteChecks = {check: (input: {url:string}) => {available:boolean;status:number}};

export default class WebsiteCheckConsumer extends FDO_SDK {
    private readonly _metadata: PluginMetadata = {id:'website-check-consumer',name:'Shared Website Check Consumer',version:'1.0.0',author:'FDO SDK Team',description:'Reuses a website-check provider through an explicitly approved service capability.',icon:'link'};
    get metadata(): PluginMetadata { return this._metadata; }
    declareCapabilities(): PluginCapability[] {
        return ['plugins.shared.use',sharedLogicCapability(target)];
    }
    init(): void {
        const checks = this.shared.client<WebsiteChecks>(target);
        PluginRegistry.registerHandler('checkWebsite', async (input: unknown) => {
            if (!input || typeof (input as {url?: unknown}).url !== 'string') throw new Error('A URL is required.');
            return checks.call('check',{url: (input as {url: string}).url},{timeoutMs:10000});
        });
    }
    render(): string {
        return '<p>The checkWebsite backend handler reuses website-availability v1. Start the provider and approve its exact service capability under Use shared plugin logic.</p>';
    }
}
