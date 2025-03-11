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
        const { blueprintClasses, style, disableDefaultClass } = this.mergeOptions(this.options);

        const defaultBlueprintClass = disableDefaultClass ? "" : "bp5-button";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");

        return this.createElement("a", { class: className, href: href, ...this.props }, label);
    }
}