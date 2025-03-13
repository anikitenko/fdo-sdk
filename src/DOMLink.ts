import {DOM} from "./DOM";

export class DOMLink extends DOM {
    private readonly options: Partial<typeof DOM.DEFAULT_OPTIONS> | undefined
    private readonly props: Record<string, any> | undefined
    constructor(styleOptions?: Partial<typeof DOM.DEFAULT_OPTIONS>, props?: Record<string, any>) {
        super()
        this.options = styleOptions
        this.props = props
    }

    public createLink(label: string, href: string) {
        const { blueprintClasses, style, id } = this.mergeOptions(this.options);

        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);

        return this.createElement("a",
            {
                id:  elementID,
                className: className,
                href: href,
                ...this.props
            }, label);
    }
}