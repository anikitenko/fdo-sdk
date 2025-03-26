import {DOM} from "./DOM";

export class DOMInput extends DOM {
    private readonly id: string | undefined
    private readonly options: Partial<typeof DOM.DEFAULT_OPTIONS>
    private readonly props: Record<string, any> | undefined

    /**
     * Creates a new DOMInput instance.
     * @param id - The id of the input.
     * @param styleOptions - The style options to apply to the input.
     * @param props - The properties to apply to the input.
     * @constructor - Creates a new DOMInput instance with the given style options and properties.
     */
    constructor(id :string, styleOptions: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
                props?: Record<string, any>) {
        super(true)
        this.id = id
        this.options = styleOptions
        this.props = props
    }

    /**
     * Creates a new input element.
     * @param type - The type of the input.
     * @returns {string} - The rendered input element.
     * @uiName Create input
     * @example <caption>Create a new input element.</caption>
     * const input = new DOMInput().createInput("text");
     */
    public createInput(type: string): string {
        const props = this.combineProperties("", this.options, this.id)

        return this.createElement("input", {...props, type: type, ...this.props});
    }

    /**
     * Creates a new textarea element.
     * @returns {string} - The rendered textarea element.
     * @uiName Create textarea
     * @example <caption>Create a new textarea element.</caption>
     * const textarea = new DOMInput().createTextarea("text");
     */
    public createTextarea(): string {
        const props = this.combineProperties("", this.options, this.id)

        return this.createElement("textarea", {...props, ...this.props});
    }
}