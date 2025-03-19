import {DOM} from "./DOM";

export class DOMLink extends DOM {
    private readonly options: Partial<typeof DOM.DEFAULT_OPTIONS>
    private readonly props: Record<string, any> | undefined
    constructor(styleOptions: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
                props?: Record<string, any>) {
        super()
        this.options = styleOptions
        this.props = props
    }

    public createLink(label: string, href: string) {
        const props = this.combineProperties("", this.options)

        return this.createElement("a",
            {
                ...props,
                href: href,
                ...this.props
            }, label);
    }
}