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
     * @param id - The id of the div block.
     * @returns {string} - The rendered div block.
     * @example <caption>Create a new div block.</caption>
     * const child1 = new DOMNested().createBlockDiv(["Hello"]);
     * const child2 = new DOMNested().createBlockDiv(["World"]);
     * const div = new DOMNested().createBlockDiv([child1, child2]);
     */
    public createBlockDiv(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("div", props, children);
    }

    /**
     * Creates a new unordered list
     * @param children - The children of the list.
     * @uiName Create list
     * @param options - The options to apply to the list.
     * @param id - The id of the list.
     * @returns {string} - The rendered list.
     * @example <caption>Create a new unordered list.</caption>
     * const child1 = new DOMNested().createListItem(["Hello"]);
     * const child2 = new DOMNested().createListItem(["World"]);
     * const list = new DOMNested().createList([child1, child2]);
     */
    public createList(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("ul", props, children);
    }

    /**
     * Creates a new list item
     * @param children - The children of the list item.
     * @uiName Create list item
     * @param options - The options to apply to the list item.
     * @param id - The id of the list item.
     * @returns {string} - The rendered list item.
     * @example <caption>Create a new list item.</caption>
     * const child1 = new DOMNested().createListItem(["Hello"]);
     */
    public createListItem(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("li", props, children)
    }

    /**
     * Creates a new legend
     * @param children - The children of the legend.
     * @uiName Create legend
     * @param options - The options to apply to the legend.
     * @param id - The id of the legend.
     * @returns {string} - The rendered legend.
     * @example <caption>Create a new legend.</caption>
     * const legend = new DOMNested().createLegend(["Hello"]);
     */
    public createLegend(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("legend", props, children);
    }

    /**
     * Creates a new fieldset
     * @param children - The children of the fieldset.
     * @uiName Create fieldset
     * @param options - The options to apply to the fieldset.
     * @param id - The id of the fieldset.
     * @returns {string} - The rendered fieldset.
     * @example <caption>Create a new fieldset.</caption>
     * const fieldset = new DOMNested().createFieldset(["Hello"]);
     */
    public createFieldset(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("fieldset", props, children);
    }

    /**
     * Creates a new form
     * @param children - The children of the form.
     * @uiName Create form
     * @param options - The options to apply to the form.
     * @param id - The id of the form.
     * @returns {string} - The rendered form.
     * @example <caption>Create a new form.</caption>
     * const form = new DOMNested().createForm(["Hello"]);
     */
    public createForm(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("form", props, children);
    }

    /**
     * Creates a new ordered list
     * @param children - The children of the ordered list.
     * @uiName Create ordered list
     * @param options - The options to apply to the ordered list.
     * @param id - The id of the ordered list.
     * @returns {string} - The rendered ordered list.
     * @example <caption>Create a new ordered list.</caption>
     * const child1 = new DOMNested().createListItem(["First item"]);
     * const child2 = new DOMNested().createListItem(["Second item"]);
     * const ol = new DOMNested().createOrderedList([child1, child2]);
     */
    public createOrderedList(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("ol", props, children);
    }

    /**
     * Creates a new definition list
     * @param children - The children of the definition list (dt and dd elements).
     * @uiName Create definition list
     * @param options - The options to apply to the definition list.
     * @param id - The id of the definition list.
     * @returns {string} - The rendered definition list.
     * @example <caption>Create a new definition list.</caption>
     * const term1 = new DOMNested().createDefinitionTerm(["Term 1"]);
     * const desc1 = new DOMNested().createDefinitionDescription(["Description 1"]);
     * const dl = new DOMNested().createDefinitionList([term1, desc1]);
     */
    public createDefinitionList(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("dl", props, children);
    }

    /**
     * Creates a new definition term
     * @param children - The children of the definition term.
     * @uiName Create definition term
     * @param options - The options to apply to the definition term.
     * @param id - The id of the definition term.
     * @returns {string} - The rendered definition term.
     * @example <caption>Create a new definition term.</caption>
     * const dt = new DOMNested().createDefinitionTerm(["API"]);
     */
    public createDefinitionTerm(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("dt", props, children);
    }

    /**
     * Creates a new definition description
     * @param children - The children of the definition description.
     * @uiName Create definition description
     * @param options - The options to apply to the definition description.
     * @param id - The id of the definition description.
     * @returns {string} - The rendered definition description.
     * @example <caption>Create a new definition description.</caption>
     * const dd = new DOMNested().createDefinitionDescription(["Application Programming Interface"]);
     */
    public createDefinitionDescription(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id)

        // Merge custom attributes (like data-static) into props
        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value
            }
        }

        return this.createElement("dd", props, children);
    }
}
