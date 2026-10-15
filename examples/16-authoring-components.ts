import {
    DOM, createInlineAlert, createToast, createToastRegion, createAsyncActionButton, createTabs, createDisclosure, createAccordion,
    mountInlineAlert, mountToastRegion, mountAsyncActionButton, mountTabs, mountDisclosure, mountAccordion,
} from '@anikitenko/fdo-sdk/ui';

/** Pure serializable composition; pass a document-unique prefix per view. */
export function authoringMarkup(prefix: string): string {
    const dom = new DOM().collectStylesFrom();
    return dom.renderHTML(createInlineAlert(dom, { id: `${prefix}-alert`, message: 'Review your settings.', variant: 'info' }) +
        createAsyncActionButton(dom, { id: `${prefix}-save`, label: 'Save', pendingLabel: 'Saving…', successLabel: 'Saved' }) +
        createToastRegion(dom, { id: `${prefix}-notices`, label: 'Notifications', body:
            createToast(dom, { id: `${prefix}-saved`, message: 'Settings saved.', variant: 'success' }) +
            createToast(dom, { id: `${prefix}-next`, message: 'You can continue editing.' }) }) +
        createTabs(dom, { id: `${prefix}-tabs`, label: 'Settings', items: [
            { key: 'general', label: 'General', body: '<p>General settings.</p>' },
            { key: 'advanced', label: 'Advanced', body: '<p>Advanced settings.</p>' },
        ] }) +
        createDisclosure(dom, { id: `${prefix}-help`, title: 'Help', body: '<p>Details about these settings.</p>' }) +
        createAccordion(dom, { id: `${prefix}-connections`, label: 'Connections', items: [
            { key: 'local', title: 'Local', body: '<p>Local connection.</p>' },
            { key: 'remote', title: 'Remote', body: '<p>Remote connection.</p>' },
        ] }));
}
/** Frontend-only. The caller supplies work/capabilities/transports; signal cancellation cannot undo external effects. */
export function mountAuthoring(scope: HTMLElement, prefix: string, save: (signal: AbortSignal) => Promise<void>) {
    const element = (suffix: string): HTMLElement => {
        const found = Array.from(scope.querySelectorAll<HTMLElement>('[id]')).find(node => node.id === `${prefix}-${suffix}`);
        if (!found) throw new Error(`Missing ${prefix}-${suffix}; insert authoringMarkup() first.`);
        return found;
    };
    const cleanup: Array<() => void> = [];
    const own = <T extends { destroy(): void }>(controller: T): T => { cleanup.push(() => controller.destroy()); return controller; };
    try {
        const alert = own(mountInlineAlert(element('alert')));
        const region = own(mountToastRegion(element('notices'), { maxVisible: 1, maxQueued: 10 }));
        const action = own(mountAsyncActionButton(element('save'), { onAction: async ({ signal }) => {
            await save(signal);
            if (signal.aborted) return;
            alert.update({ message: 'Settings saved.', variant: 'success' });
            region.enqueue(element('saved'), { key: 'saved', duration: 5000 });
            region.enqueue(element('next'), { key: 'next' });
        } }));
        const tabs = own(mountTabs(element('tabs'), { activation: 'manual' }));
        const help = own(mountDisclosure(element('help')));
        const accordion = own(mountAccordion(element('connections')));
        return { action, alert, region, tabs, help, accordion, destroy() { for (const destroy of cleanup.splice(0).reverse()) destroy(); } };
    } catch (error) { for (const destroy of cleanup.splice(0).reverse()) destroy(); throw error; }
}
