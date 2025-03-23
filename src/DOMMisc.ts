import {DOM} from "./DOM";

export class DOMMisc extends DOM {
    /**
     * Creates a new DOMMisc instance.
     * @constructor - Creates a new DOMMisc instance.
     */
    constructor() {
        super()
    }

    /**
     * Creates a new divider element.
     * @param options - The options to apply to the divider.
     * @returns {string} - The rendered divider element.
     * @uiName Create divider
     * @example <caption>Create a new divider element.</caption>
     * const divider = new DOMMisc().divider();
     */
    public divider(options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS): string {
        const defaultOptions = DOM.DEFAULT_OPTIONS
        defaultOptions.style = {["border-top"]: "1px solid #cccccd", margin: "10px"}
        const styledOptions = Object.assign(defaultOptions, options)
        const props = this.combineProperties("", styledOptions)

        return this.createElement("hr", props, undefined);
    }
}