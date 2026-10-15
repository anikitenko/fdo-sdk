import type { DOM } from '../DOM';
import type {
    DialogMarkupOptions, ConfirmationDialogMarkupOptions, PopoverMarkupOptions, ProgressBarMarkupOptions, ToastMarkupOptions,
    InlineAlertMarkupOptions, ToastRegionMarkupOptions, AsyncActionButtonMarkupOptions, TabsMarkupOptions, DisclosureMarkupOptions, AccordionMarkupOptions, ComponentGalleryOptions,
} from './types';
import { UI_COMPONENT_DEFINITIONS } from './metadata';
import { createDialog, createConfirmationDialog, createPopover } from './markup';
import { createProgressBar, createToast } from './feedback-markup';
import { createInlineAlert, createToastRegion, createAsyncActionButton, createTabs, createDisclosure, createAccordion } from './authoring-markup';
import { uiElement as el, uiText as text, validId } from './component-internals';

/** Compiler-checked, serializable SDK preview inputs. No callbacks, backend requests or source history. */
export interface ComponentPreviewOptionsMap {
    'fdo.dialog': DialogMarkupOptions;
    'fdo.confirmation-dialog': ConfirmationDialogMarkupOptions;
    'fdo.popover': PopoverMarkupOptions;
    'fdo.progress-bar': ProgressBarMarkupOptions;
    'fdo.toast': ToastMarkupOptions;
    'fdo.inline-alert': InlineAlertMarkupOptions;
    'fdo.toast-region': ToastRegionMarkupOptions;
    'fdo.async-action-button': AsyncActionButtonMarkupOptions;
    'fdo.tabs': TabsMarkupOptions;
    'fdo.disclosure': DisclosureMarkupOptions;
    'fdo.accordion': AccordionMarkupOptions;
}
export type ComponentPreviewCase = { [K in keyof ComponentPreviewOptionsMap]: {
    id: string; identity: K; state: string; properties: ComponentPreviewOptionsMap[K];
} }[keyof ComponentPreviewOptionsMap];
const samples: { [K in keyof ComponentPreviewOptionsMap]: ComponentPreviewOptionsMap[K] } = {
    'fdo.dialog': { id: 'dialog', title: 'Details', body: '<p>Review the settings.</p>' },
    'fdo.confirmation-dialog': { id: 'confirmation', title: 'Save changes?', body: '<p>Confirm your selection.</p>' },
    'fdo.popover': { id: 'popover', title: 'Options', body: '<p>Contextual content.</p>' },
    'fdo.progress-bar': { id: 'progress', label: 'Files uploaded', value: 60 },
    'fdo.toast': { id: 'toast', title: 'Upload', message: 'Files are uploading.', progress: { label: 'Upload progress', value: 60 } },
    'fdo.inline-alert': { id: 'alert', title: 'Saved', message: 'Your settings are available.' },
    'fdo.toast-region': { id: 'region', label: 'Notifications' },
    'fdo.async-action-button': { id: 'action', label: 'Save', pendingLabel: 'Saving…', successLabel: 'Saved' },
    'fdo.tabs': { id: 'tabs', label: 'Settings', items: [{ key: 'general', label: 'General', body: '<p>General settings.</p>' }, { key: 'advanced', label: 'Advanced', body: '<p>Advanced settings.</p>' }, { key: 'unavailable', label: 'Unavailable', body: '', disabled: true }] },
    'fdo.disclosure': { id: 'disclosure', title: 'Connection details', body: '<p>Connection information.</p>' },
    'fdo.accordion': { id: 'accordion', label: 'Connection settings', items: [{ key: 'local', title: 'Local', body: '<p>Local settings.</p>' }, { key: 'remote', title: 'Remote', body: '<p>Remote settings.</p>' }] },
};
function freezePreview<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) freezePreview(child);
        Object.freeze(value);
    }
    return value;
}
/** Contains a case for every declared component state, plus toast/alert severity variants. */
export const UI_COMPONENT_PREVIEWS: ReadonlyArray<ComponentPreviewCase> = freezePreview(UI_COMPONENT_DEFINITIONS.flatMap(component => {
    const base = samples[component.identity];
    const cases = component.states.map(state => ({ id: `${component.identity.slice(4)}-${state}`, identity: component.identity, state, properties: { ...base, id: `preview-${component.identity.slice(4)}-${state}` } }));
    if (component.identity === 'fdo.toast' || component.identity === 'fdo.inline-alert') {
        for (const variant of ['success', 'warning', 'error'] as const) cases.push({ id: `${component.identity.slice(4)}-${variant}`, identity: component.identity, state: component.identity === 'fdo.toast' ? 'open' : 'visible', properties: { ...base, id: `preview-${component.identity.slice(4)}-${variant}`, variant } as typeof base });
    }
    return cases as ComponentPreviewCase[];
}));
function stateAttribute(html: string, state: string): string { return html.replace(/data-fdo-state="[^"]*"/, `data-fdo-state="${state}"`); }
function showSlot(html: string, name: string, content?: string): string {
    for (const tag of ['div', 'span']) {
        const pattern = new RegExp(`(<${tag}[^>]*data-fdo-slot="${name}"[^>]*)(>)([\\s\\S]*?)(</${tag}>)`);
        if (pattern.test(html)) return html.replace(pattern, (_match, attrs: string, end: string, previous: string, close: string) => attrs.replace(/ hidden(?:="[^"]*")?/, '') + end + (content === undefined ? previous : text(content)) + close);
    }
    return html;
}

function renderPreview(dom: DOM, preview: ComponentPreviewCase, id: string): string {
    let html: string;
    switch (preview.identity) {
        case 'fdo.dialog': html = createDialog(dom, { ...preview.properties, id }); break;
        case 'fdo.confirmation-dialog': html = createConfirmationDialog(dom, { ...preview.properties, id }); break;
        case 'fdo.popover': html = createPopover(dom, { ...preview.properties, id }); break;
        case 'fdo.progress-bar': html = createProgressBar(dom, { ...preview.properties, id, value: preview.state === 'indeterminate' ? null : 60 }); break;
        case 'fdo.toast': html = createToast(dom, { ...preview.properties, id }); break;
        case 'fdo.inline-alert': html = createInlineAlert(dom, { ...preview.properties, id, visible: preview.state !== 'hidden' }); break;
        case 'fdo.toast-region': {
            const child = preview.state === 'active' ? stateAttribute(createToast(dom, { id: `${id}-child`, message: 'Visible notification' }).replace(/ hidden(?:="[^"]*")?/, ''), 'open') + createToast(dom, { id: `${id}-queued`, message: 'Queued notification' }) : '';
            html = createToastRegion(dom, { ...preview.properties, id, body: child }); break;
        }
        case 'fdo.async-action-button': html = createAsyncActionButton(dom, { ...preview.properties, id }); break;
        case 'fdo.tabs': html = createTabs(dom, { ...preview.properties, id }); break;
        case 'fdo.disclosure': html = createDisclosure(dom, { ...preview.properties, id, open: preview.state === 'open' }); break;
        case 'fdo.accordion': html = createAccordion(dom, { ...preview.properties, id, items: preview.properties.items.map((item, index) => ({ ...item, open: preview.state === 'open' && index === 0 })) }); break;
    }
    if (['open', 'pending', 'error'].includes(preview.state) && (preview.identity === 'fdo.dialog' || preview.identity === 'fdo.confirmation-dialog')) html = html.replace('<dialog ', '<dialog open ');
    if (preview.identity === 'fdo.popover') {
        // A preview of the open state participates in normal flow, never the browser top layer.
        html = html.replace(/ popover="auto"/, '').replace('<div ', `<div${preview.state === 'open' ? '' : ' hidden'} `);
    }
    if (preview.identity === 'fdo.toast' && preview.state === 'open') html = html.replace(/ hidden(?:="[^"]*")?/, '');
    if (preview.state === 'pending') {
        const label = preview.identity === 'fdo.async-action-button' || preview.identity === 'fdo.confirmation-dialog' ? preview.properties.pendingLabel ?? 'Working…' : 'Working…';
        html = showSlot(html, 'status', label);
        if (preview.identity === 'fdo.async-action-button') {
            html = html.replace(/(<button[^>]*data-fdo-action="run"[^>]*>)[^<]*(<\/button>)/, `$1${text(label)}$2`).replace(/(<button[^>]*data-fdo-action="cancel"[^>]*?) hidden(?:="[^"]*")?/, '$1');
        }
        html = html.replace(/(<button[^>]*data-fdo-action="(?:run|confirm)"[^>]*)(>)/g, '$1 disabled$2');
    }
    if (preview.state === 'error') html = showSlot(html, 'error', 'The operation failed. You can retry.');
    if (preview.state === 'success') {
        const label = preview.identity === 'fdo.async-action-button' ? preview.properties.successLabel ?? 'Done' : 'Done';
        html = showSlot(html, 'status', label).replace(/(<button[^>]*data-fdo-action="run"[^>]*>)[^<]*(<\/button>)/, `$1${text(label)}$2`);
    }
    // Inert specimens are visual simulations, not live controls/announcements.
    html = html.replace(/ role="(status|alert)"/g, ' role="$1" aria-live="off"');
    return stateAttribute(html, preview.state);
}
/** Compose a fully static gallery of every declared state. No mount functions or plugin handlers execute. */
export function createComponentGallery(dom: DOM, options: ComponentGalleryOptions = {}): string {
    const id = options.id ?? 'fdo-component-gallery'; validId(id);
    const css = dom.createClassFromStyle({ display: 'grid', gap: '1rem', '& > article': { border: '1px solid #aaa', padding: '1rem', borderRadius: '.5rem' }, '& [data-fdo-preview] > [data-fdo-component="fdo.popover"]': { position: 'relative', inset: 'auto', margin: '0' }, '& [data-fdo-preview] > dialog[open]': { position: 'relative', margin: '0', maxHeight: 'none' } });
    const markup = el('section', { id, class: `fdo-ui-component-gallery ${css}`, 'aria-label': 'SDK component previews' }, UI_COMPONENT_PREVIEWS.map(preview =>
        el('article', { 'data-fdo-preview-case': preview.id, 'data-fdo-preview-identity': preview.identity, 'data-fdo-preview-state': preview.state },
            el('h2', {}, text(`${preview.identity}: ${preview.id}`)) + el('p', {}, text(`Static ${preview.state} state; handlers are disabled.`)) +
            el('div', { inert: true, 'data-fdo-preview': true }, renderPreview(dom, preview, `${id}-${preview.id}`)))
    ).join(''));
    // Legacy text helpers generate incidental wrapper ids. Normalize only those in SDK-owned specimens.
    let nextTextId = 0;
    return markup.replace(/ id="([^"]+)"/g, (attribute, current: string) => current === id || current.startsWith(`${id}-`) ? attribute : ` id="${id}-text-${++nextTextId}"`);
}
