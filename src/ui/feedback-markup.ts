import { DOM } from '../DOM';
import { DOMText } from '../DOMText';
import type { ProgressBarMarkupOptions, ToastMarkupOptions } from './types';
import { UI_COMPONENT_CONTRACT_VERSION } from './metadata';
import { progressValues, toastVariant } from './feedback-shared';

function attributes(id: string, identity: string): Record<string, unknown> {
    if (!id || /[\t\n\f\r ]/.test(id)) throw Object.assign(new Error('Provide a document-unique component id without ASCII whitespace.'), { code: 'UI_ID_REQUIRED' });
    return { id, 'data-fdo-component': identity, 'data-fdo-component-version': UI_COMPONENT_CONTRACT_VERSION };
}
/** Compose a labelled native progress element. Omit value (or use null) for indeterminate progress. */
export function createProgressBar(dom: DOM, options: ProgressBarMarkupOptions): string {
    const values = progressValues(options.value, options.max);
    if (!options.label?.trim() && !options.ariaLabelledBy?.trim()) throw Object.assign(new Error('Provide a progress label or ariaLabelledBy.'), { code: 'UI_LABEL_REQUIRED' });
    const css = dom.createClassFromStyle({
        width: 'var(--fdo-ui-progress-width, 100%)', height: 'var(--fdo-ui-progress-height, .75rem)',
        accentColor: 'var(--fdo-ui-progress-color, #2563eb)', ...options.options?.style,
    });
    return new DOM().createElement('progress', {
        ...attributes(options.id, 'fdo.progress-bar'), max: values.max, ...(values.value === null ? {} : { value: values.value }),
        'data-fdo-state': values.value === null ? 'indeterminate' : 'determinate',
        'aria-label': options.label || undefined, 'aria-labelledby': options.ariaLabelledBy, 'aria-describedby': options.ariaDescribedBy,
        class: ['fdo-ui-progress-bar', css, ...(options.options?.classes ?? [])].join(' '),
    }, new DOMText().collectStylesFrom().createText(options.label ?? ''));
}
/** Compose a hidden, dismissible live-region toast with optional native progress. Content is escaped text. */
export function createToast(dom: DOM, options: ToastMarkupOptions): string {
    const variant = toastVariant(options.variant);
    const markup = new DOM();
    const text = new DOMText().collectStylesFrom();
    const css = dom.createClassFromStyle({
        padding: 'var(--fdo-ui-padding, 1rem)', border: 'var(--fdo-ui-border, 1px solid #aaa)',
        borderRadius: 'var(--fdo-ui-radius, .5rem)', background: 'var(--fdo-ui-background, white)', color: 'var(--fdo-ui-color, #111)',
        maxWidth: 'min(var(--fdo-ui-width, 24rem), 100%)', boxSizing: 'border-box', overflowWrap: 'anywhere',
        '&[hidden]': { display: 'none' },
        '&[data-fdo-variant="info"]': { borderColor: 'var(--fdo-ui-info-color, #2563eb)' },
        '&[data-fdo-variant="success"]': { borderColor: 'var(--fdo-ui-success-color, #16703c)' },
        '&[data-fdo-variant="warning"]': { borderColor: 'var(--fdo-ui-warning-color, #a50)' },
        '&[data-fdo-variant="error"]': { borderColor: 'var(--fdo-ui-error-color, #a00)' },
        ...options.options?.style,
    });
    const slot = (name: string, content: string) => markup.createElement('div', { 'data-fdo-slot': name, class: `fdo-ui-toast__${name}` }, content);
    const progress = options.progress ? slot('progress', createProgressBar(dom, { ...options.progress, id: `${options.id}-progress` })) : '';
    return markup.createElement('div', {
        ...attributes(options.id, 'fdo.toast'), hidden: true, 'data-fdo-state': 'closed', 'data-fdo-variant': variant,
        role: variant === 'error' || variant === 'warning' ? 'alert' : 'status', 'aria-atomic': 'true',
        'aria-label': options.ariaLabel, 'aria-labelledby': options.ariaLabelledBy, 'aria-describedby': options.ariaDescribedBy,
        class: ['fdo-ui-toast', css, ...(options.options?.classes ?? [])].join(' '),
    }, slot('title', text.createText(options.title ?? '')) + slot('message', text.createText(options.message)) + progress + markup.createElement('button', {
        type: 'button', 'data-fdo-action': 'dismiss', class: 'fdo-ui-toast__dismiss',
    }, text.createText(options.dismissLabel ?? 'Dismiss')));
}
