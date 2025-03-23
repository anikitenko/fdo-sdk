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
     */
    public createForm(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ): string {
        const props = this.combineProperties("", options)
        return this.createElement("form", props, children);
    }
}