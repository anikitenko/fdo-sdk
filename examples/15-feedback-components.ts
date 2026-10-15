import { DOM, createProgressBar, createToast, mountProgressBar, mountToast } from '@anikitenko/fdo-sdk/ui';

/** Pure backend/editor composition. No frontend handlers or services execute here. */
export function feedbackMarkup(): string {
    const dom = new DOM().collectStylesFrom();
    return dom.renderHTML(createProgressBar(dom, { id: 'upload-progress', label: 'Upload progress', value: 0 }) +
        createToast(dom, { id: 'upload-toast', title: 'Uploading', message: 'Preparing files…', progress: { label: 'Files uploaded', value: null } }));
}

/** Call from frontend code supplied with the browser-safe UI module. IDs are scoped to this view. */
export function mountFeedback(scope: HTMLElement) {
    const progressRoot = scope.querySelector<HTMLElement>('[data-fdo-component="fdo.progress-bar"]');
    const toastRoot = scope.querySelector<HTMLElement>('[data-fdo-component="fdo.toast"]');
    if (!progressRoot || !toastRoot) throw new Error('Insert feedbackMarkup() before mounting.');
    const progress = mountProgressBar(progressRoot);
    try {
        const toast = mountToast(toastRoot); // Manual dismissal keeps long-running work visible.
        toast.show();
        return {
            update(completed: number, total: number) {
                progress.setValue(completed, total);
                toast.setProgress(completed, total);
                toast.update({ message: `${completed} of ${total} files uploaded.` });
            },
            complete() { toast.update({ variant: 'success', title: 'Upload complete', message: 'All files uploaded.' }); },
            fail(message: string) { toast.update({ variant: 'error', title: 'Upload failed', message }); },
            destroy() { toast.destroy(); progress.destroy(); },
        };
    } catch (error) { progress.destroy(); throw error; }
}
