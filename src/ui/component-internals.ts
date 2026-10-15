import { DOM } from '../DOM';
import type { DOMStyleMap } from '../DOM';
import type { UIStyleOptions } from './types';
import { UI_COMPONENT_CONTRACT_VERSION } from './metadata';

export const COMPONENT_MOUNT = Symbol.for('fdo.ui.mount');
export type ComponentRoot = HTMLElement & { [COMPONENT_MOUNT]?: { destroy(): void } };
export function uiFailure(code: string, message: string): never { throw Object.assign(new Error(message), { code }); }
export function validId(id: string): void {
    if (!id || /[\t\n\f\r ]/.test(id)) uiFailure('UI_ID_REQUIRED', 'Provide a document-unique HTML id without ASCII whitespace.');
}
export function requireLabel(label: string): void {
    if (!label?.trim()) uiFailure('UI_LABEL_REQUIRED', 'Provide a non-empty accessible text label.');
}
export function componentAttributes(dom: DOM, id: string, identity: string, state: string, options?: UIStyleOptions, style: DOMStyleMap = {}): Record<string, unknown> {
    validId(id);
    return { id, 'data-fdo-component': identity, 'data-fdo-component-version': UI_COMPONENT_CONTRACT_VERSION, 'data-fdo-state': state,
        class: [`fdo-ui-${identity.slice(4)}`, dom.createClassFromStyle({ ...style, ...options?.style }), ...(options?.classes ?? [])].join(' ') };
}
export function uiElement(tag: string, attributes: Record<string, unknown>, content = ''): string { return new DOM().createElement(tag, attributes, content); }
class TextSerializer extends DOM { text(value: string): string { return this.escapeJSXText(value); } }
export function uiText(text: string): string { return new TextSerializer().text(text); }
export function validateComponent(root: HTMLElement, identity: string): void {
    if (root.getAttribute('data-fdo-component') !== identity) uiFailure('UI_ROOT_INVALID', `Mount the composed ${identity} root.`);
    if (root.getAttribute('data-fdo-component-version')?.split('.')[0] !== '1') uiFailure('UI_VERSION_UNSUPPORTED', 'Mount requires component contract major 1.');
    if (!root.isConnected || !root.ownerDocument.defaultView) uiFailure('UI_ROOT_DISCONNECTED', 'Attach the component to a live browser document before mounting.');
}
export function ownedElements(root: HTMLElement, selector: string): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(element => element.closest('[data-fdo-component]') === root);
}
export function componentListeners() {
    const cleanup: Array<() => void> = [];
    return {
        listen(target: EventTarget, type: string, listener: EventListener) { target.addEventListener(type, listener); cleanup.push(() => target.removeEventListener(type, listener)); },
        remove() { for (const remove of cleanup.splice(0)) remove(); },
    };
}
export function validateKeys(items: ReadonlyArray<{ key: string }>): void {
    const keys = new Set<string>();
    if (!items.length) uiFailure('UI_ITEMS_REQUIRED', 'Provide at least one component item.');
    for (const item of items) {
        validId(item.key);
        if (keys.has(item.key)) uiFailure('UI_KEY_DUPLICATE', `Use unique component item keys: ${item.key}.`);
        keys.add(item.key);
    }
}
