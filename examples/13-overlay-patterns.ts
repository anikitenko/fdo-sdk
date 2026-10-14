import { DOM, DOMText, defineRenderOnLoadActions, RenderOnLoadModule } from '@anikitenko/fdo-sdk';

/** Markup/style only. No backend calls, frontend execution or FDO_SDK construction. */
export function overlayMarkup(): string {
    const text = new DOMText();
    const dom = new DOM().collectStylesFrom(text);
    const button = (id: string, label: string, props: Record<string, string> = {}) =>
        dom.createElement('button', { id, type: 'button', ...props }, label);
    const panel = (id: string, title: string, props: Record<string, unknown>) => dom.createElement(
        id === 'native-dialog' ? 'dialog' : 'div',
        { id, 'aria-labelledby': `${id}-label`, ...props },
        text.createHText(2, title, {}, `${id}-label`),
        button(`${id}-cancel`, 'Cancel', { 'data-close': id }),
        button(`${id}-confirm`, 'Confirm', { 'data-close': id }),
    );
    const customClass = dom.createClassFromStyle({
        position: 'fixed', inset: '20%', background: 'white', color: 'black', padding: '1rem', zIndex: 10,
        '&[hidden]': { display: 'none' },
        '&:focus-visible': { outline: '2px solid blue' },
    });
    const nativeClass = dom.createClassFromStyle({ '&::backdrop': { background: 'rgb(0 0 0 / 50%)' } });
    const main = dom.createElement('main', { id: 'overlay-background' },
        button('open-native', 'Native dialog', { 'data-open': 'native-dialog' }),
        button('open-custom', 'Custom dialog', { 'data-open': 'custom-dialog' }),
        button('open-alert', 'Custom alert', { 'data-open': 'custom-alert' }),
        button('open-popover', 'Popover', { 'data-open': 'native-popover', 'aria-controls': 'native-popover' }),
    );
    return dom.renderHTML(main +
        panel('native-dialog', 'Confirm action', { class: nativeClass }) +
        panel('custom-dialog', 'Custom confirmation', { role: 'dialog', 'aria-modal': 'true', hidden: true, tabindex: '-1', class: customClass }) +
        panel('custom-alert', 'Delete item?', { role: 'alertdialog', 'aria-modal': 'true', 'aria-describedby': 'alert-detail', hidden: true, tabindex: '-1', class: customClass }).replace('</h2>', '</h2><p id="alert-detail">This example does not delete data.</p>') +
        panel('native-popover', 'More options', { popover: 'auto', role: 'region' }));
}

/** Self-contained frontend behavior; serialized functions cannot capture plugin variables. */
export function overlayOnLoad(): RenderOnLoadModule {
    return defineRenderOnLoadActions({
        lifecycleKey: 'overlay-example',
        strict: true,
        handlers: {
            open: ({ element }) => {
                const trigger = element as HTMLButtonElement;
                const panel = document.getElementById(trigger.dataset.open!)! as HTMLElement & { __returnFocus?: HTMLElement };
                panel.__returnFocus = trigger;
                if (panel instanceof HTMLDialogElement) panel.showModal();
                else if (panel.hasAttribute('popover')) panel.showPopover();
                else {
                    panel.hidden = false;
                    document.getElementById('overlay-background')!.inert = true;
                }
                (panel.querySelector('button') as HTMLButtonElement).focus();
            },
            close: ({ element }) => {
                const trigger = element as HTMLButtonElement;
                const panel = document.getElementById(trigger.dataset.close!)! as HTMLElement & { __returnFocus?: HTMLElement };
                if (panel instanceof HTMLDialogElement) panel.close(trigger.textContent || '');
                else if (panel.hasAttribute('popover')) panel.hidePopover();
                else {
                    panel.hidden = true;
                    document.getElementById('overlay-background')!.inert = false;
                    panel.__returnFocus?.focus();
                }
            },
        },
        bindings: [
            { selector: '[data-open]', event: 'click', handler: 'open' },
            { selector: '[data-close]', event: 'click', handler: 'close' },
        ],
        setup: () => {
            const background = document.getElementById('overlay-background')!;
            const native = document.getElementById('native-dialog') as HTMLDialogElement;
            const popover = document.getElementById('native-popover')!;
            const custom = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'));
            const restore = (event: Event) => {
                const panel = event.target as HTMLElement & { __returnFocus?: HTMLElement };
                if (!(panel instanceof HTMLDialogElement) && panel.matches(':popover-open')) return;
                const opener = (panel as HTMLElement & { __returnFocus?: HTMLElement }).__returnFocus;
                if (opener?.isConnected) opener.focus();
            };
            const keyboard = (event: KeyboardEvent) => {
                const panel = custom.find(item => !item.hidden);
                if (!panel) return;
                if (event.key === 'Escape') {
                    event.preventDefault();
                    panel.hidden = true;
                    background.inert = false;
                    (panel as HTMLElement & { __returnFocus?: HTMLElement }).__returnFocus?.focus();
                } else if (event.key === 'Tab') {
                    const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
                    const first = buttons[0], last = buttons[buttons.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            };
            native.addEventListener('close', restore);
            popover.addEventListener('toggle', restore);
            document.addEventListener('keydown', keyboard);
            return () => {
                native.removeEventListener('close', restore);
                popover.removeEventListener('toggle', restore);
                document.removeEventListener('keydown', keyboard);
                const focused = document.activeElement;
                const active = [native, popover, ...custom].find(panel => panel.contains(focused));
                if (native.open) native.close();
                if (popover.matches(':popover-open')) popover.hidePopover();
                for (const panel of custom) panel.hidden = true;
                background.inert = false;
                (active as (HTMLElement & { __returnFocus?: HTMLElement }) | undefined)?.__returnFocus?.focus();
            };
        },
    });
}

/** Backend transport is an explicit separate frontend action, never part of markup/preview. */
export async function submitOverlayAction(): Promise<unknown> {
    return window.createBackendReq('UI_MESSAGE', { handler: 'plugin.v1.confirm', content: {} });
}
