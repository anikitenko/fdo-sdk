import {DOM} from "./DOM";

export class DOMText extends DOM {
    private createTextElement(
        element: string,
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        disableDefaultClassOpt: boolean = false,
        defaultClass: string = "bp5-ui-text"
    ) {
        const { blueprintClasses, style, disableDefaultClass, id } = options || {};

        // Default Blueprint class (if not disabled)
        const defaultBlueprintClass = disableDefaultClass || disableDefaultClassOpt ? "" : defaultClass;

        // Merge multiple Blueprint classes (if provided)
        const blueprintClassString = (blueprintClasses || []).join(" ");

        // Generate dynamic styles using Emotion (if provided)
        const generatedStyle = style ? this.createStyle(style) : undefined;

        // Merge all classes properly
        const className = [defaultBlueprintClass, blueprintClassString, generatedStyle].filter(Boolean).join(" ");

        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);

        return this.createElement(element, {id: elementID, className: className}, content);
    }

    public createBlockQuoteText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("blockquote", content, options, false, "bp5-blockquote");
    }

    public createPText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("p", content, options)
    }

    public createSpanText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("span", content, options)
    }

    public createCodeText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("code", content, options, false, "bp5-code")
    }

    public createStrongText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("strong", content, options, true)
    }

    public createHText(
        level: number,
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        const element = `h${level}`;
        return this.createTextElement(element, content, options, true);
    }

    public createPreText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("pre", content, options, true)
    }
}