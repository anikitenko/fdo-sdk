import type {
    DialogController, UIState, UICloseReason, UIMountOptions, UIDiagnostic,
    ConfirmationDialogController, ConfirmationDialogMountOptions, PopoverController, PopoverMountOptions,
} from './types';

const MOUNT = Symbol.for('fdo.ui.mount');
const ANCHOR = Symbol.for('fdo.ui.anchor');
const POPOVERS = Symbol.for('fdo.ui.open-popovers');
type MountedElement = HTMLElement & { [MOUNT]?: DialogController; [ANCHOR]?: PopoverController };

function failure(code: string, message: string): Error {
    return Object.assign(new Error(message), { code });
}
function owned(root: HTMLElement, selector: string): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(element => element.closest('[data-fdo-component]') === root);
}

function mount(root: HTMLElement, identity: string, options: UIMountOptions, confirmation?: ConfirmationDialogMountOptions, popover?: PopoverMountOptions): ConfirmationDialogController & PopoverController {
    if (root.getAttribute('data-fdo-component') !== identity) throw failure('UI_ROOT_INVALID', `Mount requires the root produced by ${identity}.`);
    if (root.getAttribute('data-fdo-component-version')?.split('.')[0] !== '1') throw failure('UI_VERSION_UNSUPPORTED', 'Mount requires component contract major 1.');
    if (!root.isConnected) throw failure('UI_ROOT_DISCONNECTED', 'Insert the component markup before mounting.');
    const document = root.ownerDocument;
    const window = document.defaultView;
    if (!window) throw failure('UI_DOCUMENT_UNAVAILABLE', 'Mount in a live browser document.');
    const dialog = root as HTMLDialogElement;
    if (!popover && (root.tagName !== 'DIALOG' || typeof dialog.showModal !== 'function')) throw failure('UI_NATIVE_DIALOG_REQUIRED', 'Native dialog support is required; install a host-approved dialog polyfill before mounting.');
    if (popover && (typeof root.showPopover !== 'function' || root.getAttribute('popover') !== 'auto')) throw failure('UI_NATIVE_POPOVER_REQUIRED', 'Native auto-popover support is required; upgrade the host or provide a host-approved polyfill.');
    if (!(root as MountedElement)[MOUNT] && (popover ? root.matches(':popover-open') : dialog.open)) throw failure('UI_ROOT_OPEN', 'Mount closed component markup; open it through the returned controller.');
    if (options.initialFocus && !root.contains(options.initialFocus)) throw failure('UI_FOCUS_INVALID', 'initialFocus must belong to this component root.');
    if (confirmation && typeof confirmation.onConfirm !== 'function') throw failure('UI_CONFIRM_HANDLER_REQUIRED', 'Provide an explicit frontend onConfirm callback.');
    if (popover && (popover.anchor.ownerDocument !== document || !popover.anchor.isConnected)) throw failure('UI_ANCHOR_INVALID', 'The anchor must be connected in the same document.');
    if (popover && (popover.anchor as MountedElement)[ANCHOR] && (popover.anchor as MountedElement)[ANCHOR] !== (root as MountedElement)[MOUNT]) throw failure('UI_ANCHOR_OWNED', 'Use a separate anchor for independently mounted popovers.');
    for (const value of [popover?.gap, popover?.viewportPadding]) if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw failure('UI_POSITION_INVALID', 'gap and viewportPadding must be finite non-negative numbers.');
    if (popover?.placement && !['bottom-start', 'bottom-end', 'top-start', 'top-end'].includes(popover.placement)) throw failure('UI_POSITION_INVALID', 'Use a supported popover placement.');
    if (popover?.overflow && !['shift', 'flip'].includes(popover.overflow)) throw failure('UI_POSITION_INVALID', 'overflow must be shift or flip.');
    const status = owned(root, '[data-fdo-slot="status"]')[0];
    const errorRegion = owned(root, '[data-fdo-slot="error"]')[0];
    const confirmButtons = owned(root, 'button[data-fdo-action="confirm"]') as HTMLButtonElement[];
    if (confirmation && (!status || !errorRegion || !confirmButtons.length)) throw failure('UI_SLOTS_MISSING', 'Confirmation markup requires status, error and confirm action slots.');
    // A new mount replaces only this root's prior owner, across SDK copies as well.
    (root as MountedElement)[MOUNT]?.destroy();
    const popoverStack: HTMLElement[] = (document as unknown as Record<symbol, HTMLElement[]>)[POPOVERS] ?? [];
    if (popover) (document as unknown as Record<symbol, HTMLElement[]>)[POPOVERS] = popoverStack;
    let requestedClose: UICloseReason | undefined;
    let opening = false;
    let disposing = false;
    let state: UIState = { open: false, destroyed: false, pending: false, error: null, closeReason: null };
    let opener: HTMLElement | undefined;
    let abort: AbortController | undefined;
    let operation: Promise<boolean> | undefined;
    let generation = 0;
    let observer: ResizeObserver | undefined;
    const listeners: Array<() => void> = [];
    const reported = new Set<string>();
    const initialDisabled = new Map(confirmButtons.map(button => [button, button.disabled]));
    const busy = root.getAttribute('aria-busy');
    const initialStyle = root.getAttribute('style');
    const anchorControls = popover?.anchor.getAttribute('aria-controls') ?? null;
    const anchorExpanded = popover?.anchor.getAttribute('aria-expanded') ?? null;
    const diagnostic = (code: string, message: string, error?: unknown) => {
        if (reported.has(code + message)) return;
        reported.add(code + message);
        const detail = error instanceof Error ? error.message : error === undefined ? undefined : String(error);
        const report: UIDiagnostic = { code, message, ...(detail ? { detail: detail.slice(0, 500) } : {}) };
        try {
            if (options.onDiagnostic) Promise.resolve(options.onDiagnostic(report)).catch(() => {});
            else console.error('[FDO:UI]', report);
        } catch { /* A diagnostic callback cannot break lifecycle cleanup. */ }
    };
    const notify = (callback: (() => void | Promise<void>) | undefined, name: string) => {
        if (!callback) return;
        try { Promise.resolve(callback()).catch(error => diagnostic('UI_CALLBACK_FAILED', `${name} rejected.`, error)); }
        catch (error) { diagnostic('UI_CALLBACK_FAILED', `${name} failed.`, error); }
    };
    const restoreAttribute = (element: HTMLElement, name: string, value: string | null) => {
        if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
    };
    const publish = () => {
        root.setAttribute('data-fdo-state', state.destroyed ? 'destroyed' : state.pending ? 'pending' : state.error ? 'error' : state.open ? 'open' : 'closed');
        if (confirmation) {
            root.setAttribute('aria-busy', String(state.pending));
            status.hidden = !state.pending;
            errorRegion.hidden = !state.error;
            errorRegion.textContent = state.error ?? '';
            for (const button of confirmButtons) button.disabled = state.pending || initialDisabled.get(button)!;
        }
        if (popover) popover.anchor.setAttribute('aria-expanded', String(state.open));
        const snapshot = Object.freeze({ ...state });
        notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const listen = (target: EventTarget, name: string, handler: EventListener, capture = false) => {
        target.addEventListener(name, handler, capture);
        listeners.push(() => target.removeEventListener(name, handler, capture));
    };
    const restoreFocus = () => {
        const active = document.activeElement;
        // Do not steal focus from another view or from a light-dismiss click target.
        if (options.restoreFocus !== false && opener?.isConnected && (active === document.body || active === root || (active && root.contains(active)) || active === opener)) {
            opener.focus({ preventScroll: true });
        }
    };
    const endCycle = (reason: UICloseReason) => {
        if (!state.open) return;
        generation++;
        const stackIndex = popoverStack.indexOf(root);
        if (stackIndex !== -1) popoverStack.splice(stackIndex, 1);
        abort?.abort();
        operation = undefined;
        state = { ...state, open: false, pending: false, error: null, closeReason: reason };
        publish();
        restoreFocus();
        notify(options.onClose ? () => options.onClose!(reason) : undefined, 'onClose');
    };
    const close = (reason: UICloseReason = 'programmatic') => {
        if (state.destroyed || !state.open) return;
        requestedClose = reason;
        try {
            if (popover) { if (root.matches(':popover-open')) root.hidePopover(); }
            else if (dialog.open) dialog.close(reason);
        } finally { requestedClose = undefined; }
        endCycle(reason);
    };
    const updatePosition = () => {
        if (!popover || !state.open || state.destroyed) return;
        if (!popover.anchor.isConnected) { close('programmatic'); return; }
        const rect = popover.anchor.getBoundingClientRect();
        const viewport = window.visualViewport;
        const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
        const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
        const padding = popover.viewportPadding ?? 8, gap = popover.gap ?? 8;
        const availableWidth = Math.max(0, width - 2 * padding), availableHeight = Math.max(0, height - 2 * padding);
        root.style.position = 'fixed';
        root.style.inset = 'auto';
        root.style.margin = '0';
        root.style.overflow = 'auto';
        root.style.maxWidth = `min(var(--fdo-ui-width, 32rem), ${availableWidth}px)`;
        root.style.maxHeight = `${availableHeight}px`;
        const size = root.getBoundingClientRect();
        const placement = popover.placement ?? 'bottom-start';
        let above = placement.startsWith('top');
        const belowSpace = top + height - padding - rect.bottom - gap;
        const aboveSpace = rect.top - gap - top - padding;
        if ((popover.overflow ?? 'flip') === 'flip' && (above ? aboveSpace : belowSpace) < size.height && (above ? belowSpace : aboveSpace) > (above ? aboveSpace : belowSpace)) above = !above;
        const x = placement.endsWith('end') ? rect.right - size.width : rect.left;
        const y = above ? rect.top - gap - size.height : rect.bottom + gap;
        root.style.left = `${Math.max(left + padding, Math.min(x, left + width - padding - size.width))}px`;
        root.style.top = `${Math.max(top + padding, Math.min(y, top + height - padding - size.height))}px`;
        root.setAttribute('data-fdo-placement', `${above ? 'top' : 'bottom'}-${placement.endsWith('end') ? 'end' : 'start'}`);
    };
    const open = (trigger?: HTMLElement) => {
        if (state.destroyed || disposing) throw failure('UI_DESTROYED', 'Mount a new controller after destroy().');
        if (state.open) return;
        if (!root.isConnected) throw failure('UI_ROOT_DISCONNECTED', 'Mount fresh markup before opening.');
        opener = trigger ?? (typeof (document.activeElement as HTMLElement)?.focus === 'function' ? document.activeElement as HTMLElement : undefined);
        opening = true;
        try { if (popover) root.showPopover(); else dialog.showModal(); } finally { opening = false; }
        if (popover) popoverStack.push(root);
        state = { ...state, open: true, error: null, closeReason: null };
        publish();
        if (!state.open || state.destroyed) return;
        updatePosition();
        const focus = options.initialFocus?.isConnected ? options.initialFocus : owned(root, '[autofocus], [data-fdo-action="cancel"]')[0] ?? root;
        focus.focus({ preventScroll: true });
    };
    const confirm = (): Promise<boolean> => {
        if (!confirmation || !state.open || state.destroyed) return Promise.resolve(false);
        if (operation) return operation;
        const current = ++generation;
        abort = new window.AbortController();
        const signal = abort.signal;
        state = { ...state, pending: true, error: null };
        // Set operation before any callback can re-enter confirm().
        let cancelAttempt: () => void;
        const canceled = new Promise<void>(resolve => { cancelAttempt = resolve; signal.addEventListener('abort', cancelAttempt, { once: true }); });
        const attempt = Promise.resolve().then(() => {
            if (signal.aborted || current !== generation) return;
            return confirmation.onConfirm({ signal });
        });
        const task = Promise.race([attempt, canceled]).then(() => {
            if (signal.aborted || current !== generation || state.destroyed || !state.open) return false;
            // Successful completion is not cancellation: do not abort the caller's completed work.
            abort = undefined;
            close('confirm');
            return true;
        }, error => {
            if (signal.aborted || current !== generation || state.destroyed || !state.open) return false;
            let message = 'Unable to confirm. Please try again.';
            try { message = confirmation.formatError?.(error) || (error instanceof Error && error.message ? error.message : message); }
            catch (formatFailure) { diagnostic('UI_ERROR_FORMAT_FAILED', 'formatError failed.', formatFailure); }
            operation = undefined;
            state = { ...state, pending: false, error: message };
            publish();
            return false;
        });
        // Both rejection and cancellation are observed even if work ignores its signal.
        void task.then(() => signal.removeEventListener('abort', cancelAttempt));
        operation = task;
        publish();
        return task;
    };
    const destroy = () => {
        if (state.destroyed || disposing) return;
        disposing = true;
        close('destroy');
        generation++;
        abort?.abort();
        for (const remove of listeners.splice(0)) remove();
        observer?.disconnect();
        state = { ...state, destroyed: true, pending: false };
        if ((root as MountedElement)[MOUNT] === controller) delete (root as MountedElement)[MOUNT];
        if (popover && (popover.anchor as MountedElement)[ANCHOR] === controller) {
            delete (popover.anchor as MountedElement)[ANCHOR];
            restoreAttribute(popover.anchor, 'aria-controls', anchorControls);
            restoreAttribute(popover.anchor, 'aria-expanded', anchorExpanded);
            restoreAttribute(root, 'style', initialStyle);
            root.removeAttribute('data-fdo-placement');
        }
        publish();
        // Restore caller-owned attributes after the final state notification.
        if (confirmation) restoreAttribute(root, 'aria-busy', busy);
        if (popover) restoreAttribute(popover.anchor, 'aria-expanded', anchorExpanded);
    };
    const controller = { open, close, getState: () => Object.freeze({ ...state }), destroy, confirm, updatePosition };
    try {
        (root as MountedElement)[MOUNT] = controller;
        listen(root, 'click', ((event: Event) => {
            const target = event.target as Element;
            const action = target.closest?.('[data-fdo-action]');
            if (!action || action.closest('[data-fdo-component]') !== root) return;
            if (action.getAttribute('data-fdo-action') === 'cancel') close('cancel');
            if (action.getAttribute('data-fdo-action') === 'confirm') void confirm();
        }) as EventListener);
        if (popover) {
            (popover.anchor as MountedElement)[ANCHOR] = controller;
            const controls = new Set((anchorControls ?? '').split(/\s+/).filter(Boolean));
            controls.add(root.id);
            popover.anchor.setAttribute('aria-controls', Array.from(controls).join(' '));
            listen(root, 'beforetoggle', ((event: Event & { newState?: string }) => {
                if (event.newState === 'open' && !opening && !state.open) { event.preventDefault(); diagnostic('UI_CONTROLLER_REQUIRED', 'Open the popover through its controller.'); }
            }) as EventListener);
            listen(root, 'toggle', (() => { if (!root.matches(':popover-open')) endCycle(requestedClose ?? 'dismiss'); }) as EventListener);
            listen(document, 'keydown', ((event: KeyboardEvent) => {
                if (event.defaultPrevented || event.key !== 'Escape' || !state.open || !root.matches(':popover-open')) return;
                // Only the most recently opened/topmost SDK popover handles Escape.
                const path = event.composedPath().filter((item): item is Element => typeof (item as Element).matches === 'function');
                if (path.some(element => element.matches('dialog:modal')) || popoverStack[popoverStack.length - 1] !== root) return;
                const activePopover = path.find(element => element.matches('[popover]:popover-open')) ?? document.activeElement?.closest('[popover]:popover-open');
                if (activePopover && activePopover !== root) return;
                event.preventDefault(); close('escape');
            }) as EventListener);
            listen(window, 'resize', updatePosition);
            listen(document, 'scroll', updatePosition, true);
            if (window.visualViewport) {
                listen(window.visualViewport, 'resize', updatePosition);
                listen(window.visualViewport, 'scroll', updatePosition);
            }
            if (typeof window.ResizeObserver === 'function') {
                observer = new window.ResizeObserver(updatePosition);
                observer.observe(root); observer.observe(popover.anchor);
            }
        } else {
            listen(root, 'cancel', ((event: Event) => { event.preventDefault(); close('escape'); }) as EventListener);
            listen(root, 'close', (() => { if (!dialog.open) endCycle(requestedClose ?? 'programmatic'); }) as EventListener);
        }
        listen(window, 'pagehide', destroy);
        publish();
    } catch (error) { destroy(); throw error; }
    return controller;
}

/** Mount only this native-dialog root. Remount disposes its prior controller; destroy is idempotent. */
export function mountDialog(root: HTMLDialogElement, options: UIMountOptions = {}): DialogController {
    return mount(root, 'fdo.dialog', options);
}
/** Mount an alertdialog; async confirm is coalesced, cancellable by signal and isolated from later open cycles. */
export function mountConfirmationDialog(root: HTMLDialogElement, options: ConfirmationDialogMountOptions): ConfirmationDialogController {
    return mount(root, 'fdo.confirmation-dialog', options, options);
}
/** Mount a native auto-popover anchored in the same document, with viewport shifting/flipping and owned cleanup. */
export function mountPopover(root: HTMLElement, options: PopoverMountOptions): PopoverController {
    return mount(root, 'fdo.popover', options, undefined, options);
}
