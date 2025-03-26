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
     * @param id - The id of the divider.
     * @returns {string} - The rendered divider element.
     * @uiName Create divider
     * @example <caption>Create a new divider element.</caption>
     * const divider = new DOMMisc().divider();
     */
    public divider(options?: Partial<typeof DOM.DEFAULT_OPTIONS>, id?: string): string {
        const style = {
            ...DOM.DEFAULT_OPTIONS.style,
            "border-top": "1px solid #cccccd", margin: "10px",
            ...(options?.style || {})
        };

        const mergedOptions: Partial<typeof DOM.DEFAULT_OPTIONS> = {
            ...DOM.DEFAULT_OPTIONS,
            ...options || {},
            style
        };

        const props = this.combineProperties("", mergedOptions, id);
        return this.createElement("hr", props);
    }
}