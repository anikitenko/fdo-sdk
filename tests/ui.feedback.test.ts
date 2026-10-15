import { DOM, createProgressBar, createToast, mountProgressBar, mountToast } from '../src';

class FeedbackElement extends EventTarget {
    attributes = new Map<string, string>();
    children: FeedbackElement[] = [];
    parent?: FeedbackElement;
    ownerDocument: any;
    isConnected = true;
    hidden = false;
    textContent = '';
    constructor(public tagName = 'DIV') { super(); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    hasAttribute(name: string) { return this.attributes.has(name); }
    removeAttribute(name: string) { this.attributes.delete(name); }
    append(child: FeedbackElement) { child.parent = this; child.ownerDocument = this.ownerDocument; this.children.push(child); return child; }
    closest(): FeedbackElement | null { return this.hasAttribute('data-fdo-component') ? this : this.parent?.closest() ?? null; }
    querySelectorAll(selector: string): FeedbackElement[] {
        const match = selector.match(/^\[([^=]+)="([^"]+)"]$/);
        const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
        return match ? all.filter(child => child.getAttribute(match[1]) === match[2]) : all;
    }
    querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
    matches() { return false; }
    contains(element: FeedbackElement | null): boolean { return element === this || this.children.some(child => child.contains(element)); }
    blur() { this.ownerDocument.activeElement = null; }
}
function fixture(withProgress = true) {
    const document = Object.assign(new EventTarget(), { defaultView: { setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args), clearTimeout: (id: number) => clearTimeout(id) }, hidden: false, activeElement: null as any });
    const root = new FeedbackElement(); root.ownerDocument = document;
    root.setAttribute('data-fdo-component', 'fdo.toast'); root.setAttribute('data-fdo-component-version', '1.1.0');
    const slot = (name: string) => { const element = root.append(new FeedbackElement()); element.setAttribute('data-fdo-slot', name); return element; };
    const title = slot('title'), message = slot('message');
    const dismiss = root.append(new FeedbackElement('BUTTON')); dismiss.setAttribute('data-fdo-action', 'dismiss');
    let progress: FeedbackElement | undefined;
    if (withProgress) {
        progress = slot('progress').append(new FeedbackElement('PROGRESS'));
        progress.setAttribute('data-fdo-component', 'fdo.progress-bar'); progress.setAttribute('data-fdo-component-version', '1.1.0'); progress.setAttribute('max', '100');
    }
    return { root: root as unknown as HTMLElement, fake: root, document, title, message, dismiss, progress: progress as unknown as HTMLElement };
}

describe('feedback composition', () => {
    test('omits absent ARIA options without replacing caller-provided values', () => {
        const dom = new DOM().collectStylesFrom();
        const toast = createToast(dom, { id: 'default-toast', message: 'Saved' });
        for (const attribute of ['aria-label', 'aria-labelledby', 'aria-describedby']) expect(toast).not.toContain(`${attribute}=`);
        const progress = createProgressBar(dom, { id: 'default-progress', label: 'Download' });
        expect(progress).toContain('aria-label="Download"');
        expect(progress).not.toContain('aria-labelledby='); expect(progress).not.toContain('aria-describedby=');
        const linked = createProgressBar(dom, { id: 'linked-progress', ariaLabelledBy: 'external-label' });
        expect(linked).not.toContain('aria-label='); expect(linked).not.toContain('aria-describedby=');
        expect(linked).toContain('aria-labelledby="external-label"');
        const labelled = createToast(dom, { id: 'labelled-toast', message: 'Saved', ariaLabel: 'Notice', ariaLabelledBy: 'title', ariaDescribedBy: 'description' });
        expect(labelled).toContain('aria-label="Notice"'); expect(labelled).toContain('aria-labelledby="title"'); expect(labelled).toContain('aria-describedby="description"');
        const empty = createToast(dom, { id: 'empty-label', message: 'Saved', ariaLabel: '', ariaLabelledBy: '', ariaDescribedBy: '' });
        for (const attribute of ['aria-label', 'aria-labelledby', 'aria-describedby']) expect(empty).toContain(`${attribute}=""`);
    });
    test('native labelled progress keeps HTML strings, style ownership and indeterminate state', () => {
        const dom = new DOM().collectStylesFrom();
        const html = createProgressBar(dom, { id: 'job', label: 'A < B', options: { style: { '--fdo-ui-progress-color': 'red' } } });
        expect(html).toContain('<progress'); expect(html).toContain('A &lt; B'); expect(html).not.toMatch(/\svalue=/);
        expect(dom.renderHTML(html)).toContain('--fdo-ui-progress-color:red');
        expect(createProgressBar(dom, { id: 'job', label: 'Job', value: 0, max: 5 })).toContain('value="0"');
        const linked = createProgressBar(dom, { id: 'linked', ariaLabelledBy: 'caller-label', ariaDescribedBy: 'caller-description' });
        expect(linked).toContain('aria-labelledby="caller-label"'); expect(linked).toContain('aria-describedby="caller-description"');
    });
    test('toast escapes text, composes progress and differentiates alert severity', () => {
        // language=TEXT
        const untrustedText = '<script>bad</script>';
        const html = createToast(new DOM().collectStylesFrom(), { id: 'notice', message: untrustedText, variant: 'error', progress: { label: 'Download', value: 25 } });
        expect(html).toContain('role="alert"'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('type="button"');
        expect(html).toContain('id="notice-progress"'); expect(html).toContain('hidden'); expect(html).not.toContain('<script>');
        expect(createToast(new DOM(), { id: 'ok', message: 'Saved', variant: 'success' })).toContain('role="status"');
    });
    test('rejects invalid progress, identity, label and variant', () => {
        for (const value of [-1, 101, NaN, Infinity]) expect(() => createProgressBar(new DOM(), { id: 'p', label: 'P', value })).toThrow();
        expect(() => createProgressBar(new DOM(), { id: 'p', label: '', max: 0 })).toThrow();
        expect(() => createProgressBar(new DOM(), { id: 'p', label: '' })).toThrow();
        expect(() => createToast(new DOM(), { id: 'bad id', message: 'M' })).toThrow();
        expect(() => createToast(new DOM(), { id: 't', message: 'M', variant: 'invalid' as any })).toThrow();
    });
});
describe('feedback lifecycle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    test('progress validates atomically, remounts and ignores a destroyed controller', () => {
        const f = fixture(); const old = mountProgressBar(f.progress);
        old.setValue(4, 10); expect(old.getState()).toMatchObject({ value: 4, max: 10 });
        expect(() => old.setValue(11)).toThrow(); expect(old.getState().value).toBe(4);
        const next = mountProgressBar(f.progress); old.destroy(); old.setValue(0);
        expect(next.getState()).toMatchObject({ value: 4, destroyed: false });
        next.setValue(null); expect(f.progress.hasAttribute('value')).toBe(false);
        next.destroy(); next.destroy(); expect(next.getState().destroyed).toBe(true);
    });
    test('progress in a toast has explicit updates and never closes on completion', () => {
        const f = fixture(); const close = vi.fn(); const toast = mountToast(f.root, { onClose: close });
        toast.show(); toast.show(); toast.setProgress(100); toast.update({ title: 'Done', message: '<b>Saved</b>', variant: 'success' });
        expect(toast.getState()).toMatchObject({ open: true, variant: 'success', progress: { value: 100 } });
        expect(f.message.textContent).toBe('<b>Saved</b>'); expect(f.root.getAttribute('role')).toBe('status');
        vi.runAllTimers(); expect(toast.getState().open).toBe(true);
        f.dismiss.dispatchEvent(new Event('click')); expect(close).toHaveBeenCalledExactlyOnceWith('dismiss');
        toast.close(); toast.destroy(); toast.destroy(); expect(close).toHaveBeenCalledTimes(1);
    });
    test('timeouts preserve remaining time across independent pause reasons', () => {
        const f = fixture(); const toast = mountToast(f.root, { duration: 1000 }); toast.show();
        vi.advanceTimersByTime(400); f.fake.dispatchEvent(new Event('pointerenter')); toast.pause();
        vi.advanceTimersByTime(2000); f.fake.dispatchEvent(new Event('pointerleave'));
        expect(toast.getState().paused).toBe(true); toast.resume();
        vi.advanceTimersByTime(599); expect(toast.getState().open).toBe(true);
        vi.advanceTimersByTime(1); expect(toast.getState().closeReason).toBe('timeout');
        toast.show(); vi.advanceTimersByTime(1000); expect(toast.getState().open).toBe(false); toast.destroy();
    });
    test('focus and document visibility pause automatic dismissal', () => {
        const f = fixture(); const toast = mountToast(f.root, { duration: 20 }); toast.show();
        f.document.activeElement = f.dismiss; f.fake.dispatchEvent(new Event('focusin'));
        f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(100);
        f.document.activeElement = null; f.fake.dispatchEvent(new Event('focusout')); vi.advanceTimersByTime(100);
        expect(toast.getState().open).toBe(true);
        f.document.hidden = false; f.document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(20);
        expect(toast.getState().closeReason).toBe('timeout'); toast.destroy();
    });
    test('remount and repeated cleanup leave another instance and its listeners intact', () => {
        const f = fixture(), other = fixture(); const close = vi.fn();
        const old = mountToast(f.root, { duration: 50, onClose: close }); old.show();
        const next = mountToast(f.root); const independent = mountToast(other.root); next.show(); independent.show();
        old.destroy(); vi.advanceTimersByTime(100); expect(next.getState().open).toBe(true);
        f.dismiss.dispatchEvent(new Event('click')); expect(next.getState().closeReason).toBe('dismiss'); expect(independent.getState().open).toBe(true);
        expect(close).toHaveBeenCalledExactlyOnceWith('destroy'); next.destroy(); independent.destroy(); expect(vi.getTimerCount()).toBe(0);
    });
    test('failed validation preserves a working mount and missing progress is actionable', () => {
        const f = fixture(false); const toast = mountToast(f.root); toast.show();
        expect(() => mountToast(f.root, { duration: -1 })).toThrow(); expect(toast.getState().open).toBe(true);
        expect(() => toast.setProgress(2)).toThrow('Compose this toast with progress');
        expect(() => toast.update({ variant: 'bad' as any })).toThrow(); toast.destroy();
    });
    test('partial setup failure removes attached listeners and child ownership', () => {
        const f = fixture(); const add = f.fake.addEventListener.bind(f.fake);
        vi.spyOn(f.fake, 'addEventListener').mockImplementation((type, listener, options) => { if (type === 'pointerleave') throw Error('setup failed'); add(type, listener, options); });
        expect(() => mountToast(f.root)).toThrow('setup failed'); expect(vi.getTimerCount()).toBe(0);
        vi.restoreAllMocks(); const toast = mountToast(f.root); toast.show(); toast.destroy();
    });
    test('async callback failures use deduplicated structured diagnostics', async () => {
        const f = fixture(); const diagnostic = vi.fn();
        const toast = mountToast(f.root, { onStateChange: async () => { throw Error('state failed'); }, onClose: async () => { throw Error('close failed'); }, onDiagnostic: diagnostic });
        toast.show(); toast.update({ message: 'Updated' }); toast.close();
        await Promise.resolve(); await Promise.resolve();
        expect(diagnostic).toHaveBeenCalledTimes(2); expect(diagnostic.mock.calls[0][0].code).toBe('UI_CALLBACK_FAILED'); toast.destroy();
    });
});
