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

    /**
     * Creates a select dropdown element.
     * @param children - The option or optgroup children of the select.
     * @param onChange - Optional change event handler.
     * @returns {string} - The rendered select element.
     * @uiName Create select
     * @example <caption>Create a select dropdown with options.</caption>
     * const option1 = new DOMInput("", {}).createOption("Option 1", "value1");
     * const option2 = new DOMInput("", {}).createOption("Option 2", "value2");
     * const select = new DOMInput("my-select", {}).createSelect([option1, option2]);
     */
    public createSelect(children: any[], onChange?: Function): string {
        const props = this.combineProperties("", this.options, this.id);
        const selectProps = onChange ? {...props, onChange, ...this.props} : {...props, ...this.props};

        const attributes = this.createAttributes(selectProps);
        const onAttributes = onChange ? this.createOnAttributes(selectProps) : "";
        const content = this.flattenChildren(children).join('');
        
        let openTag;
        if (attributes && onAttributes) {
            openTag = `<select ${attributes} ${onAttributes}>`;
        } else if (attributes) {
            openTag = `<select ${attributes}>`;
        } else if (onAttributes) {
            openTag = `<select ${onAttributes}>`;
        } else {
            openTag = `<select>`;
        }
        
        return `${openTag}${content}</select>`;
    }

    /**
     * Creates an option element for use within a select.
     * @param label - The visible text of the option.
     * @param value - The value of the option.
     * @param selected - Whether the option is selected by default.
     * @param otherProps - Additional properties for the option.
     * @returns {string} - The rendered option element.
     * @uiName Create option
     * @example <caption>Create an option element.</caption>
     * const option = new DOMInput("", {}).createOption("Choose me", "value1", false);
     */
    public createOption(label: string, value: string, selected: boolean = false, otherProps?: Record<string, any>): string {
        const props = this.combineProperties("", this.options, this.id);
        const optionProps = {...props, value, selected, ...otherProps};

        const attributes = this.createAttributes(optionProps);
        const openTag = attributes ? `<option ${attributes}>` : `<option>`;
        
        return `${openTag}${label}</option>`;
    }

    /**
     * Creates an optgroup element for grouping options within a select.
     * @param label - The label for the option group.
     * @param children - The option children of the optgroup.
     * @param otherProps - Additional properties for the optgroup.
     * @returns {string} - The rendered optgroup element.
     * @uiName Create optgroup
     * @example <caption>Create an optgroup with options.</caption>
     * const option1 = new DOMInput("", {}).createOption("Sub 1", "val1");
     * const option2 = new DOMInput("", {}).createOption("Sub 2", "val2");
     * const optgroup = new DOMInput("", {}).createOptgroup("Group Label", [option1, option2]);
     */
    public createOptgroup(label: string, children: any[], otherProps?: Record<string, any>): string {
        const props = this.combineProperties("", this.options, this.id);
        const optgroupProps = {...props, label, ...otherProps};

        const attributes = this.createAttributes(optgroupProps);
        const content = this.flattenChildren(children).join('');
        const openTag = attributes ? `<optgroup ${attributes}>` : `<optgroup>`;
        
        return `${openTag}${content}</optgroup>`;
    }
}
