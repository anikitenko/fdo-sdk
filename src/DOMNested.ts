import {DOM} from "./DOM";

export class DOMNested extends DOM {
    public createNestedBlockDiv(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties("", options)
        return this.createElement("div", props, children);
    }

    public createNestedList(
        children: any[],
        unstyled?: boolean,
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties(unstyled ? "bp5-list-unstyled" : "bp5-list", options)
        return this.createElement("ul", props, children);
    }
}