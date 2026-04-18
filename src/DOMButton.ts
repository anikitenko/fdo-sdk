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
     * @param id - The id of the button.
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
                        id? :string,
                        otherProps?: Record<string, any>
    ): string {
        const props = this.combineProperties("pure-button", options, id)
        return this.createElement("button", {...props, onClick: onClick, ...otherProps}, label);
    }

    /**
     * Creates a static button element without serializing an inline click handler.
     * Use this for UI that binds listeners imperatively in renderOnLoad.
     * @param label - The label of the button.
     * @param options - The options to apply to the button.
     * @param id - The id of the button.
     * @param otherProps - Additional properties to apply to the button (e.g. type).
     * @returns {string} - The rendered button element.
     * @uiName Create static button
     * @example <caption>Create a button and bind click in runtime code.</caption>
     * const button = new DOMButton().createStaticButton("Run", { disableDefaultClass: true }, "run-btn", { type: "button" });
     */
    public createStaticButton(
        label: string,
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
        id?: string,
        otherProps?: Record<string, any>
    ): string {
        const props = this.combineProperties("pure-button", options, id);
        return this.createElement("button", {...props, ...otherProps}, label);
    }
}
