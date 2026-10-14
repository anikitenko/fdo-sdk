import { DOM } from '../src';
import { createDialog, createConfirmationDialog, createPopover, mountDialog, mountConfirmationDialog, mountPopover } from '../src';

class FakeElement extends EventTarget {
    attributes = new Map<string, string>();
    children: FakeElement[] = [];
    ownerDocument: any;
    parent?: FakeElement;
    isConnected = true;
    hidden = false;
    disabled = false;
    open = false;
    popped = false;
    textContent = '';
    style: any = {};
    tagName: string;
    rect = { left: 10, right: 110, top: 10, bottom: 50, width: 100, height: 40 };
    constructor(tag = 'DIV') { super(); this.tagName = tag; }
    get id() { return this.getAttribute('id') || ''; }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    removeAttribute(name: string) { this.attributes.delete(name); }
    contains(element: any): boolean { return element === this || this.children.some(child => child.contains(element)); }
    closest(selector: string): FakeElement | null {
        if (selector === '[data-fdo-component]') return this.getAttribute('data-fdo-component') ? this : this.parent?.closest(selector) ?? null;
        if (selector.includes('popover')) return this.popped ? this : this.parent?.closest(selector) ?? null;
        return this.getAttribute('data-fdo-action') ? this : this.parent?.closest(selector) ?? null;
    }
    querySelectorAll(selector: string): FakeElement[] {
        const all = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
        if (selector === '*') return all;
        if (selector.includes('status')) return all.filter(child => child.getAttribute('data-fdo-slot') === 'status');
        if (selector.includes('error')) return all.filter(child => child.getAttribute('data-fdo-slot') === 'error');
        if (selector.includes('confirm')) return all.filter(child => child.getAttribute('data-fdo-action') === 'confirm');
        return all.filter(child => child.getAttribute('data-fdo-action') === 'cancel');
    }
    focus() { this.ownerDocument.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.ownerDocument.activeElement = this.ownerDocument.body; this.dispatchEvent(new Event('close')); }
    showPopover() { this.popped = true; }
    hidePopover() { this.popped = false; }
    matches() { return this.popped; }
    getBoundingClientRect() { return this.rect; }
    append(child: FakeElement) { child.parent = this; child.ownerDocument = this.ownerDocument; this.children.push(child); return child; }
}
function fixture(identity = 'fdo.dialog') {
    const window = Object.assign(new EventTarget(), { AbortController, innerWidth: 800, innerHeight: 600, ResizeObserver: undefined });
    const document = Object.assign(new EventTarget(), { defaultView: window, activeElement: null as any, body: null as any, querySelector: () => null });
    const body = new FakeElement('BODY'); body.ownerDocument = document; document.body = body; document.activeElement = body;
    const root = new FakeElement(identity === 'fdo.popover' ? 'DIV' : 'DIALOG'); root.ownerDocument = document;
    root.setAttribute('id', 'test'); root.setAttribute('data-fdo-component', identity); root.setAttribute('data-fdo-component-version', '1.0.0');
    if (identity === 'fdo.popover') root.setAttribute('popover', 'auto');
    const cancel = root.append(new FakeElement('BUTTON')); cancel.setAttribute('data-fdo-action', 'cancel');
    const confirm = root.append(new FakeElement('BUTTON')); confirm.setAttribute('data-fdo-action', 'confirm');
    const status = root.append(new FakeElement()); status.setAttribute('data-fdo-slot', 'status');
    const error = root.append(new FakeElement()); error.setAttribute('data-fdo-slot', 'error');
    const opener = new FakeElement('BUTTON'); opener.ownerDocument = document;
    return { root: root as any as HTMLDialogElement, fake: root, cancel, confirm, status, error, opener: opener as any as HTMLElement, document, window };
}

describe('component composition', () => {
    test('returns serializable closed HTML; preserves explicit accessible relationships and trusted slots', () => {
        const dom = new DOM().collectStylesFrom();
        const html = createConfirmationDialog(dom, { id: 'delete', title: '<Delete>', description: 'Fallback', ariaLabelledBy: 'caller-label', ariaDescribedBy: 'caller-detail', body: '<strong>Body</strong>', options: { classes: ['custom'], style: { '--fdo-ui-background': 'pink' } } });
        expect(typeof html).toBe('string');
        expect(html).toContain('aria-labelledby="caller-label"');
        expect(html).toContain('aria-describedby="caller-detail"');
        expect(html).toContain('&lt;Delete&gt;');
        expect(html).toContain('<strong>Body</strong>');
        expect(html).toContain('data-fdo-component="fdo.confirmation-dialog"');
        expect(html).not.toMatch(/\bopen[=\s>]/);
        expect(dom.renderHTML(html)).toContain('--fdo-ui-background:pink');
    });
    test('requires an id and accessible name; paired tags preserve self-closing collector behavior', () => {
        expect(() => createDialog(new DOM(), { id: '', title: 'Title' })).toThrow(expect.objectContaining({ code: 'UI_ID_REQUIRED' }));
        expect(() => createDialog(new DOM(), { id: 'invalid id', title: 'Title' })).toThrow(expect.objectContaining({ code: 'UI_ID_REQUIRED' }));
        expect(() => createPopover(new DOM(), { id: 'p' })).toThrow(expect.objectContaining({ code: 'UI_LABEL_REQUIRED' }));
        expect(createDialog(new DOM(true), { id: 'd', ariaLabel: 'Caller label' })).toContain('</dialog>');
    });
});

describe('component controller lifecycle', () => {
    test('opens/closes once, snapshots are immutable, Escape and destroy restore focus', () => {
        const f = fixture(); const onClose = vi.fn(); const onDiagnostic = vi.fn();
        const controller = mountDialog(f.root, { onClose, onDiagnostic });
        controller.open(f.opener); controller.open();
        expect(f.document.activeElement).toBe(f.cancel);
        expect(Object.isFrozen(controller.getState())).toBe(true);
        f.root.dispatchEvent(new Event('cancel', { cancelable: true }));
        expect(controller.getState().closeReason).toBe('escape');
        expect(f.document.activeElement).toBe(f.opener);
        controller.close(); expect(onClose).toHaveBeenCalledTimes(1);
        controller.open(f.opener); controller.destroy(); controller.destroy();
        expect(controller.getState()).toMatchObject({ destroyed: true, open: false, closeReason: 'destroy' });
        expect(() => controller.open()).toThrow(expect.objectContaining({ code: 'UI_DESTROYED' }));
        expect(onDiagnostic).not.toHaveBeenCalled();
    });
    test('remount only replaces its root; teardown removes listeners and isolates caller callbacks', async () => {
        const a = fixture(), b = fixture();
        const old = mountDialog(a.root); old.open();
        const reports = vi.fn();
        const current = mountDialog(a.root, { onClose: async () => { throw Error('callback'); }, onDiagnostic: reports });
        const other = mountDialog(b.root); other.open(); current.open(); current.close('cancel');
        await Promise.resolve();
        expect(old.getState().destroyed).toBe(true);
        expect(other.getState().open).toBe(true);
        expect(reports).toHaveBeenCalledWith(expect.objectContaining({ code: 'UI_CALLBACK_FAILED' }));
        a.window.dispatchEvent(new Event('pagehide'));
        expect(current.getState().destroyed).toBe(true);
        other.destroy();
    });
    test('async confirm coalesces actions, shows errors safely, retries and closes with confirm', async () => {
        const f = fixture('fdo.confirmation-dialog');
        const handler = vi.fn().mockRejectedValueOnce(Error('<failed>')).mockResolvedValueOnce(undefined);
        const controller = mountConfirmationDialog(f.root, { onConfirm: handler }); controller.open(f.opener);
        const one = controller.confirm(); const two = controller.confirm();
        expect(one).toBe(two); expect(f.confirm.disabled).toBe(true); expect(f.status.hidden).toBe(false);
        expect(await one).toBe(false);
        expect(f.error.textContent).toBe('<failed>'); expect(f.error.hidden).toBe(false); expect(f.confirm.disabled).toBe(false);
        expect(await controller.confirm()).toBe(true);
        expect(controller.getState()).toMatchObject({ open: false, pending: false, closeReason: 'confirm' });
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler.mock.calls[1][0].signal.aborted).toBe(false);
        controller.destroy();
        const fallback = mountConfirmationDialog(f.root, { onConfirm: () => { throw new Error(''); } });
        fallback.open();
        expect(await fallback.confirm()).toBe(false);
        expect(fallback.getState().error).toBe('Unable to confirm. Please try again.');
        expect(f.error.hidden).toBe(false);
        fallback.destroy();
    });
    test('cancel resolves promptly even for uncooperative work; stale completion cannot close reopened view', async () => {
        const f = fixture('fdo.confirmation-dialog'); let finish!: () => void; let signal!: AbortSignal;
        const controller = mountConfirmationDialog(f.root, { onConfirm: context => { signal = context.signal; return new Promise<void>(resolve => { finish = resolve; }); } });
        controller.open(); const pending = controller.confirm(); await Promise.resolve();
        controller.close('cancel'); expect(await pending).toBe(false); expect(signal.aborted).toBe(true);
        controller.open(); finish(); await Promise.resolve(); await Promise.resolve();
        expect(controller.getState()).toMatchObject({ open: true, pending: false });
        controller.destroy();
    });
    test('validates feature support, root ownership, focus and required confirmation slots', () => {
        const f = fixture(); f.fake.isConnected = false;
        expect(() => mountDialog(f.root)).toThrow(expect.objectContaining({ code: 'UI_ROOT_DISCONNECTED' }));
        f.fake.isConnected = true;
        f.fake.open = true;
        expect(() => mountDialog(f.root)).toThrow(expect.objectContaining({ code: 'UI_ROOT_OPEN' }));
        f.fake.open = false;
        expect(() => mountDialog(f.root, { initialFocus: f.opener })).toThrow(expect.objectContaining({ code: 'UI_FOCUS_INVALID' }));
        (f.fake as any).showModal = undefined;
        expect(() => mountDialog(f.root)).toThrow(expect.objectContaining({ code: 'UI_NATIVE_DIALOG_REQUIRED' }));
        expect(() => mountConfirmationDialog(f.root, { onConfirm: () => {} })).toThrow(expect.objectContaining({ code: 'UI_ROOT_INVALID' }));
        const c = fixture('fdo.confirmation-dialog'); c.fake.children = [];
        expect(() => mountConfirmationDialog(c.root, { onConfirm: () => {} })).toThrow(expect.objectContaining({ code: 'UI_SLOTS_MISSING' }));
    });
    test('popover flips/shifts in the viewport, restores anchor attributes and refuses shared anchors', () => {
        const f = fixture('fdo.popover'); f.opener.setAttribute('aria-controls', 'existing'); f.opener.setAttribute('aria-expanded', 'false');
        (f.opener as any).rect = { left: 790, right: 810, top: 580, bottom: 600, width: 20, height: 20 };
        const controller = mountPopover(f.root, { anchor: f.opener }); controller.open();
        expect(f.fake.style.left).toBe('692px'); expect(f.fake.style.top).toBe('532px');
        expect(f.root.getAttribute('data-fdo-placement')).toBe('top-start');
        expect(f.opener.getAttribute('aria-controls')).toBe('existing test');
        const other = fixture('fdo.popover'); other.fake.ownerDocument = f.document;
        expect(() => mountPopover(other.root, { anchor: f.opener })).toThrow(expect.objectContaining({ code: 'UI_ANCHOR_OWNED' }));
        controller.destroy();
        expect(f.opener.getAttribute('aria-controls')).toBe('existing'); expect(f.opener.getAttribute('aria-expanded')).toBe('false');
    });
    test('partial setup failure rolls back listeners/attributes; diagnostics cannot reject cleanup', async () => {
        const f = fixture('fdo.popover');
        (f.window as any).ResizeObserver = class { observe() { throw Error('observer setup'); } disconnect() {} };
        expect(() => mountPopover(f.root, { anchor: f.opener })).toThrow('observer setup');
        expect(f.opener.getAttribute('aria-controls')).toBe(null);
        delete (f.window as any).ResizeObserver;
        const controller = mountPopover(f.root, { anchor: f.opener, onStateChange: () => { throw Error('state'); }, onDiagnostic: async () => { throw Error('reporter'); } });
        controller.destroy(); await Promise.resolve(); await Promise.resolve();
        expect(controller.getState().destroyed).toBe(true);
    });
});
