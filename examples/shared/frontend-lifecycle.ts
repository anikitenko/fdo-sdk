import { defineRenderOnLoadActions } from '@anikitenko/fdo-sdk';

/** Support for the older, closure-heavy demos. Prefer declarative bindings for new views.
 * The setup expression receives owned listeners/timers and explicit resource cleanup.
 * It must be self-contained: imports and backend instance fields are unavailable in the iframe.
 */
export function defineExampleSetup(source: string, lifecycleKey: string) {
    return defineRenderOnLoadActions({
        lifecycleKey,
        handlers: {},
        bindings: [],
        setup: `() => {
            const cleanups = new Set();
            let disposed = false;
            const report = error => console.error('[FDO:example] Frontend operation failed.', error);
            const onDispose = callback => {
                if (disposed) { callback(); return () => {}; }
                cleanups.add(callback);
                return () => cleanups.delete(callback);
            };
            const dispose = () => {
                if (disposed) return;
                disposed = true;
                for (const cleanup of Array.from(cleanups).reverse()) {
                    try { const result = cleanup(); if (result?.then) result.catch(report); } catch (error) { report(error); }
                }
                cleanups.clear();
            };
            const listen = (target, event, callback, options) => {
                if (!target || disposed) return () => {};
                const listener = function(event) {
                    if (disposed) return;
                    try { const result = callback.call(this, event); if (result?.then) return result.catch(report); return result; } catch (error) { report(error); }
                };
                target.addEventListener(event, listener, options);
                const remove = () => target.removeEventListener(event, listener, options);
                const forget = onDispose(remove);
                return () => { remove(); forget(); };
            };
            const timeout = (callback, delay) => {
                let forget = () => {};
                const timer = setTimeout(() => { forget(); if (!disposed) { try { const result = callback(); if (result?.then) result.catch(report); } catch (error) { report(error); } } }, delay);
                forget = onDispose(() => clearTimeout(timer));
                return timer;
            };
            const interval = (callback, delay) => {
                let running = false;
                const timer = setInterval(async () => {
                    if (disposed || running) return;
                    running = true;
                    try { await callback(); } catch (error) { report(error); } finally { running = false; }
                }, delay);
                onDispose(() => clearInterval(timer));
                return timer;
            };
            try {
                const cleanup = (${source})({listen, timeout, interval, onDispose, isDisposed: () => disposed});
                if (typeof cleanup === 'function') onDispose(cleanup);
                return dispose;
            } catch (error) { dispose(); throw error; }
        }`,
    });
}
