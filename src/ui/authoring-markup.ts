import type { DOM } from '../DOM';
import type { InlineAlertMarkupOptions, ToastRegionMarkupOptions, AsyncActionButtonMarkupOptions, TabsMarkupOptions, DisclosureMarkupOptions, AccordionMarkupOptions } from './types';
import { toastVariant } from './feedback-shared';
import { componentAttributes, requireLabel, uiElement as el, uiText as text, uiFailure, validateKeys } from './component-internals';

/** Persistent, plain-text live feedback. No automatic dismissal or notification-history routing. */
export function createInlineAlert(dom: DOM, options: InlineAlertMarkupOptions): string {
    const variant = toastVariant(options.variant);
    const slot = (name: string, value: string) => el('div', { 'data-fdo-slot': name }, text(value));
    return el('div', { ...componentAttributes(dom, options.id, 'fdo.inline-alert', options.visible === false ? 'hidden' : 'visible', options.options, {
        padding: 'var(--fdo-ui-padding, 1rem)', border: 'var(--fdo-ui-border, 1px solid #aaa)', borderRadius: 'var(--fdo-ui-radius, .5rem)',
        color: 'var(--fdo-ui-color, #111)', background: 'var(--fdo-ui-background, white)', '&[hidden]': { display: 'none' },
        '&[data-fdo-variant="error"]': { borderColor: 'var(--fdo-ui-error-color, #a00)' },
        '&[data-fdo-variant="warning"]': { borderColor: 'var(--fdo-ui-warning-color, #a50)' },
        '&[data-fdo-variant="success"]': { borderColor: 'var(--fdo-ui-success-color, #16703c)' },
    }), hidden: options.visible === false, role: variant === 'warning' || variant === 'error' ? 'alert' : 'status', 'aria-atomic': 'true',
    'data-fdo-variant': variant, 'aria-label': options.ariaLabel, 'aria-labelledby': options.ariaLabelledBy, 'aria-describedby': options.ariaDescribedBy,
    }, slot('title', options.title ?? '') + slot('message', options.message));
}
/** Compose a caller-placed, labelled notification region. Toast HTML remains hidden until explicitly enqueued. */
export function createToastRegion(dom: DOM, options: ToastRegionMarkupOptions): string {
    requireLabel(options.label);
    return el('section', { ...componentAttributes(dom, options.id, 'fdo.toast-region', 'empty', options.options, {
        display: 'flex', flexDirection: 'column', gap: 'var(--fdo-ui-toast-gap, .5rem)',
        maxHeight: 'var(--fdo-ui-region-max-height, 100%)', overflow: 'auto',
    }), 'aria-label': options.label }, options.body ?? '');
}
/** Compose action/cancel buttons and separate status/error live regions; handlers mount only in the frontend. */
export function createAsyncActionButton(dom: DOM, options: AsyncActionButtonMarkupOptions): string {
    requireLabel(options.label);
    const button = (action: string, label: string, attrs: Record<string, unknown>) => el('button', { type: 'button', 'data-fdo-action': action, ...attrs }, text(label));
    return el('div', { ...componentAttributes(dom, options.id, 'fdo.async-action-button', 'idle', options.options, {
        '& > [hidden]': { display: 'none' }, '& > [data-fdo-slot="error"]': { color: 'var(--fdo-ui-error-color, #a00)' },
    }), role: 'group', 'aria-label': options.label }, button('run', options.label, { disabled: options.disabled ?? false, 'data-fdo-idle-label': options.label,
        'data-fdo-pending-label': options.pendingLabel ?? 'Working…', 'data-fdo-success-label': options.successLabel ?? 'Done' }) +
        button('cancel', options.cancelLabel ?? 'Cancel', { hidden: true }) +
        el('span', { 'data-fdo-slot': 'status', role: 'status', hidden: true }) + el('div', { 'data-fdo-slot': 'error', role: 'alert', hidden: true }));
}
/** Compose scoped ARIA tabs/panels. Bodies are trusted HTML; all labels are escaped text. */
export function createTabs(dom: DOM, options: TabsMarkupOptions): string {
    requireLabel(options.label); validateKeys(options.items);
    for (const item of options.items) requireLabel(item.label);
    const active = options.activeKey ?? options.items.find(item => !item.disabled)?.key;
    if (!options.items.some(item => item.key === active && !item.disabled)) uiFailure('UI_TAB_INVALID', 'Choose an enabled activeKey and provide at least one enabled tab.');
    const orientation = options.orientation ?? 'horizontal';
    if (!['horizontal', 'vertical'].includes(orientation)) uiFailure('UI_TAB_ORIENTATION_INVALID', 'Tabs orientation must be horizontal or vertical.');
    const buttons = options.items.map(item => el('button', { type: 'button', role: 'tab', id: `${options.id}-tab-${item.key}`, 'data-fdo-tab': item.key,
        'aria-controls': `${options.id}-panel-${item.key}`, 'aria-selected': String(item.key === active), tabindex: item.key === active ? '0' : '-1', disabled: item.disabled ?? false }, text(item.label))).join('');
    const panels = options.items.map(item => el('div', { role: 'tabpanel', id: `${options.id}-panel-${item.key}`, 'data-fdo-panel': item.key,
        'aria-labelledby': `${options.id}-tab-${item.key}`, tabindex: '0', hidden: item.key !== active }, item.body)).join('');
    return el('div', { ...componentAttributes(dom, options.id, 'fdo.tabs', 'active', options.options, {
        '& > [role="tablist"]': { display: 'flex', gap: '.5rem', flexDirection: orientation === 'vertical' ? 'column' : 'row' },
        '& > [hidden]': { display: 'none' }, '& [role="tab"][aria-selected="true"]': { fontWeight: 'bold' },
    }), role: 'group', 'aria-label': options.label }, el('div', { role: 'tablist', 'aria-label': options.label, 'aria-orientation': orientation }, buttons) + panels);
}
/** Native details/summary remains keyboard-operable without mounting. Body is trusted HTML. */
export function createDisclosure(dom: DOM, options: DisclosureMarkupOptions): string {
    requireLabel(options.title);
    return el('details', { ...componentAttributes(dom, options.id, 'fdo.disclosure', options.open ? 'open' : 'closed', options.options, {
        '& > summary': { cursor: 'pointer', padding: 'var(--fdo-ui-padding, .5rem)' },
    }), open: options.open ?? false }, el('summary', { 'data-fdo-slot': 'title' }, text(options.title)) + el('div', { 'data-fdo-slot': 'body' }, options.body));
}
/** Compose scoped native disclosures. Exclusive behavior is installed by mountAccordion, without global details names. */
export function createAccordion(dom: DOM, options: AccordionMarkupOptions): string {
    requireLabel(options.label); validateKeys(options.items);
    if (!options.multiple && options.items.filter(item => item.open).length > 1) uiFailure('UI_ACCORDION_INVALID', 'A single-open accordion can initially open at most one item.');
    const body = options.items.map(item => el('div', { 'data-fdo-item': item.key }, createDisclosure(dom, { id: `${options.id}-${item.key}`, title: item.title, body: item.body, open: item.open }))).join('');
    return el('section', { ...componentAttributes(dom, options.id, 'fdo.accordion', options.items.some(item => item.open) ? 'open' : 'closed', options.options),
        'aria-label': options.label, 'data-fdo-multiple': String(options.multiple ?? false) }, body);
}
