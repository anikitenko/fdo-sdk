import type { UIDiagnostic } from './types';

export function progressValues(value: number | null | undefined, max = 100): { value: number | null; max: number } {
    if (!Number.isFinite(max) || max <= 0 || (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0 || value > max))) {
        throw Object.assign(new Error('Progress requires a finite max > 0 and a value in [0, max], or null for indeterminate progress.'), { code: 'UI_PROGRESS_INVALID' });
    }
    return { value: value ?? null, max };
}
export function toastVariant(value = 'info'): 'info' | 'success' | 'warning' | 'error' {
    if (!['info', 'success', 'warning', 'error'].includes(value)) throw Object.assign(new Error('Toast variant must be info, success, warning or error.'), { code: 'UI_TOAST_VARIANT_INVALID' });
    return value as 'info' | 'success' | 'warning' | 'error';
}
/** Isolate rejected callbacks; diagnostics are deduplicated per mounted instance. */
export function feedbackCallbacks(onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>) {
    const reported = new Set<string>();
    return (callback: (() => void | Promise<void>) | undefined, name: string): void => {
        const report = (error: unknown) => {
            if (reported.has(name)) return;
            reported.add(name);
            const diagnostic = { code: 'UI_CALLBACK_FAILED', message: `${name} failed.`, detail: String(error).slice(0, 500) };
            try {
                if (onDiagnostic) Promise.resolve(onDiagnostic(diagnostic)).catch(() => {});
                else console.error('[FDO:UI]', diagnostic);
            } catch { /* Reporting cannot interrupt cleanup. */ }
        };
        try { if (callback) Promise.resolve(callback()).catch(report); } catch (error) { report(error); }
    };
}
