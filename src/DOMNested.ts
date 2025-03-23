import {DOM} from "./DOM";

export class DOMNested extends DOM {
    /**
     * Creates a new DOMNested instance.
     * @constructor - Creates a new DOMNested instance.
     */
    constructor() {
        super();
    }

    /**
     * Creates a new div block
     * @param children - The children of the div block.
     * @uiName Create block div
     * @param options - The options to apply to the div block.
     * @returns {string} - The rendered div block.
     * @example <caption>Create a new div block.</caption>
     * const child1 = new DOMNested().createBlockDiv(["Hello"]);
     * const child2 = new DOMNested().createBlockDiv(["World"]);
     * const div = new DOMNested().createBlockDiv([child1, child2]);
     */
    public createBlockDiv(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ): string {
        const props = this.combineProperties("", options)
        return this.createElement("div", props, children);
    }

    /**
     * Creates a new unordered list
     * @param children - The children of the list.
     * @uiName Create list
     * @param options - The options to apply to the list.
     * @returns {string} - The rendered list.
     * @example <caption>Create a new unordered list.</caption>
     * const child1 = new DOMNested().createListItem(["Hello"]);
     * const child2 = new DOMNested().createListItem(["World"]);
     * const list = new DOMNested().createList([child1, child2]);
     */
    public createList(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ): string {
        const props = this.combineProperties("", options)
        return this.createElement("ul", props, children);
    }

    /**
     * Creates a new list item
     * @param children - The children of the list item.
     * @uiName Create list item
     * @param options - The options to apply to the list item.
     * @returns {string} - The rendered list item.
     * @example <caption>Create a new list item.</caption>
     * const child1 = new DOMNested().createListItem(["Hello"]);
     */
    public createListItem(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ): string {
        const props = this.combineProperties("", options)
        return this.createElement("li", props, children);
    }

    /**
     * Creates a new fieldset
     * @param children - The children of the fieldset.
     * @uiName Create fieldset
     * @param options - The options to apply to the fieldset.
     * @returns {string} - The rendered fieldset.
     * @example <caption>Create a new fieldset.</caption>
     * const fieldset = new DOMNested().createFieldset(["Hello"]);
     */
    public createFieldset(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ): string {
        const props = this.combineProperties("", options)
        return this.createElement("fieldset", props, children);
    }

    /**
     * Creates a new form
     * @param children - The children of the form.
     * @uiName Create form
     * @param options - The options to apply to the form.
     * @returns {string} - The rendered form.
     * @example <caption>Create a new form.</caption>
     * const form = new DOMNested().createForm(["Hello"]);
     */
    public createForm(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ): string {
        const props = this.combineProperties("", options)
        return this.createElement("form", props, children);
    }
}