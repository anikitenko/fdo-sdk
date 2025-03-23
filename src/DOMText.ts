import {DOM} from "./DOM";

export class DOMText extends DOM {
    /**
     * Creates a new DOMText instance.
     * @constructor - Creates a new DOMText instance.
     */
    constructor() {
        super();
    }

    /**
     * Creates a new blockquote text element.
     * @uiName Create blockquote text
     * @param content - The content of the blockquote.
     * @param options - The options to apply to the blockquote.
     * @returns {string} - The rendered blockquote text element.
     */
    public createBlockQuoteText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("blockquote", content, options, false, "");
    }

    /**
     * Creates a new p text element.
     * @uiName Create p text
     * @param content - The content of the p text.
     * @param options - The options to apply to the p text.
     * @returns {string} - The rendered p text element.
     */
    public createPText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("p", content, options)
    }

    /**
     * Creates a new span text element.
     * @uiName Create span text
     * @param content - The content of the span text.
     * @param options - The options to apply to the span text.
     * @returns {string} - The rendered span text element.
     */
    public createSpanText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("span", content, options)
    }

    /**
     * Creates a new code text element.
     * @uiName Create code text
     * @param content - The content of the code text.
     * @param options - The options to apply to the code text.
     * @returns {string} - The rendered code text element.
     */
    public createCodeText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("code", content, options, false, "")
    }

    /**
     * Creates a new strong text element.
     * @uiName Create strong text
     * @param content - The content of the strong text.
     * @param options - The options to apply to the strong text.
     * @returns {string} - The rendered strong text element.
     */
    public createStrongText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("strong", content, options, true)
    }

    /**
     * Creates a new em text element.
     * @uiName Create em text
     * @param content - The content of the em text.
     * @param options - The options to apply to the em text.
     * @returns {string} - The rendered em text element.
     */
    public createEmText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("em", content, options, true)
    }

    /**
     * Creates a new h text element.
     * @uiName Create h text
     * @param level - The level of the h text.
     * @param content - The content of the h text.
     * @param options - The options to apply to the h text.
     * @returns {string} - The rendered h text element.
     */
    public createHText(
        level: number,
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        const element = `h${level}`;
        return this.createTextElement(element, content, options, true);
    }

    /**
     * Creates a new pre text element.
     * @uiName Create pre text
     * @param content - The content of the pre text.
     * @param options - The options to apply to the pre text.
     * @returns {string} - The rendered pre text element.
     */
    public createPreText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("pre", content, options, true)
    }

    /**
     * Creates a new i text element.
     * @uiName Create i text
     * @param content - The content of the i text.
     * @param options - The options to apply to the i text.
     * @returns {string} - The rendered i text element.
     */
    public createIText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("i", content, options, true)
    }

    /**
     * Creates a new label text element.
     * @uiName Create label text
     * @param content - The content of the label text.
     * @param htmlFor - The for attribute of the label text.
     * @param options - The options to apply to the label text.
     * @returns {string} - The rendered label text element.
     */
    public createLabelText(
        content: string,
        htmlFor: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>
    ): string {
        return this.createTextElement("label", content, options, true, "", {"htmlFor": htmlFor})
    }

    /**
     * Creates a new text element.
     * @param element - The element to create.
     * @param content - The content of the element.
     * @param options - The options to apply to the element.
     * @param disableDefaultClassOpt - Whether to disable the default class.
     * @param defaultClass - The default class to apply.
     * @param extraProps - The extra properties to apply to the element.
     * @returns {string} - The rendered text element.
     * @uiName Create text element
     */
    private createTextElement(
        element: string,
        content: string,
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
        disableDefaultClassOpt: boolean = false,
        defaultClass: string = "",
        extraProps: Record<string, string> = {}
    ): string {
        const {disableDefaultClass} = options || {};
        const defaultBlueprintClass = disableDefaultClass || disableDefaultClassOpt ? "" : defaultClass;
        const props = this.combineProperties(defaultBlueprintClass, options)

        return this.createElement(element, {...props, ...extraProps}, content);
    }
}