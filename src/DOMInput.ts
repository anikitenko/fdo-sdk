import {DOM} from "./DOM";

export class DOMInput extends DOM {
    public createInput(type: string,
                       options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties("", options)
        return this.createElement("input", { ...props, type: type });
    }
}