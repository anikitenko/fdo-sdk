import type { ToastRegionController, ToastRegionMountOptions, ToastRegionState, ToastRegionEntryOptions, ToastController } from './types';
import { mountToast } from './feedback-mount';
import { feedbackCallbacks } from './feedback-shared';
import { COMPONENT_MOUNT as MOUNT, ComponentRoot, validateComponent, uiFailure } from './component-internals';

/** Queue caller-composed toast elements within one explicitly supplied container. No global notification routing. */
export function mountToastRegion(root: HTMLElement, options: ToastRegionMountOptions = {}): ToastRegionController {
    validateComponent(root, 'fdo.toast-region');
    const maxVisible = options.maxVisible ?? 3, maxQueued = options.maxQueued ?? 50;
    if (!Number.isSafeInteger(maxVisible) || maxVisible < 1 || !Number.isSafeInteger(maxQueued) || maxQueued < 0) uiFailure('UI_TOAST_CAPACITY_INVALID', 'maxVisible must be a positive integer and maxQueued a non-negative integer.');
    (root as ComponentRoot)[MOUNT]?.destroy();
    type Entry = { root: HTMLElement; toast: ToastController; status: 'visible' | 'queued' };
    const entries = new Map<string, Entry>(), notify = feedbackCallbacks(options.onDiagnostic);
    let destroyed = false, draining = false, previous = '';
    const getState = (): ToastRegionState => Object.freeze({ destroyed, entries: Object.freeze(Array.from(entries, ([key, entry]) => Object.freeze({ key, status: entry.status }))) });
    const publish = () => {
        const snapshot = getState(), signature = JSON.stringify(snapshot);
        root.setAttribute('data-fdo-state', destroyed ? 'destroyed' : snapshot.entries.some(entry => entry.status === 'visible') ? 'active' : snapshot.entries.length ? 'queued' : 'empty');
        if (signature === previous) return; previous = signature;
        notify(options.onStateChange ? () => options.onStateChange!(snapshot) : undefined, 'onStateChange');
    };
    const drain = () => {
        if (draining || destroyed) return;
        draining = true;
        try {
            while (!destroyed && Array.from(entries.values()).filter(entry => entry.status === 'visible').length < maxVisible) {
                const queued = Array.from(entries).find(([, entry]) => entry.status === 'queued');
                if (!queued) break;
                const [key, entry] = queued;
                if (!entry.root.isConnected || !root.contains(entry.root)) { entries.delete(key); entry.toast.destroy(); continue; }
                entry.status = 'visible'; entry.toast.show();
            }
        } finally { draining = false; }
        publish();
    };
    const clear = () => {
        const old = Array.from(entries.values()); entries.clear();
        for (const entry of old) entry.toast.destroy();
        publish();
    };
    const controller: ToastRegionController = {
        enqueue(element, entryOptions: ToastRegionEntryOptions = {}) {
            if (destroyed) return false;
            const key = entryOptions.key ?? element.id;
            if (!key?.trim()) uiFailure('UI_TOAST_KEY_REQUIRED', 'Provide a non-empty toast key or id for deduplication.');
            if (entries.has(key) || Array.from(entries.values()).some(entry => entry.root === element)) return false;
            if (!root.contains(element) || element.parentElement?.closest('[data-fdo-component]') !== root) uiFailure('UI_TOAST_SCOPE_INVALID', 'Insert a composed toast inside this region before enqueueing it. Nested regions and other plugin roots are not owned here.');
            if ((element as ComponentRoot)[MOUNT]) uiFailure('UI_TOAST_OWNED', 'Enqueue an unmounted toast; the region owns its mounting and cleanup.');
            const visible = Array.from(entries.values()).filter(entry => entry.status === 'visible').length;
            if (visible >= maxVisible && Array.from(entries.values()).filter(entry => entry.status === 'queued').length >= maxQueued) return false;
            let entry: Entry | undefined;
            const toast = mountToast(element, { ...entryOptions, onDiagnostic: entryOptions.onDiagnostic ?? options.onDiagnostic,
                onClose: reason => {
                    if (entry && entries.get(key) === entry) { entries.delete(key); entry.toast.destroy(); drain(); }
                    return entryOptions.onClose?.(reason);
                },
            });
            entry = { root: element, toast, status: 'queued' }; entries.set(key, entry); drain(); return true;
        },
        dismiss(key) {
            if (destroyed) return; const entry = entries.get(key); if (!entry) return;
            if (entry.status === 'visible') entry.toast.close('programmatic');
            else { entries.delete(key); entry.toast.destroy(); drain(); }
        },
        update(key, content) { if (!destroyed) entries.get(key)?.toast.update(content); },
        setProgress(key, value, max) { if (!destroyed) entries.get(key)?.toast.setProgress(value, max); },
        clear() { if (!destroyed) clear(); }, getState,
        destroy() {
            if (destroyed) return; destroyed = true; clear();
            if ((root as ComponentRoot)[MOUNT] === controller) delete (root as ComponentRoot)[MOUNT];
        },
    };
    (root as ComponentRoot)[MOUNT] = controller; publish();
    return controller;
}
