import {DOM} from "./DOM";

export class DOMText extends DOM {
    public createTextElement(
        element: string,
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const { blueprintClasses, style } = this.mergeOptions(options);

        const defaultBlueprintClass = "";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");

        return this.createElement(element, {class: className}, content);
    }

    public createPText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        this.createTextElement("p", content, options)
    }

    public createSpanText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        this.createTextElement("span", content, options)
    }

    public createCodeText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        this.createTextElement("code", content, options)
    }

    public createStrongText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        this.createTextElement("strong", content, options)
    }

    public createHText(
        level: number,
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const element = `h${level}`;
        return this.createTextElement(element, content, options);
    }

    public createPreText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        this.createTextElement("pre", content, options)
    }

    public createBlockQuoteText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const { blueprintClasses, style, disableDefaultClass } = this.mergeOptions(options);

        const defaultBlueprintClass = disableDefaultClass ? "" : "bp5-blockquote";
        const blueprintClassString = blueprintClasses.join(" ");
        const generatedStyle = style ? this.createStyle(style) : undefined;
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");
        return this.createElement("blockquote", {class: className}, content);
    }
}