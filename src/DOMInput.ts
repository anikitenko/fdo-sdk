import {DOM} from "./DOM";

export class DOMInput extends DOM {
    private readonly options: Partial<typeof DOM.DEFAULT_OPTIONS>
    private readonly props: Record<string, any> | undefined

    /**
     * Creates a new DOMInput instance.
     * @param styleOptions - The style options to apply to the input.
     * @param props - The properties to apply to the input.
     * @constructor - Creates a new DOMInput instance with the given style options and properties.
     */
    constructor(styleOptions: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
                props?: Record<string, any>) {
        super()
        this.options = styleOptions
        this.props = props
    }

    /**
     * Creates a new input element.
     * @param type - The type of the input.
     * @returns {string} - The rendered input element.
     * @uiName Create input
     */
    public createInput(type: string): string {
        const props = this.combineProperties("", this.options)

        return this.createElement("input", {...props, type: type, ...this.props});
    }

    /**
     * Creates a new textarea element.
     * @param type - The type of the textarea.
     * @returns {string} - The rendered textarea element.
     * @uiName Create textarea
     */
    public createTextarea(type: string): string {
        const props = this.combineProperties("", this.options)

        return this.createElement("textarea", {...props, type: type, ...this.props});
    }
}