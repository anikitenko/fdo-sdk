import {
    DOM, createInlineAlert, createToastRegion, createAsyncActionButton, createTabs, createDisclosure, createAccordion,
    mountInlineAlert, mountToastRegion, mountAsyncActionButton, mountTabs, mountDisclosure, mountAccordion,
    createComponentGallery, UI_COMPONENT_PREVIEWS, UI_COMPONENT_DEFINITIONS,
} from '../src';
import { component, slot, UIElement, actionFixture, toastFixture, disclosureFixture, tabsFixture } from './helpers/ui-elements';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
describe('authoring component composition and previews', () => {
    test('inline alert omits absent ARIA attributes and preserves explicit labels/descriptions', () => {
        const dom = new DOM().collectStylesFrom();
        const html = createInlineAlert(dom, { id: 'default-alert', message: 'Review your settings.' });
        for (const attribute of ['aria-label', 'aria-labelledby', 'aria-describedby']) expect(html).not.toContain(`${attribute}=`);
        const labelled = createInlineAlert(dom, { id: 'labelled-alert', message: 'Review your settings.', ariaLabel: 'Validation', ariaLabelledBy: 'title', ariaDescribedBy: 'description' });
        expect(labelled).toContain('aria-label="Validation"'); expect(labelled).toContain('aria-labelledby="title"'); expect(labelled).toContain('aria-describedby="description"');
        const empty = createInlineAlert(dom, { id: 'empty-label', message: 'Message', ariaLabel: '', ariaLabelledBy: '', ariaDescribedBy: '' });
        for (const attribute of ['aria-label', 'aria-labelledby', 'aria-describedby']) expect(empty).toContain(`${attribute}=""`);
    });
    test('returns escaped text with scoped/native relationships and trusted bodies', () => {
        const dom = new DOM().collectStylesFrom();
        expect(createInlineAlert(dom, { id: 'a', title: '<Title>', message: '<error>', variant: 'error', ariaLabel: 'Caller' })).toContain('aria-label="Caller"');
        expect(createInlineAlert(dom, { id: 'a', message: '<error>', visible: false })).toContain('&lt;error&gt;');
        expect(createToastRegion(dom, { id: 'r', label: 'Notifications', body: '<p>Trusted</p>' })).toContain('<p>Trusted</p>');
        expect(createAsyncActionButton(dom, { id: 'b', label: 'Save' })).toContain('type="button"');
        const tabs = createTabs(dom, { id: 't', label: 'Settings', items: [{ key: 'first', label: '<First>', body: '<p>Body</p>' }, { key: 'second', label: 'Second', body: '' }] });
        expect(tabs).toContain('aria-controls="t-panel-first"'); expect(tabs).toContain('&lt;First&gt;'); expect(tabs).toContain('<p>Body</p>');
        expect(createDisclosure(dom, { id: 'd', title: 'Details', body: '<p>Body</p>', open: true })).toContain('<details');
        expect(createAccordion(dom, { id: 'c', label: 'Connections', items: [{ key: 'x', title: 'X', body: '' }] })).not.toContain(' name=');
    });
    test('rejects inaccessible labels, duplicate/disabled selections and conflicting initial accordion state', () => {
        const dom = new DOM();
        expect(() => createToastRegion(dom, { id: 'r', label: '' })).toThrow();
        expect(() => createAsyncActionButton(dom, { id: 'b', label: '' })).toThrow();
        expect(() => createDisclosure(dom, { id: 'bad id', title: 'T', body: '' })).toThrow();
        expect(() => createTabs(dom, { id: 't', label: 'T', items: [] })).toThrow();
        expect(() => createTabs(dom, { id: 't', label: 'T', items: [{ key: 'a', label: 'A', body: '', disabled: true }] })).toThrow();
        expect(() => createTabs(dom, { id: 't', label: 'T', items: [{ key: 'a', label: 'A', body: '' }, { key: 'a', label: 'A', body: '' }] })).toThrow();
        expect(() => createTabs(dom, { id: 't', label: 'T', orientation: 'bad' as any, items: [{ key: 'a', label: 'A', body: '' }] })).toThrow();
        expect(() => createAccordion(dom, { id: 'c', label: 'C', items: [{ key: 'a', title: 'A', body: '', open: true }, { key: 'b', title: 'B', body: '', open: true }] })).toThrow();
    });
    test('gallery covers every declared state, is deterministic and never mounts or emits executable handlers', () => {
        for (const definition of UI_COMPONENT_DEFINITIONS) for (const state of definition.states) expect(UI_COMPONENT_PREVIEWS.some(preview => preview.identity === definition.identity && preview.state === state)).toBe(true);
        const dom = new DOM().collectStylesFrom(), other = new DOM().collectStylesFrom();
        const html = dom.renderHTML(createComponentGallery(dom, { id: 'gallery' }));
        expect(html === other.renderHTML(createComponentGallery(other, { id: 'gallery' }))).toBe(true);
        expect(html).not.toMatch(/\son\w+=|<script[^>]*>[^<]+/i); expect(html).toContain('inert'); expect(html).toContain('aria-live="off"');
        expect(new Set(UI_COMPONENT_PREVIEWS.map(preview => preview.properties.id)).size).toBe(UI_COMPONENT_PREVIEWS.length);
        expect(Object.isFrozen(UI_COMPONENT_PREVIEWS[0].properties)).toBe(true);
        expect(html).toContain('role="status" aria-live="off">Working…</div>');
    });
});
describe('inline alert lifecycle', () => {
    test('updates plain text/severity, preserves labels and persists after idempotent cleanup', () => {
        const root = component('fdo.inline-alert'); slot(root, 'title'); const message = slot(root, 'message'); root.setAttribute('aria-label', 'Caller');
        const controller = mountInlineAlert(root.element); controller.update({ message: '<text>', variant: 'error' });
        expect(message.textContent).toBe('<text>'); expect(root.getAttribute('role')).toBe('alert'); expect(root.getAttribute('aria-label')).toBe('Caller');
        controller.hide(); expect(root.hidden).toBe(true); controller.show(); controller.destroy(); controller.destroy(); controller.hide();
        expect(root.hidden).toBe(false); expect(controller.getState().destroyed).toBe(true);
        const next = mountInlineAlert(root.element); controller.destroy(); next.update({ variant: 'success' }); expect(root.getAttribute('role')).toBe('status'); next.destroy();
    });
    test('rejects partial markup and invalid severity without replacing a working owner', () => {
        const root = component('fdo.inline-alert'); expect(() => mountInlineAlert(root.element)).toThrow(); slot(root, 'title'); slot(root, 'message');
        const controller = mountInlineAlert(root.element); expect(() => controller.update({ variant: 'bad' as any })).toThrow(); controller.destroy();
    });
});
describe('async action lifecycle', () => {
    test('coalesces duplicate work, reports pending/success and never starts until requested', async () => {
        const f = actionFixture(); let finish!: () => void; const work = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
        const controller = mountAsyncActionButton(f.root.element, { onAction: work }); expect(work).not.toHaveBeenCalled();
        const first = controller.run(); expect(controller.run()).toBe(first); expect(f.run.disabled).toBe(true); expect(f.cancel.hidden).toBe(false);
        await flush(); expect(work).toHaveBeenCalledTimes(1); finish(); expect(await first).toBe(true);
        expect(controller.getState().phase).toBe('success'); expect(f.status.textContent).toBe('Done'); controller.reset(); expect(controller.getState().phase).toBe('idle'); controller.destroy();
    });
    test('cancellation resolves promptly and stale completion cannot affect a newer cycle', async () => {
        const f = actionFixture(); const finishes: Array<() => void> = [], signals: AbortSignal[] = [];
        const controller = mountAsyncActionButton(f.root.element, { onAction: ({ signal }) => { signals.push(signal); return new Promise(resolve => finishes.push(resolve)); } });
        const first = controller.run(); await flush(); controller.cancel(); expect(await first).toBe(false); expect(signals[0].aborted).toBe(true);
        const second = controller.run(); await flush(); finishes[0](); await flush(); expect(controller.getState().phase).toBe('pending');
        finishes[1](); expect(await second).toBe(true); controller.destroy();
    });
    test('errors are visible, retry clears feedback, and teardown aborts pending work', async () => {
        const f = actionFixture(); const work = vi.fn().mockRejectedValueOnce(Error('No network')).mockImplementation(() => new Promise(() => {}));
        const controller = mountAsyncActionButton(f.root.element, { onAction: work, formatError: error => `Failed: ${String(error)}` });
        expect(await controller.run()).toBe(false); expect(f.error.textContent).toContain('No network');
        const pending = controller.run(); expect(f.error.hidden).toBe(true); await flush(); controller.destroy(); controller.destroy();
        expect(await pending).toBe(false); expect(f.run.disabled).toBe(false); expect(controller.getState().destroyed).toBe(true); expect(await controller.run()).toBe(false);
    });
    test('disabled state, clicks, reset and remount preserve ownership', async () => {
        const f = actionFixture(); f.run.disabled = true;
        const first = mountAsyncActionButton(f.root.element, { onAction: async () => {} }); expect(await first.run()).toBe(false);
        first.setDisabled(false); f.run.click(); await flush(); expect(first.getState().phase).toBe('success');
        const next = mountAsyncActionButton(f.root.element, { onAction: vi.fn(() => new Promise<void>(() => {})) }); first.destroy();
        next.setDisabled(false); const pending = next.run(); await flush(); next.setDisabled(true); expect(await pending).toBe(false);
        next.setDisabled(false); const cancelled = next.run(); f.cancel.click(); expect(await cancelled).toBe(false); expect(next.getState().phase).toBe('cancelled'); next.reset(); next.destroy();
    });
    test('rolls back partial setup and contains callback/formatter failures', async () => {
        const f = actionFixture(); expect(() => mountAsyncActionButton(f.root.element, {} as any)).toThrow();
        vi.spyOn(f.cancel, 'addEventListener').mockImplementation(() => { throw Error('setup'); });
        expect(() => mountAsyncActionButton(f.root.element, { onAction: async () => {} })).toThrow('setup'); vi.restoreAllMocks();
        const diagnostic = vi.fn(); const controller = mountAsyncActionButton(f.root.element, { onAction: () => { throw Error('work'); }, formatError: () => { throw Error('formatter'); }, onStateChange: async () => { throw Error('observer'); }, onDiagnostic: diagnostic });
        expect(await controller.run()).toBe(false); expect(f.error.textContent).toContain('Action failed'); await flush(); expect(diagnostic).toHaveBeenCalledTimes(1); controller.destroy();
    });
    test('synchronous cancellation from a pending observer prevents work entry', async () => {
        const f = actionFixture(), work = vi.fn(); let controller: ReturnType<typeof mountAsyncActionButton>;
        controller = mountAsyncActionButton(f.root.element, { onAction: work, onStateChange: state => { if (state.phase === 'pending') controller.cancel(); } });
        expect(await controller.run()).toBe(false); expect(work).not.toHaveBeenCalled(); controller.destroy();
    });
});
describe('tabs and native disclosures', () => {
    test('automatic tabs skip disabled items, wrap, select panels and restore independent event ownership', () => {
        const f = tabsFixture(); const first = mountTabs(f.root.element);
        f.buttons[0].key('ArrowRight'); expect(first.getState().activeKey).toBe('three'); expect(f.root.ownerDocument.activeElement).toBe(f.buttons[2]);
        f.buttons[2].key('ArrowRight'); expect(first.getState().activeKey).toBe('one'); f.buttons[0].key('End'); expect(first.getState().activeKey).toBe('three');
        f.buttons[2].key('Home'); expect(first.getState().activeKey).toBe('one'); expect(() => first.select('two')).toThrow();
        const next = mountTabs(f.root.element); first.destroy(); f.buttons[2].click(); expect(next.getState().activeKey).toBe('three'); next.destroy(); next.select('one'); expect(next.getState().activeKey).toBe('three');
    });
    test('manual/vertical tabs move focus without activating until Enter/Space', () => {
        const f = tabsFixture(); f.list.setAttribute('aria-orientation', 'vertical'); const controller = mountTabs(f.root.element, { activation: 'manual' });
        const ignored = f.buttons[0].key('ArrowRight'); expect(ignored.defaultPrevented).toBe(false);
        f.buttons[0].key('ArrowDown'); expect(controller.getState().activeKey).toBe('one'); expect(f.buttons[2].tabIndex).toBe(0);
        f.buttons[2].key('Enter'); expect(controller.getState().activeKey).toBe('three'); f.buttons[2].key('ArrowUp'); f.buttons[0].key(' '); expect(controller.getState().activeKey).toBe('one'); controller.destroy();
    });
    test('tab mount validates linkage and rolls back partial listener installation', () => {
        const f = tabsFixture(); expect(() => mountTabs(f.root.element, { activation: 'bad' as any })).toThrow();
        vi.spyOn(f.buttons[2], 'addEventListener').mockImplementation(() => { throw Error('setup'); }); expect(() => mountTabs(f.root.element)).toThrow('setup'); vi.restoreAllMocks();
        const controller = mountTabs(f.root.element); controller.destroy(); f.buttons[0].setAttribute('aria-controls', 'outside'); expect(() => mountTabs(f.root.element)).toThrow();
    });
    test('disclosure synchronizes native toggles, coalesces notifications and preserves native state after teardown', () => {
        const root = disclosureFixture(), changed = vi.fn(); const first = mountDisclosure(root.element, { onStateChange: changed });
        first.setOpen(true); root.dispatchEvent(new Event('toggle')); expect(changed).toHaveBeenCalledTimes(1);
        root.open = false; root.dispatchEvent(new Event('toggle')); expect(first.getState().open).toBe(false);
        const next = mountDisclosure(root.element); first.destroy(); next.toggle(); next.destroy(); next.destroy(); expect(root.open).toBe(true);
        expect(() => mountDisclosure(component('fdo.disclosure').element)).toThrow();
    });
    test('accordions coordinate only owned children, support multiple-open mode and clean up remounts', () => {
        const root = component('fdo.accordion'); root.setAttribute('data-fdo-multiple', 'false');
        const a = root.append(new UIElement('DIV', { 'data-fdo-item': 'a' })).append(disclosureFixture('a'));
        const b = root.append(new UIElement('DIV', { 'data-fdo-item': 'b' })).append(disclosureFixture('b'));
        const first = mountAccordion(root.element); first.setOpen('a', true); first.setOpen('b', true); expect(a.open).toBe(false); expect(b.open).toBe(true);
        a.open = true; a.dispatchEvent(new Event('toggle')); expect(first.getState().openKeys).toEqual(['a']); expect(b.open).toBe(false);
        expect(() => first.setOpen('absent', true)).toThrow(); const next = mountAccordion(root.element); first.destroy(); next.setOpen('b', true); next.destroy(); expect(b.open).toBe(true);
        root.setAttribute('data-fdo-multiple', 'true'); const multi = mountAccordion(root.element); multi.setOpen('a', true); expect(multi.getState().openKeys).toEqual(['a', 'b']); multi.destroy();
    });
    test('accordion validation and partial setup failure preserve a clean retry', () => {
        const root = component('fdo.accordion'); expect(() => mountAccordion(root.element)).toThrow();
        const a = root.append(new UIElement('DIV', { 'data-fdo-item': 'a' })).append(disclosureFixture('a'));
        const b = root.append(new UIElement('DIV', { 'data-fdo-item': 'b' })).append(disclosureFixture('b'));
        vi.spyOn(b, 'addEventListener').mockImplementation(() => { throw Error('setup'); }); expect(() => mountAccordion(root.element)).toThrow('setup'); vi.restoreAllMocks();
        const controller = mountAccordion(root.element); a.open = true; a.dispatchEvent(new Event('toggle')); expect(controller.getState().openKeys).toEqual(['a']); controller.destroy();
    });
});
describe('toast region queue', () => {
    beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
    test('bounds visible/queued entries, rejects duplicates, promotes on dismissal and preserves another region', () => {
        const root = component('fdo.toast-region'), other = component('fdo.toast-region');
        const a = root.append(toastFixture('a')), b = root.append(toastFixture('b')), c = root.append(toastFixture('c')), external = other.append(toastFixture('external'));
        const region = mountToastRegion(root.element, { maxVisible: 1, maxQueued: 1 }), independent = mountToastRegion(other.element);
        expect(region.enqueue(a.element)).toBe(true); expect(region.enqueue(a.element)).toBe(false); expect(region.enqueue(b.element)).toBe(true); expect(region.enqueue(c.element)).toBe(false);
        expect(independent.enqueue(external.element)).toBe(true); expect(b.hidden).toBe(true);
        region.dismiss('a'); expect(b.hidden).toBe(false); expect(region.getState().entries).toEqual([{ key: 'b', status: 'visible' }]); expect(independent.getState().entries).toHaveLength(1);
        region.update('b', { message: 'Updated', variant: 'error' }); expect(b.getAttribute('role')).toBe('alert'); expect(() => region.setProgress('b', 10)).toThrow();
        region.clear(); expect(region.getState().entries).toHaveLength(0); region.destroy(); independent.destroy();
    });
    test('queued toasts start their timeout only after becoming visible', () => {
        const root = component('fdo.toast-region'), a = root.append(toastFixture('a')), b = root.append(toastFixture('b'));
        const close = vi.fn(), region = mountToastRegion(root.element, { maxVisible: 1 }); region.enqueue(a.element); region.enqueue(b.element, { duration: 100, onClose: close });
        vi.advanceTimersByTime(1000); expect(region.getState().entries).toHaveLength(2); region.dismiss('a'); vi.advanceTimersByTime(99); expect(close).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1); expect(close).toHaveBeenCalledExactlyOnceWith('timeout'); expect(region.getState().entries).toHaveLength(0); region.destroy();
    });
    test('remount and teardown remove owned listeners/timers without touching new owners', () => {
        const root = component('fdo.toast-region'), a = root.append(toastFixture('a')); const first = mountToastRegion(root.element); first.enqueue(a.element, { duration: 100 });
        const next = mountToastRegion(root.element); first.destroy(); expect(next.enqueue(a.element)).toBe(true); vi.advanceTimersByTime(500); expect(next.getState().entries).toHaveLength(1);
        next.destroy(); next.destroy(); expect(vi.getTimerCount()).toBe(0); expect(next.enqueue(a.element)).toBe(false);
    });
    test('rejects cross-region roots, bad capacity and external mounts; duplicate keys are explicit no-ops', () => {
        const root = component('fdo.toast-region'), external = toastFixture('external'); expect(() => mountToastRegion(root.element, { maxVisible: 0 })).toThrow();
        const region = mountToastRegion(root.element); expect(() => region.enqueue(external.element)).toThrow();
        const a = root.append(toastFixture('a')), b = root.append(toastFixture('b')); region.enqueue(a.element, { key: 'task' }); expect(region.enqueue(b.element, { key: 'task' })).toBe(false);
        const owned = component('fdo.toast-region'); root.append(owned); const nested = owned.append(toastFixture('nested')); expect(() => region.enqueue(nested.element)).toThrow(); region.destroy();
    });
    test('synchronous close during promotion cannot strand queued work', () => {
        const root = component('fdo.toast-region'), a = root.append(toastFixture('a')), b = root.append(toastFixture('b'));
        const region = mountToastRegion(root.element, { maxVisible: 1 }); region.enqueue(a.element);
        region.enqueue(b.element, { onStateChange: state => { if (state.open) region.dismiss('b'); } }); region.dismiss('a'); expect(region.getState().entries).toHaveLength(0); region.destroy();
    });
});
