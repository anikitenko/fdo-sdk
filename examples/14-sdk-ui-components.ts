import { DOM, createDialog, createConfirmationDialog, createPopover } from '@anikitenko/fdo-sdk/ui';
import type * as UI from '@anikitenko/fdo-sdk/ui';

/** Serializable markup only; mount after the host inserts it into the frontend. */
export function sdkComponentMarkup(): string {
    const dom = new DOM().collectStylesFrom();
    const triggers = dom.createElement('nav', { 'aria-label': 'Component examples' },
        dom.createElement('button', { id: 'show-details', type: 'button' }, 'Details'),
        dom.createElement('button', { id: 'show-confirmation', type: 'button' }, 'Confirm action'),
        dom.createElement('button', { id: 'show-options', type: 'button' }, 'Options'));
    return dom.renderHTML(dom.createElement('section', { id: 'sdk-ui-example' }, triggers,
        createDialog(dom, { id: 'details', title: 'Details', description: 'Example dialog', body: '<p>Serializable content.</p>', options: { style: { '--fdo-ui-background': '#fff' } } }),
        createConfirmationDialog(dom, { id: 'confirmation', title: 'Confirm action?', description: 'No backend work runs automatically.', confirmLabel: 'Save', pendingLabel: 'Saving…', body: '<p>This example waits locally.</p>' }),
        createPopover(dom, { id: 'options', title: 'More options', body: '<p>A nonmodal anchored region.</p>', footer: '<button type="button" data-fdo-action="cancel">Close</button>' })));
}

/**
 * Frontend-only. Pass the browser-safe /ui module and the exact inserted scope.
 * This function is self-contained and can be bundled or invoked by the host.
 * Cleanup is suitable as the return value of an existing on-load setup function.
 */
export function mountSdkComponentExample(ui: typeof UI, scope: HTMLElement): () => void {
    const element = <T extends HTMLElement>(id: string) => {
        const found = Array.from(scope.querySelectorAll<HTMLElement>('[id]')).find(item => item.id === id);
        if (!found) throw new Error(`Missing component example element ${id}`);
        return found as T;
    };
    const cleanup: Array<() => void> = [];
    let destroyed = false;
    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        for (const dispose of cleanup.reverse()) dispose();
    };
    try {
        const details = ui.mountDialog(element<HTMLDialogElement>('details'));
        cleanup.push(() => details.destroy());
        const confirmation = ui.mountConfirmationDialog(element<HTMLDialogElement>('confirmation'), {
            onConfirm: ({ signal }) => new Promise<void>((resolve, reject) => {
                const canceled = () => { clearTimeout(timer); reject(new Error('Canceled')); };
                const timer = setTimeout(() => { signal.removeEventListener('abort', canceled); resolve(); }, 300);
                signal.addEventListener('abort', canceled, { once: true });
                if (signal.aborted) canceled();
            }),
        });
        cleanup.push(() => confirmation.destroy());
        const anchor = element<HTMLButtonElement>('show-options');
        const popover = ui.mountPopover(element('options'), { anchor, placement: 'bottom-end', overflow: 'flip' });
        cleanup.push(() => popover.destroy());
        const bindings: Array<[HTMLElement, () => void]> = [
            [element('show-details'), () => details.open(element('show-details'))],
            [element('show-confirmation'), () => confirmation.open(element('show-confirmation'))],
            [anchor, () => popover.getState().open ? popover.close() : popover.open(anchor)],
        ];
        for (const [target, listener] of bindings) {
            target.addEventListener('click', listener);
            cleanup.push(() => target.removeEventListener('click', listener));
        }
        return destroy;
    } catch (error) { destroy(); throw error; }
}
