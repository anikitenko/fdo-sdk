/** Minimal DOM model for lifecycle tests; native focus/keyboard/accessibility are checked in Chrome. */
export class UIElement extends EventTarget {
    attributes = new Map<string, string>();
    children: UIElement[] = [];
    parentElement: UIElement | null = null;
    ownerDocument: any;
    isConnected = true;
    hidden = false;
    disabled = false;
    open = false;
    tabIndex = -1;
    textContent = '';
    constructor(public tagName = 'DIV', attrs: Record<string, string> = {}) { super(); for (const [key, value] of Object.entries(attrs)) this.setAttribute(key, value); }
    get id() { return this.getAttribute('id') ?? ''; }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); if (name === 'disabled') this.disabled = true; if (name === 'hidden') this.hidden = true; if (name === 'open') this.open = true; }
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    hasAttribute(name: string) { return this.attributes.has(name); }
    removeAttribute(name: string) { this.attributes.delete(name); }
    append(child: UIElement): UIElement { child.parentElement = this; const attach = (node: UIElement) => { node.ownerDocument = this.ownerDocument; for (const inner of node.children) attach(inner); }; attach(child); this.children.push(child); return child; }
    matches(selector: string): boolean {
        if (selector === ':hover') return false;
        const match = selector.match(/^\[([^=\]]+)(?:="([^"]+)")?]$/);
        return match ? (match[2] ? this.getAttribute(match[1]) === match[2] : this.hasAttribute(match[1])) : selector === '*' || this.tagName.toLowerCase() === selector;
    }
    closest(selector: string): UIElement | null { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
    querySelectorAll(selector: string): UIElement[] { return this.children.flatMap(child => [child, ...child.querySelectorAll('*')]).filter(child => child.matches(selector)); }
    querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
    contains(element: UIElement | null): boolean { return element === this || this.children.some(child => child.contains(element)); }
    focus() { this.ownerDocument.activeElement = this; }
    blur() { this.ownerDocument.activeElement = this.ownerDocument.body; }
    click() { this.dispatchEvent(new Event('click')); }
    key(key: string) { const event = new Event('keydown', { cancelable: true }); Object.assign(event, { key }); this.dispatchEvent(event); return event; }
    get element() { return this as unknown as HTMLElement; }
}
export function component(identity: string, tag = 'DIV'): UIElement {
    const window = Object.assign(new EventTarget(), { setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args), clearTimeout: (id: number) => clearTimeout(id), getComputedStyle: () => ({ direction: 'ltr' }) });
    const document = Object.assign(new EventTarget(), { defaultView: window, hidden: false, activeElement: null as any, body: new UIElement('BODY') });
    document.body.ownerDocument = document; document.activeElement = document.body;
    const root = new UIElement(tag, { id: identity.slice(4), 'data-fdo-component': identity, 'data-fdo-component-version': '1.2.0' }); root.ownerDocument = document;
    return root;
}
export function slot(root: UIElement, name: string, tag = 'DIV') { return root.append(new UIElement(tag, { 'data-fdo-slot': name })); }
export function actionFixture() {
    const root = component('fdo.async-action-button');
    const run = root.append(new UIElement('BUTTON', { 'data-fdo-action': 'run', 'data-fdo-idle-label': 'Run', 'data-fdo-pending-label': 'Running', 'data-fdo-success-label': 'Done' }));
    const cancel = root.append(new UIElement('BUTTON', { 'data-fdo-action': 'cancel' }));
    const status = slot(root, 'status'), error = slot(root, 'error');
    return { root, run, cancel, status, error };
}
export function toastFixture(id: string) {
    const root = component('fdo.toast'); root.setAttribute('id', id); slot(root, 'title'); slot(root, 'message');
    root.append(new UIElement('BUTTON', { 'data-fdo-action': 'dismiss' })); return root;
}
export function disclosureFixture(id = 'details') { const root = component('fdo.disclosure', 'DETAILS'); root.setAttribute('id', id); slot(root, 'title', 'SUMMARY'); slot(root, 'body'); return root; }
export function tabsFixture() {
    const root = component('fdo.tabs'); const list = root.append(new UIElement('DIV', { role: 'tablist', 'aria-orientation': 'horizontal' }));
    const buttons = ['one', 'two', 'three'].map((key, index) => {
        const button = list.append(new UIElement('BUTTON', { id: `tab-${key}`, 'data-fdo-tab': key, 'aria-controls': `panel-${key}`, 'aria-selected': String(index === 0) }));
        if (index === 1) button.disabled = true;
        const panel = root.append(new UIElement('DIV', { id: `panel-${key}`, 'data-fdo-panel': key, 'aria-labelledby': `tab-${key}` })); panel.hidden = index !== 0;
        return button;
    });
    return { root, list, buttons };
}
