import {DOM} from "./DOM";

export class DOMButton extends DOM {
    /**
     * Renders the button with current state.
     */
    public createButton(label: string,
                        onClick: Function,
                        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
                        otherProps?: Record<string, any>
    ) {
        const props = this.combineProperties("pure-button", options)
        return this.createElement("button", {...props, onClick: onClick, ...otherProps}, label);
    }
}

