/** Runs against the browser-safe module loaded from the installed tarball. */
export async function feedbackBrowserChecks({ evaluate, check, accessible, click }) {
    await check(`!document.hidden`, 'feedback timing fixture runs in a visible browser page');
    await evaluate(`(() => {
        const dom = new ui.DOM().collectStylesFrom();
        document.body.insertAdjacentHTML('beforeend', dom.renderHTML(
            ui.createProgressBar(dom, {id:'feedback-progress', label:'Files uploaded', value:null}) +
            ui.createToast(dom, {id:'feedback-toast', title:'Upload', message:'Preparing files', progress:{label:'Upload progress', value:null}, options:{style:{'--fdo-ui-background':'rgb(10, 20, 30)'}}}) +
            ui.createToast(dom, {id:'feedback-other', message:'Other notification', variant:'warning'})
        ));
        window.feedbackReasons = [];
        window.feedbackProgress = ui.mountProgressBar(document.getElementById('feedback-progress'));
        window.feedbackToast = ui.mountToast(document.getElementById('feedback-toast'), {onClose: reason => feedbackReasons.push(reason), onDiagnostic});
        window.feedbackOther = ui.mountToast(document.getElementById('feedback-other'), {onDiagnostic});
        document.getElementById('outside').focus(); feedbackToast.show(); feedbackOther.show();
    })()`);
    await check(`document.activeElement.id === 'outside' && feedbackToast.getState().open && feedbackOther.getState().open`, 'toasts never capture focus or close another instance');
    await accessible('progressbar', 'Files uploaded');
    await accessible('progressbar', 'Upload progress');
    await check(`document.getElementById('feedback-progress').matches(':indeterminate') && getComputedStyle(document.getElementById('feedback-toast')).backgroundColor === 'rgb(10, 20, 30)'`, 'native indeterminate progress and owned toast customization');
    await evaluate(`feedbackProgress.setValue(3, 5); feedbackToast.setProgress(80); feedbackToast.update({title:'Almost done', message:'Finishing', variant:'error'})`);
    await check(`document.getElementById('feedback-progress').value === 3 && document.getElementById('feedback-progress').max === 5 && document.getElementById('feedback-toast-progress').value === 80 && document.getElementById('feedback-toast').getAttribute('role') === 'alert'`, 'native values and severity update without HTML evaluation');
    await evaluate(`feedbackToast.setProgress(100); feedbackToast.update({message:'<b>Complete</b>', variant:'success'})`);
    await check(`feedbackToast.getState().open && !document.querySelector('#feedback-toast [data-fdo-slot="message"] b') && document.getElementById('feedback-toast').getAttribute('role') === 'status'`, 'completion stays visible and content updates stay plain text');
    await evaluate(`document.querySelector('#feedback-toast [data-fdo-action="dismiss"]').id = 'feedback-dismiss'`);
    await click('feedback-dismiss');
    await check(`!feedbackToast.getState().open && feedbackReasons.join() === 'dismiss' && feedbackOther.getState().open`, 'dismiss button is scoped and exposes its close reason');
    await evaluate(`window.feedbackOld = feedbackOther; window.feedbackOther = ui.mountToast(document.getElementById('feedback-other')); feedbackOther.show(); feedbackOld.destroy()`);
    await check(`feedbackOld.getState().destroyed && feedbackOther.getState().open`, 'remount ownership survives cleanup through an old controller');
    await click('outside');
    await evaluate(`feedbackToast.destroy(); feedbackOther.destroy(); feedbackProgress.destroy(); feedbackToast.destroy(); document.getElementById('outside').focus(); window.feedbackTimer = ui.mountToast(document.getElementById('feedback-other'), {duration:100}); feedbackTimer.show(); feedbackTimer.pause()`);
    await evaluate(`new Promise(resolve => setTimeout(resolve, 130))`);
    await check(`feedbackTimer.getState().open && feedbackTimer.getState().paused`, 'explicit pause suspends automatic dismissal');
    await evaluate(`feedbackTimer.resume(); new Promise(resolve => setTimeout(resolve, 130))`);
    await check(`!feedbackTimer.getState().open && feedbackTimer.getState().closeReason === 'timeout'`, 'timeout resumes and reports its reason');
    await evaluate(`feedbackTimer.destroy(); window.feedbackFocused = ui.mountToast(document.getElementById('feedback-other'), {duration:100}); feedbackFocused.show(); document.querySelector('#feedback-other [data-fdo-action="dismiss"]').focus(); new Promise(resolve => setTimeout(resolve, 130))`);
    await check(`feedbackFocused.getState().open && feedbackFocused.getState().paused && document.activeElement.closest('[data-fdo-component]')?.id === 'feedback-other'`, 'keyboard focus within a toast pauses dismissal');
    await evaluate(`feedbackFocused.destroy()`);
    await check(`!document.getElementById('feedback-other').contains(document.activeElement)`, 'teardown releases focus before hiding toast controls');
    await evaluate(`document.getElementById('feedback-toast').remove(); document.getElementById('feedback-other').remove(); document.getElementById('feedback-progress').remove()`);
    await check(`errors.length === 0 && window.__backendCalls === 0`, 'feedback cleanup emits no diagnostics or backend calls');
}
