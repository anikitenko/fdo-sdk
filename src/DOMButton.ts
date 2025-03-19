import {DOM} from "./DOM";

export class DOMButton extends DOM {
    /**
     * Renders the button with current state.
     */
    public createButton(label: string,
                        onClick: Function,
                        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
    ) {
        const props = this.combineProperties("bp5-button", options)
        return this.createElement("button", {...props, onClick: onClick}, label);
    }
}

