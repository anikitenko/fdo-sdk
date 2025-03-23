import {DOM} from "./DOM";

export class DOMLink extends DOM {
    private readonly options: Partial<typeof DOM.DEFAULT_OPTIONS>
    private readonly props: Record<string, any> | undefined

    /**
     * Creates a new DOMLink instance.
     * @param styleOptions - The style options to apply to the link.
     * @param props - The properties to apply to the link.
     * @constructor - Creates a new DOMLink instance with the given style options and properties.
     */
    constructor(styleOptions: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
                props?: Record<string, any>) {
        super()
        this.options = styleOptions
        this.props = props
    }

    /**
     * Creates a new link element.
     * @param label - The label of the link.
     * @param href - The href of the link.
     * @returns {string} - The rendered link element.
     * @uiName Create link
     * @example <caption>Create a new link element.</caption>
     * const link = new DOMLink().createLink("Click me", "https://example.com");
     */
    public createLink(label: string, href: string): string {
        const props = this.combineProperties("", this.options)

        return this.createElement("a",
            {
                ...props,
                href: href,
                ...this.props
            }, label);
    }
}