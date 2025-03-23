import {DOM} from "./DOM";

export class DOMButton extends DOM {
    /**
     * Creates a new DOMButton instance.
     * @constructor - Creates a new DOMButton instance.
     */
    constructor() {
        super()
    }

    /**
     * Renders the button with current state.
     * @param label - The label of the button.
     * @param onClick - The function to call when the button is clicked.
     * @param options - The options to apply to the button.
     * @param otherProps - The other properties to apply to the button.
     * @returns {string} - The rendered button element.
     * @uiName Create button
     * @example <caption>Example usage of createButton.</caption>
     * // Creates a button with the label "Click me" and an onClick function that logs "Button clicked".
     * createButton("Click me", () => console.log("Button clicked"));
     */
    public createButton(label: string,
                        onClick: Function,
                        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
                        otherProps?: Record<string, any>
    ): string {
        const props = this.combineProperties("pure-button", options)
        return this.createElement("button", {...props, onClick: onClick, ...otherProps}, label);
    }
}

