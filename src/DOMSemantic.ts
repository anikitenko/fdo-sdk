import {DOM} from "./DOM";

export class DOMSemantic extends DOM {
    /**
     * Creates a new DOMSemantic instance.
     * @constructor - Creates a new DOMSemantic instance.
     */
    constructor() {
        super();
    }

    /**
     * Creates an article element.
     * @param children - The children of the article.
     * @param options - The options to apply to the article.
     * @param id - The id of the article.
     * @returns {string} - The rendered article element.
     * @uiName Create article
     * @example <caption>Create an article section.</caption>
     * const article = new DOMSemantic().createArticle(["<h2>Article Title</h2><p>Content...</p>"]);
     */
    public createArticle(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("article", props, children);
    }

    /**
     * Creates a section element.
     * @param children - The children of the section.
     * @param options - The options to apply to the section.
     * @param id - The id of the section.
     * @returns {string} - The rendered section element.
     * @uiName Create section
     * @example <caption>Create a section.</caption>
     * const section = new DOMSemantic().createSection(["<h2>Section Title</h2><p>Content...</p>"]);
     */
    public createSection(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("section", props, children);
    }

    /**
     * Creates a nav element.
     * @param children - The children of the nav (navigation links).
     * @param options - The options to apply to the nav.
     * @param id - The id of the nav.
     * @returns {string} - The rendered nav element.
     * @uiName Create nav
     * @example <caption>Create a navigation menu.</caption>
     * const nav = new DOMSemantic().createNav(["<a href='/'>Home</a><a href='/about'>About</a>"]);
     */
    public createNav(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("nav", props, children);
    }

    /**
     * Creates a header element.
     * @param children - The children of the header.
     * @param options - The options to apply to the header.
     * @param id - The id of the header.
     * @returns {string} - The rendered header element.
     * @uiName Create header
     * @example <caption>Create a page header.</caption>
     * const header = new DOMSemantic().createHeader(["<h1>Site Title</h1><nav>...</nav>"]);
     */
    public createHeader(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("header", props, children);
    }

    /**
     * Creates a footer element.
     * @param children - The children of the footer.
     * @param options - The options to apply to the footer.
     * @param id - The id of the footer.
     * @returns {string} - The rendered footer element.
     * @uiName Create footer
     * @example <caption>Create a page footer.</caption>
     * const footer = new DOMSemantic().createFooter(["<p>&copy; 2025 Company Name</p>"]);
     */
    public createFooter(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("footer", props, children);
    }

    /**
     * Creates an aside element.
     * @param children - The children of the aside.
     * @param options - The options to apply to the aside.
     * @param id - The id of the aside.
     * @returns {string} - The rendered aside element.
     * @uiName Create aside
     * @example <caption>Create a sidebar.</caption>
     * const aside = new DOMSemantic().createAside(["<h3>Related Links</h3><ul>...</ul>"]);
     */
    public createAside(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("aside", props, children);
    }

    /**
     * Creates a main element.
     * @param children - The children of the main content area.
     * @param options - The options to apply to the main.
     * @param id - The id of the main.
     * @returns {string} - The rendered main element.
     * @uiName Create main
     * @example <caption>Create the main content area.</caption>
     * const main = new DOMSemantic().createMain(["<article>...</article>"]);
     */
    public createMain(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("main", props, children);
    }
}
