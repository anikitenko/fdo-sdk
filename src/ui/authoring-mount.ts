import type {
    InlineAlertController, InlineAlertMountOptions, InlineAlertState, AsyncActionButtonController, AsyncActionButtonMountOptions, AsyncActionButtonState,
    TabsController, TabsMountOptions, TabsState, DisclosureController, DisclosureMountOptions, DisclosureState, AccordionController, AccordionMountOptions, AccordionState,
} from './types';
import { feedbackCallbacks, toastVariant } from './feedback-shared';
import { COMPONENT_MOUNT as MOUNT, ComponentRoot, validateComponent, ownedElements, uiFailure, componentListeners } from './component-internals';

/** Mount persistent plain-text feedback. Hiding/destroying never discards backend notification history. */
export function mountInlineAlert(root: HTMLElement, options: InlineAlertMountOptions = {}): InlineAlertController {
    validateComponent(root, 'fdo.inline-alert');
    const title = ownedElements(root, '[data-fdo-slot="title"]')[0], message = ownedElements(root, '[data-fdo-slot="message"]')[0];
    if (!title || !message) uiFailure('UI_SLOTS_MISSING', 'Inline Alert requires title and message slots.');
    const variant = toastVariant(root.getAttribute('data-fdo-variant') ?? undefined);
    (root as ComponentRoot)[MOUNT]?.destroy();
    let state: InlineAlertState = { visible: !root.hidden, variant, destroyed: false };
    const notify = feedbackCallbacks(options.onDiagnostic);
    const getState = () => Object.freeze({ ...state });
    const publish = () => {
        root.hidden = !state.visible;
        root.setAttribute('data-fdo-state', state.destroyed ? 'destroyed' : state.visible ? 'visible' : 'hidden');
        const snapshot = getState(); notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const visible = (value: boolean) => { if (!state.destroyed && state.visible !== value) { state = { ...state, visible: value }; publish(); } };
    const controller: InlineAlertController = {
        show() { visible(true); }, hide() { visible(false); }, getState,
        update(content) {
            if (state.destroyed) return;
            const next = toastVariant(content.variant ?? state.variant);
            if (content.title !== undefined) title.textContent = content.title;
            if (content.message !== undefined) message.textContent = content.message;
            state = { ...state, variant: next };
            root.setAttribute('data-fdo-variant', next); root.setAttribute('role', next === 'error' || next === 'warning' ? 'alert' : 'status'); publish();
        },
        destroy() {
            if (state.destroyed) return;
            state = { ...state, destroyed: true };
            if ((root as ComponentRoot)[MOUNT] === controller) delete (root as ComponentRoot)[MOUNT];
            publish(); // Persistent feedback remains visible after behavior cleanup.
        },
    };
    (root as ComponentRoot)[MOUNT] = controller;
    return controller;
}
/** Mount an explicitly supplied asynchronous action; cancellation resolves promptly and suppresses late results. */
export function mountAsyncActionButton(root: HTMLElement, options: AsyncActionButtonMountOptions): AsyncActionButtonController {
    validateComponent(root, 'fdo.async-action-button');
    if (typeof options?.onAction !== 'function') uiFailure('UI_ACTION_HANDLER_REQUIRED', 'Provide an explicit frontend onAction callback.');
    const button = ownedElements(root, '[data-fdo-action="run"]')[0] as HTMLButtonElement | undefined;
    const cancel = ownedElements(root, '[data-fdo-action="cancel"]')[0] as HTMLButtonElement | undefined;
    const status = ownedElements(root, '[data-fdo-slot="status"]')[0], errorRegion = ownedElements(root, '[data-fdo-slot="error"]')[0];
    if (!button || !cancel || !status || !errorRegion || button.tagName !== 'BUTTON' || cancel.tagName !== 'BUTTON') uiFailure('UI_SLOTS_MISSING', 'Async Action Button requires native run/cancel buttons and status/error slots.');
    (root as ComponentRoot)[MOUNT]?.destroy();
    const initialDisabled = button.disabled;
    const initialBusy = root.getAttribute('aria-busy');
    const idleLabel = button.getAttribute('data-fdo-idle-label') ?? button.textContent ?? '';
    const pendingLabel = button.getAttribute('data-fdo-pending-label') ?? 'Working…', successLabel = button.getAttribute('data-fdo-success-label') ?? 'Done';
    const notify = feedbackCallbacks(options.onDiagnostic), listeners = componentListeners();
    let state: AsyncActionButtonState = { phase: 'idle', error: null, disabled: initialDisabled, destroyed: false };
    let abort: AbortController | undefined, operation: Promise<boolean> | undefined, settle: ((result: boolean) => void) | undefined;
    let generation = 0;
    const getState = () => Object.freeze({ ...state });
    const publish = () => {
        const pending = state.phase === 'pending' && !state.destroyed;
        root.setAttribute('data-fdo-state', state.destroyed ? 'destroyed' : state.phase); root.setAttribute('aria-busy', String(pending));
        button.disabled = pending || state.disabled; button.textContent = pending ? pendingLabel : state.phase === 'success' ? successLabel : idleLabel;
        cancel.hidden = !pending; status.hidden = !pending && state.phase !== 'success'; status.textContent = pending ? pendingLabel : state.phase === 'success' ? successLabel : '';
        errorRegion.hidden = !state.error; errorRegion.textContent = state.error ?? '';
        const snapshot = getState(); notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const stop = () => {
        generation++;
        const previous = abort; abort = undefined;
        const resolve = settle; settle = undefined; operation = undefined;
        resolve?.(false); previous?.abort();
    };
    const controller: AsyncActionButtonController = {
        run() {
            if (operation) return operation;
            if (state.destroyed || state.disabled) return Promise.resolve(false);
            const current = ++generation;
            const workAbort = new AbortController(); abort = workAbort;
            const result = new Promise<boolean>(resolve => { settle = resolve; }); operation = result;
            state = { ...state, phase: 'pending', error: null }; publish();
            // Deferring handler entry also handles synchronous cancellation from state observers.
            Promise.resolve().then(async () => {
                if (generation !== current || state.destroyed) return;
                try {
                    await options.onAction({ signal: workAbort.signal });
                    if (generation !== current || state.destroyed) return;
                    state = { ...state, phase: 'success', error: null };
                    const resolve = settle; settle = undefined; operation = undefined; abort = undefined; publish(); resolve?.(true);
                } catch (error) {
                    if (generation !== current || state.destroyed) return;
                    let message = error instanceof Error ? error.message : String(error);
                    try { message = options.formatError?.(error) ?? message; } catch { message = 'Action failed. Retry or cancel the operation.'; }
                    state = { ...state, phase: 'error', error: message || 'Action failed.' };
                    const resolve = settle; settle = undefined; operation = undefined; abort = undefined; publish(); resolve?.(false);
                }
            }).catch(error => { notify(() => { throw error; }, 'onAction'); });
            return result;
        },
        cancel() { if (!state.destroyed && state.phase === 'pending') { state = { ...state, phase: 'cancelled', error: null }; stop(); publish(); } },
        reset() { if (!state.destroyed) { state = { ...state, phase: 'idle', error: null }; stop(); publish(); } },
        setDisabled(disabled) { if (!state.destroyed) { state = { ...state, disabled }; if (disabled && state.phase === 'pending') controller.cancel(); else publish(); } },
        getState,
        destroy() {
            if (state.destroyed) return;
            state = { ...state, destroyed: true }; stop(); listeners.remove(); publish();
            button.disabled = initialDisabled; button.textContent = idleLabel; cancel.hidden = true; status.hidden = true; errorRegion.hidden = true;
            if (initialBusy === null) root.removeAttribute('aria-busy'); else root.setAttribute('aria-busy', initialBusy);
            if ((root as ComponentRoot)[MOUNT] === controller) delete (root as ComponentRoot)[MOUNT];
        },
    };
    try {
        listeners.listen(button, 'click', () => { void controller.run(); }); listeners.listen(cancel, 'click', () => controller.cancel());
        (root as ComponentRoot)[MOUNT] = controller; publish();
    } catch (error) { controller.destroy(); throw error; }
    return controller;
}
/** Mount a scoped roving-tabindex tablist, with automatic or explicit Enter/Space activation. */
export function mountTabs(root: HTMLElement, options: TabsMountOptions = {}): TabsController {
    validateComponent(root, 'fdo.tabs');
    const activation = options.activation ?? 'automatic';
    if (!['automatic', 'manual'].includes(activation)) uiFailure('UI_TAB_ACTIVATION_INVALID', 'Use automatic or manual tab activation.');
    const buttons = ownedElements(root, '[data-fdo-tab]') as HTMLButtonElement[], panels = ownedElements(root, '[data-fdo-panel]');
    const enabled = buttons.filter(button => !button.disabled), keys = buttons.map(button => button.getAttribute('data-fdo-tab')!);
    const selected = buttons.filter(button => button.getAttribute('aria-selected') === 'true');
    const tablists = ownedElements(root, '[role="tablist"]');
    if (!enabled.length || new Set(keys).size !== keys.length || selected.length !== 1 || selected[0].disabled || tablists.length !== 1 || buttons.some(button => button.tagName !== 'BUTTON' || panels.filter(panel => panel.getAttribute('data-fdo-panel') === button.getAttribute('data-fdo-tab') && panel.id === button.getAttribute('aria-controls') && panel.getAttribute('aria-labelledby') === button.id).length !== 1)) uiFailure('UI_TAB_INVALID', 'Mount complete tabs with one enabled selection and unique linked tab/panel pairs.');
    const orientation = tablists[0].getAttribute('aria-orientation');
    (root as ComponentRoot)[MOUNT]?.destroy();
    let state: TabsState = { activeKey: selected[0].getAttribute('data-fdo-tab')!, destroyed: false };
    const notify = feedbackCallbacks(options.onDiagnostic), listeners = componentListeners();
    const getState = () => Object.freeze({ ...state });
    const select = (key: string, focus = false) => {
        if (state.destroyed) return;
        const target = enabled.find(button => button.getAttribute('data-fdo-tab') === key);
        if (!target) uiFailure('UI_TAB_INVALID', `Choose an enabled tab key: ${key}.`);
        const changed = state.activeKey !== key; state = { ...state, activeKey: key };
        for (const button of buttons) { button.tabIndex = button === target ? 0 : -1; button.setAttribute('aria-selected', String(button === target)); }
        for (const panel of panels) panel.hidden = panel.getAttribute('data-fdo-panel') !== key;
        if (focus) target.focus();
        if (changed) { const snapshot = getState(); notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange'); }
    };
    const controller: TabsController = { select, getState, destroy() {
        if (state.destroyed) return; state = { ...state, destroyed: true }; listeners.remove(); root.setAttribute('data-fdo-state', 'destroyed');
        if ((root as ComponentRoot)[MOUNT] === controller) delete (root as ComponentRoot)[MOUNT];
        const snapshot = getState(); notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    } };
    try {
        for (const button of enabled) {
            listeners.listen(button, 'click', () => select(button.getAttribute('data-fdo-tab')!, true));
            listeners.listen(button, 'keydown', event => {
                const key = (event as KeyboardEvent).key;
                if (event.defaultPrevented || (event as KeyboardEvent).altKey || (event as KeyboardEvent).ctrlKey || (event as KeyboardEvent).metaKey) return;
                if (key === 'Enter' || key === ' ') { event.preventDefault(); select(button.getAttribute('data-fdo-tab')!); return; }
                let index = enabled.indexOf(button);
                const rtl = root.ownerDocument.defaultView!.getComputedStyle(tablists[0]).direction === 'rtl';
                if (key === 'Home') index = 0; else if (key === 'End') index = enabled.length - 1;
                else if (orientation === 'vertical' && (key === 'ArrowDown' || key === 'ArrowUp')) index += key === 'ArrowDown' ? 1 : -1;
                else if (orientation !== 'vertical' && (key === 'ArrowRight' || key === 'ArrowLeft')) index += (key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
                else return;
                event.preventDefault(); const target = enabled[(index + enabled.length) % enabled.length];
                if (activation === 'automatic') select(target.getAttribute('data-fdo-tab')!, true);
                else { for (const item of buttons) item.tabIndex = item === target ? 0 : -1; target.focus(); }
            });
        }
        (root as ComponentRoot)[MOUNT] = controller; root.setAttribute('data-fdo-state', 'active');
    } catch (error) { controller.destroy(); throw error; }
    return controller;
}
/** Synchronize native details state; native summary keyboard handling is preserved. */
export function mountDisclosure(root: HTMLElement, options: DisclosureMountOptions = {}): DisclosureController {
    validateComponent(root, 'fdo.disclosure');
    if (root.tagName !== 'DETAILS' || !ownedElements(root, 'summary').length) uiFailure('UI_DISCLOSURE_INVALID', 'Mount native details with a summary child.');
    (root as ComponentRoot)[MOUNT]?.destroy();
    const details = root as HTMLDetailsElement;
    let state: DisclosureState = { open: details.open, destroyed: false };
    const notify = feedbackCallbacks(options.onDiagnostic), listeners = componentListeners();
    const getState = () => Object.freeze({ ...state });
    const publish = (open: boolean) => {
        const changed = state.open !== open; state = { ...state, open };
        root.setAttribute('data-fdo-state', state.destroyed ? 'destroyed' : open ? 'open' : 'closed');
        if (changed || state.destroyed) { const snapshot = getState(); notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange'); }
    };
    const controller: DisclosureController = {
        setOpen(open) { if (!state.destroyed) { details.open = open; publish(open); } },
        toggle() { controller.setOpen(!details.open); }, getState,
        destroy() { if (state.destroyed) return; state = { ...state, destroyed: true }; listeners.remove(); publish(details.open); if ((root as ComponentRoot)[MOUNT] === controller) delete (root as ComponentRoot)[MOUNT]; },
    };
    try { listeners.listen(root, 'toggle', () => { if (!state.destroyed) publish(details.open); }); (root as ComponentRoot)[MOUNT] = controller; }
    catch (error) { controller.destroy(); throw error; }
    return controller;
}
/** Coordinate native disclosures without document-wide names/listeners. */
export function mountAccordion(root: HTMLElement, options: AccordionMountOptions = {}): AccordionController {
    validateComponent(root, 'fdo.accordion');
    const wrappers = ownedElements(root, '[data-fdo-item]');
    const entries = wrappers.map(wrapper => ({ key: wrapper.getAttribute('data-fdo-item')!, element: Array.from(wrapper.children).find(child => child.getAttribute('data-fdo-component') === 'fdo.disclosure') as HTMLElement | undefined }));
    const multiple = root.getAttribute('data-fdo-multiple') === 'true';
    if (!entries.length || new Set(entries.map(entry => entry.key)).size !== entries.length || entries.some(entry => !entry.element || entry.element.tagName !== 'DETAILS' || !ownedElements(entry.element, 'summary').length) || (!multiple && entries.filter(entry => (entry.element as HTMLDetailsElement).open).length > 1)) uiFailure('UI_ACCORDION_INVALID', 'Mount unique composed disclosure items with at most one initially open item in single-open mode.');
    for (const entry of entries) validateComponent(entry.element!, 'fdo.disclosure');
    (root as ComponentRoot)[MOUNT]?.destroy();
    let destroyed = false, syncing = false, previous = '';
    const children = new Map<string, DisclosureController>(), notify = feedbackCallbacks(options.onDiagnostic);
    const getState = (): AccordionState => Object.freeze({ destroyed, openKeys: Object.freeze(Array.from(children).filter(([, child]) => child.getState().open).map(([key]) => key)) });
    const publish = () => {
        const snapshot = getState(), signature = JSON.stringify(snapshot);
        root.setAttribute('data-fdo-state', destroyed ? 'destroyed' : snapshot.openKeys.length ? 'open' : 'closed');
        if (signature === previous) return; previous = signature;
        notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const setOpen = (key: string, open: boolean) => {
        if (destroyed) return; const child = children.get(key);
        if (!child) uiFailure('UI_ACCORDION_KEY_INVALID', `Choose an existing accordion key: ${key}.`);
        syncing = true;
        try { if (open && !multiple) for (const [other, controller] of children) if (other !== key) controller.setOpen(false); child.setOpen(open); }
        finally { syncing = false; }
        publish();
    };
    const controller: AccordionController = { setOpen, getState, destroy() {
        if (destroyed) return; destroyed = true; for (const child of children.values()) child.destroy();
        if ((root as ComponentRoot)[MOUNT] === controller) delete (root as ComponentRoot)[MOUNT]; publish();
    } };
    try {
        for (const entry of entries) children.set(entry.key, mountDisclosure(entry.element!, { onDiagnostic: options.onDiagnostic, onStateChange: state => { if (!syncing && !destroyed) setOpen(entry.key, state.open); } }));
        (root as ComponentRoot)[MOUNT] = controller; publish();
    } catch (error) { controller.destroy(); throw error; }
    return controller;
}
