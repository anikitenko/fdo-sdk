import {DOM} from "./DOM";

export class DOMNested extends DOM {
    public createBlockDiv(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties("", options)
        return this.createElement("div", props, children);
    }

    public createList(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties("", options)
        return this.createElement("ul", props, children);
    }

    public createListItem(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties("", options)
        return this.createElement("li", props, children);
    }
}