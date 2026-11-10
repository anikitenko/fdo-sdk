export type PluginCleanup = () => void | Promise<unknown>;
export type PluginCleanupReport = { success: boolean; failed: number; timedOut: boolean };

/** Explicit ownership for plugin timers, listeners, streams, sessions and processes. */
export class PluginScope {
    constructor(private readonly onError: (error: unknown) => void = () => {}) {}
    private report(error: unknown): void { try { this.onError(error); } catch {} }
    private invoke(callback: () => void | Promise<unknown>): Promise<void> {
        try { return Promise.resolve(callback()).then(() => {}, error => this.report(error)); }
        catch (error) { this.report(error); return Promise.resolve(); }
    }
    private readonly controller = new AbortController();
    private readonly cleanups = new Set<PluginCleanup>();
    private disposal?: Promise<PluginCleanupReport>;
    public get signal(): AbortSignal { return this.controller.signal; }

    public add(cleanup: PluginCleanup): () => void {
        if (this.signal.aborted) {
            // A resource acquired after an async operation completed during shutdown
            // must be released too. Observe rejection even after the deadline.
            try { void Promise.resolve(cleanup()).catch(error => this.report(error)); } catch (error) { this.report(error); }
            throw new Error('Plugin scope is disposed.');
        }
        this.cleanups.add(cleanup);
        return () => { this.cleanups.delete(cleanup); };
    }

    public use<T>(resource: T, cleanup: (resource: T) => void | Promise<unknown>): T {
        this.add(() => cleanup(resource));
        return resource;
    }

    public listen(
        source: { on: (event: string, callback: (...args: any[]) => void) => unknown;
            off: (event: string, callback: (...args: any[]) => void) => unknown },
        event: string,
        callback: (...args: any[]) => void | Promise<unknown>
    ): () => void {
        const listener = (...args: any[]) => { if (!this.signal.aborted) this.invoke(() => callback(...args)); };
        const remove = () => { source.off(event, listener); };
        const unregister = this.add(remove);
        source.on(event, listener);
        if (this.signal.aborted) remove();
        return () => { unregister(); remove(); };
    }

    public interval(callback: () => void | Promise<unknown>, milliseconds: number): ReturnType<typeof setInterval> {
        let running = false;
        const timer = setInterval(() => {
            if (this.signal.aborted || running) return;
            running = true;
            void this.invoke(callback).finally(() => { running = false; });
        }, milliseconds);
        this.add(() => clearInterval(timer));
        return timer;
    }

    public timeout(callback: () => void | Promise<unknown>, milliseconds: number): ReturnType<typeof setTimeout> {
        let unregister = () => {};
        const timer = setTimeout(() => { unregister(); if (!this.signal.aborted) this.invoke(callback); }, milliseconds);
        unregister = this.add(() => clearTimeout(timer));
        return timer;
    }

    public dispose(timeoutMs = 4000): Promise<PluginCleanupReport> {
        if (this.disposal) return this.disposal;
        // Publish the promise before abort callbacks can reenter disposal.
        let complete!: (report: PluginCleanupReport) => void;
        this.disposal = new Promise(resolve => { complete = resolve; });
        this.controller.abort();
        const callbacks = [...this.cleanups].reverse();
        this.cleanups.clear();
        let failed = 0;
        const pending = callbacks.map(cleanup => {
            try { return Promise.resolve(cleanup()).catch(error => { failed++; this.report(error); }); }
            catch (error) { failed++; this.report(error); return Promise.resolve(); }
        });
        const budget = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(timeoutMs, 30000)) : 4000;
        const timer = setTimeout(() => complete({success: false, failed, timedOut: true}), budget);
        void Promise.all(pending).then(() => {
            clearTimeout(timer);
            complete({success: failed === 0, failed, timedOut: false});
        });
        return this.disposal;
    }
}
