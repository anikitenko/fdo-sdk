import { DOM, DOMStyleMap } from '../DOM';
import { DOMText } from '../DOMText';
import { UI_COMPONENT_CONTRACT_VERSION } from './metadata';
import type { DialogMarkupOptions, ConfirmationDialogMarkupOptions, PopoverMarkupOptions } from './types';

const dialogStyle: DOMStyleMap = {
    padding: 'var(--fdo-ui-padding, 1rem)', color: 'var(--fdo-ui-color, #111)',
    background: 'var(--fdo-ui-background, white)', border: 'var(--fdo-ui-border, 1px solid #aaa)',
    borderRadius: 'var(--fdo-ui-radius, .5rem)', maxWidth: 'min(var(--fdo-ui-width, 32rem), calc(100vw - 2rem))',
    maxHeight: 'calc(100dvh - 2rem)', overflow: 'auto', boxSizing: 'border-box',
    '&::backdrop': { background: 'var(--fdo-ui-backdrop, rgb(0 0 0 / 50%))' },
    '& > [data-fdo-slot="actions"]': { display: 'flex', gap: '.5rem', justifyContent: 'flex-end' },
    '& > [data-fdo-slot="error"]': { color: 'var(--fdo-ui-error-color, #a00)' },
    '& > [hidden]': { display: 'none' },
};

function compose(dom: DOM, props: DialogMarkupOptions, identity: string, confirmation = false): string {
    if (!props.id || /[\t\n\f\r ]/.test(props.id)) throw Object.assign(Error('UI components require a non-empty, document-unique HTML id without ASCII whitespace.'), { code: 'UI_ID_REQUIRED' });
    const effectiveLabel = props.ariaLabelledBy ?? props.ariaLabel ?? props.title;
    if (!effectiveLabel?.trim()) {
        throw Object.assign(Error('Provide title, ariaLabel or ariaLabelledBy for an accessible name.'), { code: 'UI_LABEL_REQUIRED' });
    }
    // A separate serializer preserves paired tags even when a caller uses a self-closing DOM collector.
    const markup = new DOM();
    const text = new DOMText().collectStylesFrom();
    const element = (tag: string, attrs: Record<string, unknown>, content = '') => markup.createElement(tag, attrs, content);
    const slot = (name: string, html: string) => element('div', { 'data-fdo-slot': name, class: `fdo-ui__${name}` }, html);
    const isPopover = identity === 'fdo.popover';
    const style = isPopover ? { ...dialogStyle, position: 'fixed', inset: 'auto', margin: '0', overflow: 'auto' } : dialogStyle;
    const className = dom.createClassFromStyle({ ...style, ...props.options?.style });
    const attrs: Record<string, unknown> = {
        id: props.id, 'data-fdo-component': identity, 'data-fdo-component-version': UI_COMPONENT_CONTRACT_VERSION,
        'data-fdo-state': 'closed', tabindex: '-1',
        class: [`fdo-ui-${isPopover ? 'popover' : 'dialog'}`, ...(confirmation ? ['fdo-ui-confirmation-dialog'] : []), className, ...(props.options?.classes ?? [])].join(' '),
        role: isPopover ? 'region' : confirmation ? 'alertdialog' : 'dialog',
    };
    if (isPopover) attrs.popover = 'auto';
    if (props.ariaLabel !== undefined) attrs['aria-label'] = props.ariaLabel;
    if (props.ariaLabelledBy !== undefined) attrs['aria-labelledby'] = props.ariaLabelledBy;
    else if (props.ariaLabel === undefined && props.title) attrs['aria-labelledby'] = `${props.id}-title`;
    if (props.ariaDescribedBy !== undefined) attrs['aria-describedby'] = props.ariaDescribedBy;
    else if (props.description) attrs['aria-describedby'] = `${props.id}-description`;
    const title = props.title ? text.createHText(2, props.title, {}, `${props.id}-title`) : '';
    const description = props.description ? text.createPText(props.description, {}, `${props.id}-description`) : '';
    const button = (action: string, label: string) => element('button', { type: 'button', 'data-fdo-action': action }, text.createText(label));
    const actions = isPopover ? '' : slot('actions', button('cancel', props.cancelLabel ?? 'Cancel') + (confirmation ? button('confirm', (props as ConfirmationDialogMarkupOptions).confirmLabel ?? 'Confirm') : ''));
    const feedback = confirmation ? element('div', { 'data-fdo-slot': 'status', role: 'status', hidden: true }, text.createText((props as ConfirmationDialogMarkupOptions).pendingLabel ?? 'Working…')) + element('div', { 'data-fdo-slot': 'error', role: 'alert', hidden: true }) : '';
    return element(isPopover ? 'div' : 'dialog', attrs, title + description + slot('body', props.body ?? '') + slot('footer', props.footer ?? '') + feedback + actions);
}

/** Compose closed native-dialog HTML and register CSS with the supplied DOM owner. Never mounts or executes handlers. */
export function createDialog(dom: DOM, options: DialogMarkupOptions): string {
    return compose(dom, options, 'fdo.dialog');
}
/** Compose a native alertdialog with explicit Cancel/Confirm buttons and pending/error live regions. */
export function createConfirmationDialog(dom: DOM, options: ConfirmationDialogMarkupOptions): string {
    return compose(dom, options, 'fdo.confirmation-dialog', true);
}
/** Compose a closed native auto-popover region; mounting supplies its anchor and positioning policy. */
export function createPopover(dom: DOM, options: PopoverMarkupOptions): string {
    return compose(dom, options, 'fdo.popover');
}
