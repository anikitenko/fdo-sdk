/** Real native keyboard/focus/ARIA and lifecycle checks against the installed browser-safe SDK. */
export async function authoringBrowserChecks({ evaluate, check, accessible, click, key, settle }) {
    await evaluate(`(() => {
        const dom = new ui.DOM().collectStylesFrom();
        const items = [{key:'general', label:'General', body:'<p>General settings</p>'}, {key:'disabled', label:'Unavailable', body:'', disabled:true}, {key:'advanced', label:'Advanced', body:'<p>Advanced settings</p>'}];
        const accordionItems = [{key:'local', title:'Local', body:'<p>Local connection</p>'}, {key:'remote', title:'Remote', body:'<p>Remote connection</p>'}];
        document.body.insertAdjacentHTML('beforeend', dom.renderHTML(
            ui.createInlineAlert(dom, {id:'author-alert', ariaLabel:'Validation', message:'Review your settings.'}) +
            ui.createAsyncActionButton(dom, {id:'author-action', label:'Save', pendingLabel:'Saving', successLabel:'Saved'}) +
            ui.createToastRegion(dom, {id:'author-region', label:'Task notifications', body: ['one','two','three'].map(id => ui.createToast(dom, {id:'author-toast-'+id, message:id})).join('')}) +
            ui.createTabs(dom, {id:'author-tabs', label:'Settings', items}) +
            ui.createTabs(dom, {id:'author-vertical', label:'Vertical settings', orientation:'vertical', items}) +
            ui.createDisclosure(dom, {id:'author-help', title:'Connection help', body:'<p>Help content</p>'}) +
            ui.createAccordion(dom, {id:'author-accordion', label:'Connections', items:accordionItems}) +
            ui.createAccordion(dom, {id:'author-multiple', label:'Multiple connections', multiple:true, items:accordionItems})
        ));
        window.authorAlert = ui.mountInlineAlert(document.getElementById('author-alert'), {onDiagnostic});
        window.actionMode = 'pending'; window.actionResolvers = []; window.actionSignals = [];
        window.authorAction = ui.mountAsyncActionButton(document.getElementById('author-action'), {onDiagnostic, onAction: ({signal}) => { actionSignals.push(signal); if(actionMode === 'error') return Promise.reject(Error('Save failed')); return new Promise(resolve => actionResolvers.push(resolve)); }});
        document.querySelector('#author-action [data-fdo-action="run"]').id='author-run'; document.querySelector('#author-action [data-fdo-action="cancel"]').id='author-cancel';
        window.authorRegion = ui.mountToastRegion(document.getElementById('author-region'), {maxVisible:1, maxQueued:1, onDiagnostic});
        window.authorTabs = ui.mountTabs(document.getElementById('author-tabs'), {activation:'manual', onDiagnostic});
        window.authorVertical = ui.mountTabs(document.getElementById('author-vertical'), {onDiagnostic});
        window.authorHelp = ui.mountDisclosure(document.getElementById('author-help'), {onDiagnostic});
        window.authorAccordion = ui.mountAccordion(document.getElementById('author-accordion'), {onDiagnostic});
        window.authorMultiple = ui.mountAccordion(document.getElementById('author-multiple'), {onDiagnostic});
        document.querySelector('#author-help summary').id='author-help-summary';
        document.querySelector('#author-accordion-local summary').id='author-local-summary'; document.querySelector('#author-accordion-remote summary').id='author-remote-summary';
    })()`);
    await evaluate(`authorAlert.update({message:'<b>Required field</b>', variant:'error'})`);
    await check(`!document.getElementById('author-alert').hasAttribute('aria-labelledby') && !document.getElementById('author-alert').hasAttribute('aria-describedby')`, 'inline alert omits absent accessible relationships');
    await accessible('alert', 'Validation');
    await check(`document.querySelector('#author-alert [data-fdo-slot="message"]').textContent === '<b>Required field</b>' && !document.querySelector('#author-alert b')`, 'inline alert preserves accessible labels and plain text');
    await click('author-run');
    await evaluate(`window.actionPromise = authorAction.run(); window.actionDuplicate = authorAction.run(); void 0`);
    await check(`actionPromise === actionDuplicate && actionSignals.length === 1 && document.getElementById('author-run').disabled && !document.getElementById('author-cancel').hidden && document.getElementById('author-action').getAttribute('aria-busy') === 'true'`, 'action duplicate protection and pending controls');
    await click('author-cancel');
    await check(`actionSignals[0].aborted && authorAction.getState().phase === 'cancelled'`, 'explicit cancel aborts work');
    await check(`actionPromise.then(result => result === false)`, 'cancel resolves even when external work ignores abort');
    await click('author-run'); await evaluate(`actionResolvers[0]()`); await settle();
    await check(`authorAction.getState().phase === 'pending'`, 'late cancelled completion does not affect newer work');
    await evaluate(`actionResolvers[1]()`); await settle();
    await check(`authorAction.getState().phase === 'success' && document.getElementById('author-run').textContent === 'Saved'`, 'successful action feedback');
    await evaluate(`actionMode='error'; authorAction.run()`);
    await check(`authorAction.getState().phase === 'error' && document.querySelector('#author-action [data-fdo-slot="error"]').textContent === 'Save failed'`, 'rejected action presents persistent error feedback');
    await evaluate(`authorAction.reset(); actionMode='pending'; void authorAction.run()`); await settle();
    await evaluate(`authorAction.destroy(); authorAction.destroy()`);
    await check(`actionSignals[actionSignals.length-1].aborted && authorAction.getState().destroyed && !document.getElementById('author-run').disabled`, 'action teardown aborts work and restores native button state');
    await evaluate(`window.authorQueueAccepted = [authorRegion.enqueue(document.getElementById('author-toast-one')), authorRegion.enqueue(document.getElementById('author-toast-two')), authorRegion.enqueue(document.getElementById('author-toast-three')), authorRegion.enqueue(document.getElementById('author-toast-one'))]; document.querySelector('#author-toast-one [data-fdo-action="dismiss"]').id='author-toast-dismiss'`);
    await check(`authorQueueAccepted.join() === 'true,true,false,false' && authorRegion.getState().entries[1].status === 'queued' && document.getElementById('author-toast-two').hidden`, 'region bounds visible/queued notifications and rejects duplicate keys');
    await accessible('region', 'Task notifications');
    await click('author-toast-dismiss');
    await check(`authorRegion.getState().entries.length === 1 && authorRegion.getState().entries[0].key === 'author-toast-two' && !document.getElementById('author-toast-two').hidden`, 'dismissal promotes the next queued toast');
    await evaluate(`document.getElementById('author-tabs-tab-general').focus()`); await key('ArrowRight');
    await check(`document.activeElement.id === 'author-tabs-tab-advanced' && authorTabs.getState().activeKey === 'general'`, 'manual tabs skip disabled items without activating');
    await key('Enter');
    await check(`authorTabs.getState().activeKey === 'advanced' && !document.getElementById('author-tabs-panel-advanced').hidden && document.getElementById('author-tabs-panel-general').hidden`, 'Enter activates linked tab panel');
    await key('Home'); await key(' ');
    await check(`document.activeElement.id === 'author-tabs-tab-general' && authorTabs.getState().activeKey === 'general' && document.getElementById('author-tabs-tab-advanced').tabIndex === -1`, 'Home/Space keep a single tab stop and selected tab');
    await accessible('tab', 'General'); await accessible('tabpanel', 'General');
    await evaluate(`document.getElementById('author-vertical-tab-general').focus()`); await key('ArrowDown');
    await check(`authorVertical.getState().activeKey === 'advanced' && document.activeElement.id === 'author-vertical-tab-advanced'`, 'vertical automatic activation and focus');
    await key('ArrowDown');
    await check(`authorVertical.getState().activeKey === 'general' && authorTabs.getState().activeKey === 'general'`, 'vertical tabs wrap without affecting another instance');
    await evaluate(`document.getElementById('author-tabs').style.direction='rtl'; document.getElementById('author-tabs-tab-general').focus()`); await key('ArrowLeft');
    await check(`document.activeElement.id === 'author-tabs-tab-advanced'`, 'horizontal navigation follows visual direction in RTL');
    await click('author-help-summary');
    await check(`authorHelp.getState().open && document.getElementById('author-help').open`, 'native summary click synchronizes disclosure state');
    await key(' ');
    await check(`!authorHelp.getState().open && document.activeElement.id === 'author-help-summary'`, 'native summary Space retains keyboard focus');
    await click('author-local-summary'); await click('author-remote-summary');
    await check(`!document.getElementById('author-accordion-local').open && document.getElementById('author-accordion-remote').open && authorAccordion.getState().openKeys.join() === 'remote'`, 'single-open accordion coordinates native disclosures');
    await evaluate(`authorMultiple.setOpen('local', true); authorMultiple.setOpen('remote', true)`); await settle();
    await check(`authorMultiple.getState().openKeys.length === 2 && authorAccordion.getState().openKeys.join() === 'remote'`, 'multiple-open accordion remains independently scoped');
    await evaluate(`window.oldAuthorTabs=authorTabs; window.authorTabs=ui.mountTabs(document.getElementById('author-tabs')); oldAuthorTabs.destroy(); authorTabs.select('advanced'); authorRegion.destroy(); authorRegion.destroy(); authorAlert.destroy(); authorAction.destroy(); authorTabs.destroy(); authorVertical.destroy(); authorHelp.destroy(); authorAccordion.destroy(); authorMultiple.destroy()`);
    await check(`oldAuthorTabs.getState().destroyed && authorTabs.getState().activeKey === 'advanced' && authorRegion.getState().entries.length === 0`, 'remount/teardown preserve owner isolation and empty the queue');
    await evaluate(`(() => { const dom = new ui.DOM().collectStylesFrom(); document.body.insertAdjacentHTML('beforeend', dom.renderHTML(ui.createComponentGallery(dom, {id:'author-gallery'}))); })()`);
    await check(`document.querySelectorAll('#author-gallery [data-fdo-preview-case]').length === ui.UI_COMPONENT_PREVIEWS.length && Array.from(document.querySelectorAll('#author-gallery [data-fdo-preview]')).every(node => node.inert)`, 'gallery reuses every metadata state as inert browser specimens');
    await check(`Array.from(document.querySelectorAll('#author-gallery [id]')).map(node=>node.id).length === new Set(Array.from(document.querySelectorAll('#author-gallery [id]')).map(node=>node.id)).size && !document.querySelector(':modal')`, 'gallery IDs are unique and preview dialogs never take the top layer');
    await check(`Array.from(document.querySelectorAll('#author-gallery [role="status"], #author-gallery [role="alert"]')).every(node=>node.getAttribute('aria-live')==='off') && window.__backendCalls === 0 && errors.length === 0`, 'static previews never execute handlers, announce live feedback or call backend services');
}
