import type {
    ProgressBarController, ProgressBarMountOptions, ProgressBarState, ToastController, ToastMountOptions,
    ToastState, ToastUpdate, ToastCloseReason,
} from './types';
import { feedbackCallbacks, progressValues, toastVariant } from './feedback-shared';

const MOUNT = Symbol.for('fdo.ui.mount');
type FeedbackRoot = HTMLElement & { [MOUNT]?: { destroy(): void } };
function fail(code: string, message: string): never { throw Object.assign(new Error(message), { code }); }
function validateRoot(root: HTMLElement, identity: string): void {
    if (root.getAttribute('data-fdo-component') !== identity) fail('UI_ROOT_INVALID', `Mount the root produced by ${identity}.`);
    if (root.getAttribute('data-fdo-component-version')?.split('.')[0] !== '1') fail('UI_VERSION_UNSUPPORTED', 'Mount requires component contract major 1.');
    if (!root.isConnected || !root.ownerDocument.defaultView) fail('UI_ROOT_DISCONNECTED', 'Mount only after attaching the component to a live document.');
}
function owned(root: HTMLElement, selector: string): HTMLElement | undefined {
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).find(element => element.closest('[data-fdo-component]') === root);
}
/** Mount a composed native progress element; updates never announce or dismiss a toast implicitly. */
export function mountProgressBar(root: HTMLElement, options: ProgressBarMountOptions = {}): ProgressBarController {
    validateRoot(root, 'fdo.progress-bar');
    if (root.tagName !== 'PROGRESS') fail('UI_ROOT_INVALID', 'ProgressBar requires a native progress element.');
    const initial = progressValues(root.hasAttribute('value') ? Number(root.getAttribute('value')) : null, Number(root.getAttribute('max')));
    (root as FeedbackRoot)[MOUNT]?.destroy();
    let state: ProgressBarState = { ...initial, destroyed: false };
    const notify = feedbackCallbacks(options.onDiagnostic);
    const getState = () => Object.freeze({ ...state });
    const publish = () => {
        root.setAttribute('data-fdo-state', state.destroyed ? 'destroyed' : state.value === null ? 'indeterminate' : 'determinate');
        const snapshot = getState();
        notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const controller: ProgressBarController = {
        setValue(value, max = state.max) {
            if (state.destroyed) return;
            const next = progressValues(value, max);
            state = { ...next, destroyed: false };
            root.setAttribute('max', String(next.max));
            if (next.value === null) root.removeAttribute('value'); else root.setAttribute('value', String(next.value));
            publish();
        },
        getState,
        destroy() {
            if (state.destroyed) return;
            state = { ...state, destroyed: true };
            if ((root as FeedbackRoot)[MOUNT] === controller) delete (root as FeedbackRoot)[MOUNT];
            publish();
        },
    };
    (root as FeedbackRoot)[MOUNT] = controller;
    return controller;
}
/** Mount one toast. No global container, backend bridge, focus capture or notification history is created. */
export function mountToast(root: HTMLElement, options: ToastMountOptions = {}): ToastController {
    validateRoot(root, 'fdo.toast');
    const duration = options.duration ?? 0;
    if (!Number.isFinite(duration) || duration < 0 || duration > 2147483647) fail('UI_TOAST_DURATION_INVALID', 'duration must be milliseconds between 0 and 2147483647; use 0 for manual dismissal.');
    const title = owned(root, '[data-fdo-slot="title"]');
    const message = owned(root, '[data-fdo-slot="message"]');
    const dismiss = owned(root, '[data-fdo-action="dismiss"]');
    if (!title || !message || !dismiss) fail('UI_SLOTS_MISSING', 'Toast requires title, message and dismiss slots.');
    const progressSlot = owned(root, '[data-fdo-slot="progress"]');
    const progressRoot = Array.from(progressSlot?.children ?? []).find(element => element.getAttribute('data-fdo-component') === 'fdo.progress-bar') as HTMLElement | undefined;
    if (progressSlot && !progressRoot) fail('UI_SLOTS_MISSING', 'Toast progress slot requires composed ProgressBar markup.');
    // Validate before replacing a working owner or attaching any listeners.
    if (progressRoot) {
        validateRoot(progressRoot, 'fdo.progress-bar');
        if (progressRoot.tagName !== 'PROGRESS') fail('UI_ROOT_INVALID', 'Toast progress must be native progress markup.');
        progressValues(progressRoot.hasAttribute('value') ? Number(progressRoot.getAttribute('value')) : null, Number(progressRoot.getAttribute('max')));
    }
    const variant = toastVariant(root.getAttribute('data-fdo-variant') ?? undefined);
    (root as FeedbackRoot)[MOUNT]?.destroy();
    const document = root.ownerDocument;
    const window = document.defaultView!;
    const notify = feedbackCallbacks(options.onDiagnostic);
    const listeners: Array<() => void> = [];
    const pauses = new Set<string>();
    let open = false, destroyed = false, closeReason: ToastCloseReason | null = null, currentVariant = variant;
    let remaining = duration, started = 0, timer: number | undefined;
    let progress: ProgressBarController | undefined;
    const getState = (): ToastState => Object.freeze({ open, destroyed, closeReason, variant: currentVariant, paused: pauses.size > 0, progress: progress?.getState() ?? null });
    const publish = () => {
        root.hidden = !open;
        root.setAttribute('data-fdo-state', destroyed ? 'destroyed' : open ? 'open' : 'closed');
        const snapshot = getState();
        notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const clearTimer = () => {
        if (timer === undefined) return;
        window.clearTimeout(timer);
        timer = undefined;
        remaining = Math.max(0, remaining - (Date.now() - started));
    };
    const schedule = () => {
        if (!duration || !open || destroyed || pauses.size || timer !== undefined) return;
        started = Date.now();
        timer = window.setTimeout(() => { timer = undefined; controller.close('timeout'); }, remaining);
    };
    const pauseFor = (reason: string, paused: boolean) => {
        if (destroyed || pauses.has(reason) === paused) return;
        clearTimer();
        if (paused) pauses.add(reason); else pauses.delete(reason);
        schedule();
        publish();
    };
    const listen = (target: EventTarget, name: string, callback: EventListener) => {
        target.addEventListener(name, callback);
        listeners.push(() => target.removeEventListener(name, callback));
    };
    const controller: ToastController = {
        show() {
            if (destroyed || open) return;
            remaining = duration;
            closeReason = null;
            open = true;
            pauses.delete('pointer'); pauses.delete('focus'); pauses.delete('document');
            root.hidden = false;
            if (root.matches(':hover')) pauses.add('pointer');
            if (root.contains(document.activeElement)) pauses.add('focus');
            if (document.hidden) pauses.add('document');
            publish();
            schedule();
        },
        close(reason = 'programmatic') {
            if (destroyed || !open) return;
            clearTimer(); open = false; closeReason = reason;
            // A dismiss button must not remain focused inside hidden markup. Never move outside focus.
            if (root.contains(document.activeElement)) (document.activeElement as HTMLElement | null)?.blur();
            publish();
            notify(options.onClose ? () => options.onClose!(reason) : undefined, 'onClose');
        },
        update(content: ToastUpdate) {
            if (destroyed) return;
            const nextVariant = toastVariant(content.variant ?? currentVariant);
            if (content.title !== undefined) title.textContent = content.title;
            if (content.message !== undefined) message.textContent = content.message;
            currentVariant = nextVariant;
            root.setAttribute('data-fdo-variant', currentVariant);
            root.setAttribute('role', currentVariant === 'warning' || currentVariant === 'error' ? 'alert' : 'status');
            publish();
        },
        setProgress(value, max) {
            if (destroyed) return;
            if (!progress) fail('UI_TOAST_PROGRESS_MISSING', 'Compose this toast with progress before calling setProgress().');
            progress.setValue(value, max);
        },
        pause() { pauseFor('manual', true); },
        resume() { pauseFor('manual', false); },
        getState,
        destroy() {
            if (destroyed) return;
            clearTimer();
            const wasOpen = open;
            open = false; destroyed = true;
            if (root.contains(document.activeElement)) (document.activeElement as HTMLElement | null)?.blur();
            if (wasOpen) closeReason = 'destroy';
            for (const remove of listeners.splice(0)) remove();
            progress?.destroy();
            if ((root as FeedbackRoot)[MOUNT] === controller) delete (root as FeedbackRoot)[MOUNT];
            publish();
            if (wasOpen) notify(options.onClose ? () => options.onClose!('destroy') : undefined, 'onClose');
        },
    };
    try {
        progress = progressRoot ? mountProgressBar(progressRoot, { onStateChange: () => { if (!destroyed) publish(); }, onDiagnostic: options.onDiagnostic }) : undefined;
        listen(dismiss, 'click', () => controller.close('dismiss'));
        listen(root, 'pointerenter', () => pauseFor('pointer', true));
        listen(root, 'pointerleave', () => pauseFor('pointer', false));
        listen(root, 'focusin', () => pauseFor('focus', true));
        listen(root, 'focusout', () => { pauseFor('focus', root.contains(document.activeElement)); });
        listen(document, 'visibilitychange', () => pauseFor('document', document.hidden));
        (root as FeedbackRoot)[MOUNT] = controller;
        root.hidden = true;
        root.setAttribute('data-fdo-state', 'closed');
    } catch (error) { controller.destroy(); throw error; }
    return controller;
}
