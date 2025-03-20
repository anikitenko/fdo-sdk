import {DOM} from "./DOM";

export class DOMText extends DOM {
    private createTextElement(
        element: string,
        content: string,
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
        disableDefaultClassOpt: boolean = false,
        defaultClass: string = ""
    ) {
        const { disableDefaultClass } = options || {};
        const defaultBlueprintClass = disableDefaultClass || disableDefaultClassOpt ? "" : defaultClass;
        const props = this.combineProperties(defaultBlueprintClass, options)

        return this.createElement(element, props, content);
    }

    public createBlockQuoteText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("blockquote", content, options, false, "");
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
        return this.createTextElement("code", content, options, false, "")
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

    public createIText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ) {
        return this.createTextElement("i", content, options, true)
    }
}