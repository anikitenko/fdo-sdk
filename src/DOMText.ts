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
     * @param id - The id of the blockquote.
     * @returns {string} - The rendered blockquote text element.
     * @example <caption>Create a new blockquote text element.</caption>
     * const blockquote = new DOMText().createBlockQuoteText("This is a blockquote");
     */
    public createBlockQuoteText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("blockquote", content, id, options, false, "");
    }

    /**
     * Creates a new p text element.
     * @uiName Create p text
     * @param content - The content of the p text.
     * @param options - The options to apply to the p text.
     * @param id - The id of the p text.
     * @returns {string} - The rendered p text element.
     * @example <caption>Create a new p text element.</caption>
     * const p = new DOMText().createPText("This is a p text");
     */
    public createPText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("p", content, id, options)
    }

    /**
     * Creates a new span text element.
     * @uiName Create span text
     * @param content - The content of the span text.
     * @param options - The options to apply to the span text.
     * @param id - The id of the span text.
     * @returns {string} - The rendered span text element.
     * @example <caption>Create a new span text element.</caption>
     * const span = new DOMText().createSpanText("This is a span text");
     */
    public createSpanText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("span", content, id, options)
    }

    /**
     * Creates a new code text element.
     * @uiName Create code text
     * @param content - The content of the code text.
     * @param options - The options to apply to the code text.
     * @param id - The id of the code text.
     * @returns {string} - The rendered code text element.
     * @example <caption>Create a new code text element.</caption>
     * const code = new DOMText().createCodeText("This is a code text");
     */
    public createCodeText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("code", content, id, options, false, "")
    }

    /**
     * Creates a new strong text element.
     * @uiName Create strong text
     * @param content - The content of the strong text.
     * @param options - The options to apply to the strong text.
     * @param id - The id of the strong text.
     * @returns {string} - The rendered strong text element.
     * @example <caption>Create a new strong text element.</caption>
     * const strong = new DOMText().createStrongText("This is a strong text");
     */
    public createStrongText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("strong", content, id, options, true)
    }

    /**
     * Creates a new em text element.
     * @uiName Create em text
     * @param content - The content of the em text.
     * @param options - The options to apply to the em text.
     * @param id - The id of the em text.
     * @returns {string} - The rendered em text element.
     * @example <caption>Create a new em text element.</caption>
     * const em = new DOMText().createEmText("This is a em text");
     */
    public createEmText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("em", content, id, options, true)
    }

    /**
     * Creates a new h text element.
     * @uiName Create h text
     * @param level - The level of the h text.
     * @param content - The content of the h text.
     * @param options - The options to apply to the h text.
     * @param id - The id of the h text.
     * @returns {string} - The rendered h text element.
     * @example <caption>Create a new h text element.</caption>
     * const h = new DOMText().createHText(1, "This is a h text");
     */
    public createHText(
        level: number,
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        const element = `h${level}`;
        return this.createTextElement(element, content, id, options, true);
    }

    /**
     * Creates a new pre text element.
     * @uiName Create pre text
     * @param content - The content of the pre text.
     * @param options - The options to apply to the pre text.
     * @param id - The id of the pre text.
     * @returns {string} - The rendered pre text element.
     * @example <caption>Create a new pre text element.</caption>
     * const pre = new DOMText().createPreText("This is a pre text");
     */
    public createPreText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("pre", content, id, options, true)
    }

    /**
     * Creates a new i text element.
     * @uiName Create i text
     * @param content - The content of the i text.
     * @param options - The options to apply to the i text.
     * @param id - The id of the i text.
     * @returns {string} - The rendered i text element.
     * @example <caption>Create a new i text element.</caption>
     * const i = new DOMText().createIText("This is a i text");
     */
    public createIText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("i", content, id, options, true)
    }

    /**
     * Creates a new b text element.
     * @uiName Create b text
     * @param content - The content of the b text.
     * @param options - The options to apply to the b text.
     * @param id - The id of the b text.
     * @returns {string} - The rendered b text element.
     * @example <caption>Create a new b text element.</caption>
     * const b = new DOMText().createBText("This is a b text");
     */
    public createBText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("b", content, id, options, true)
    }

    /**
     * Creates a new cite text element.
     * @uiName Create cite text
     * @param content - The content of the cite text.
     * @param options - The options to apply to the cite text.
     * @param id - The id of the cite text.
     * @returns {string} - The rendered cite text element.
     * @example <caption>Create a new cite text element.</caption>
     * const cite = new DOMText().createCiteText("This is a cite text");
     */
    public createCiteText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("cite", content, id, options, true)
    }

    /**
     * Creates a new s text element.
     * @uiName Create s text
     * @param content - The content of the s text.
     * @param options - The options to apply to the s text.
     * @param id - The id of the s text.
     * @returns {string} - The rendered s text element.
     * @example <caption>Create a new s text element.</caption>
     * const s = new DOMText().createSText("This is a s text");
     */
    public createSText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("s", content, id, options, true)
    }

    /**
     * Creates a new abbr text element.
     * @uiName Create abbr text
     * @param content - The content of the abbr text.
     * @param title - The title of the abbr text.
     * @param options - The options to apply to the abbr text.
     * @param id - The id of the abbr text.
     * @returns {string} - The rendered abbr text element.
     * @example <caption>Create a new abbr text element.</caption>
     * const abbr = new DOMText().createAbbrText("This is a abbr text", "This is a title");
     */
    public createAbbrText(
        content: string,
        title: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("abbr", content, id, options, true, "", {"title": title})
    }

    /**
     * Creates a new u text element.
     * @uiName Create u text
     * @param content - The content of the u text.
     * @param options - The options to apply to the u text.
     * @param id - The id of the u text.
     * @returns {string} - The rendered u text element.
     * @example <caption>Create a new u text element.</caption>
     * const u = new DOMText().createUText("This is a u text");
     */
    public createUText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("u", content, id, options, true)
    }

    /**
     * Creates a new label text element.
     * @uiName Create label text
     * @param content - The content of the label text.
     * @param htmlFor - The for attribute of the label text.
     * @param options - The options to apply to the label text.
     * @param id - The id of the label text.
     * @returns {string} - The rendered label text element.
     * @example <caption>Create a new label text element.</caption>
     * const label = new DOMText().createLabelText("This is a label text", "for");
     */
    public createLabelText(
        content: string,
        htmlFor: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("label", content, id, options, true, "", {"htmlFor": htmlFor})
    }

    /**
     * Creates a new div text element.
     * @uiName Create div text
     * @param content - The content of the div text.
     * @param options - The options to apply to the div text.
     * @param id - The id of the div text.
     * @returns {string} - The rendered div text element.
     * @example <caption>Create a new div text element.</caption>
     * const div = new DOMText().createDivText("This is a div text");
     */
    public createDivText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("div", content, id, options, true)
    }

    /**
     * Creates a new mark text element.
     * @uiName Create mark text
     * @param content - The content of the mark text.
     * @param options - The options to apply to the mark text.
     * @param id - The id of the mark text.
     * @returns {string} - The rendered mark text element.
     * @example <caption>Create a new mark text element.</caption>
     * const mark = new DOMText().createMarkText("This is a mark text");
     */
    public createMarkText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("mark", content, id, options, true)
    }

    /**
     * Creates a new small text element.
     * @uiName Create small text
     * @param content - The content of the small text.
     * @param options - The options to apply to the small text.
     * @param id - The id of the small text.
     * @returns {string} - The rendered small text element.
     * @example <caption>Create a new small text element.</caption>
     * const small = new DOMText().createSmallText("This is a small text");
     */
    public createSmallText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("small", content, id, options, true)
    }

    /**
     * Creates a new ins text element.
     * @uiName Create ins text
     * @param content - The content of the ins text.
     * @param options - The options to apply to the ins text.
     * @param id - The id of the ins text.
     * @returns {string} - The rendered ins text element.
     * @example <caption>Create a new ins text element.</caption>
     * const ins = new DOMText().createInsText("This is a ins text");
     */
    public createInsText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("ins", content, id, options, true)
    }

    /**
     * Creates a new kbd text element.
     * @uiName Create kbd text
     * @param content - The content of the kbd text.
     * @param options - The options to apply to the kbd text.
     * @param id - The id of the kbd text.
     * @returns {string} - The rendered kbd text element.
     * @example <caption>Create a new kbd text element.</caption>
     * const kbd = new DOMText().createKbdText("This is a kbd text");
     */
    public createKbdText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("kbd", content, id, options, true)
    }

    /**
     * Creates a new text element in span tag.
     * @uiName Create text
     * @param content - The content of the text.
     * @param options - The options to apply to the text.
     * @param id - The id of the text.
     * @returns {string} - The rendered text element.
     * @example <caption>Create a new text element.</caption>
     * const text = new DOMText().createText("This is a text");
     */
    public createText(
        content: string,
        options?: Partial<typeof DOM.DEFAULT_OPTIONS>,
        id?: string
    ): string {
        return this.createTextElement("span", content, id, options, true)
    }

    /**
     * Creates a new text element.
     * @param element - The element to create.
     * @param content - The content of the element.
     * @param id - The id of the element.
     * @param options - The options to apply to the element.
     * @param disableDefaultClassOpt - Whether to disable the default class.
     * @param defaultClass - The default class to apply.
     * @param extraProps - The extra properties to apply to the element.
     * @returns {string} - The rendered text element.
     * @uiName Create text element
     * @example <caption>Create a new text element.</caption>
     * const text = new DOMText().createTextElement("span", "This is a text element", DOM.DEFAULT_OPTIONS, false, "", {"data-test": "test"});
     */
    private createTextElement(
        element: string,
        content: string,
        id?: string,
        options: Partial<typeof DOM.DEFAULT_OPTIONS> = DOM.DEFAULT_OPTIONS,
        disableDefaultClassOpt: boolean = false,
        defaultClass: string = "",
        extraProps: Record<string, string> = {}
    ): string {
        const {disableDefaultClass} = options || {};
        const defaultBlueprintClass = disableDefaultClass || disableDefaultClassOpt ? "" : defaultClass;
        const props = this.combineProperties(defaultBlueprintClass, options, id)

        return this.createElement(element, {...props, ...extraProps}, content);
    }
}