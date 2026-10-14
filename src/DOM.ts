import {css as gooberCss, extractCss, keyframes, setup} from 'goober';

/** Goober declarations, nested selectors and conditional rules. Numeric values are emitted verbatim. */
export interface DOMStyleMap {
    [propertyOrSelector: string]: string | number | null | undefined | DOMStyleMap;
}


// No rendering pragma is needed for HTML-string composition. Explicit style
// sheets are passed through Goober's css context, rather than its setup API.
setup(null);

/** Element authoring options. Flat Record<string, string> styles remain valid. */
export interface DOMOptions {
    classes: string[];
    style: DOMStyleMap;
    disableDefaultClass: boolean;
}

export class DOM {
    private readonly selfCloseTag: boolean
    private styleSheet?: { data: string };
    private registeredStyles = false;
    private static readonly ATTRIBUTE_ALIAS_PRIORITY: Record<string, number> = {
        class: 2,
        className: 1,
        for: 2,
        htmlFor: 1,
        readonly: 2,
        readOnly: 1,
    };
    static readonly DEFAULT_OPTIONS = {
        classes: [] as string[],
        style: {} as Record<string, string>,
        disableDefaultClass: false,
    };

    /**
     * Creates a new DOM instance.
     * @constructor - Creates a new DOM instance.
     * @param selfCloseTag - Whether the element should be self-closing. Defaults to false.
     */
    constructor(selfCloseTag?: boolean) {
        this.selfCloseTag = selfCloseTag ?? false
    }

    private runWithSSRCompatibleGoober<T>(operation: () => T): T {
        const globalObject: any = globalThis as any;
        const hadWindow = Object.prototype.hasOwnProperty.call(globalObject, "window");
        const originalWindow = globalObject.window;
        const shouldMaskWindow =
            typeof globalObject.window === "object" &&
            globalObject.window !== null &&
            typeof globalObject.document === "undefined";

        if (!shouldMaskWindow || this.styleSheet) {
            return operation();
        }

        try {
            globalObject.window = undefined;
            return operation();
        } finally {
            if (hadWindow) {
                globalObject.window = originalWindow;
            } else {
                delete globalObject.window;
            }
        }
    }

    /**
     * Collect this instance and helper styles in one isolated sheet. Call before composing markup.
     * Repeated renders retain CSS; duplicate registrations are deduplicated by Goober.
     * @param helpers - Helper instances whose future styles belong to this collector.
     * @returns This collector, for chaining.
     * @uiSkip
     * @example const collector = new DOM().collectStylesFrom(new DOMText());
     */
    public collectStylesFrom(...helpers: DOM[]): this {
        const sheet = this.styleSheet ?? { data: "" };
        // Goober selects a browser target through querySelector/firstChild. Keep
        // collection string-only in both runtimes, without replacing window or
        // injecting into document.head. SSR directly reads this same data field.
        if (!this.styleSheet) Object.assign(sheet, {
            querySelector: () => ({ firstChild: sheet, parentNode: sheet }),
        });
        for (const helper of [this, ...helpers]) {
            if (!helper.styleSheet && helper.registeredStyles) {
                const error = new Error("Call collectStylesFrom before any styles are registered on the collector or helpers.");
                Object.assign(error, {code: "DOM_STYLE_COLLECTOR_LATE", remediation: "Create fresh helpers and attach them before composing markup."});
                throw error;
            }
            if (helper.styleSheet && helper.styleSheet !== sheet && helper.styleSheet.data) {
                const error = new Error("Collect styles before registration; use a fresh helper to change owners.");
                Object.assign(error, {code: "DOM_STYLE_OWNER_CONFLICT", remediation: "Create helpers per render owner and collectStylesFrom before composition."});
                throw error;
            }
        }
        this.styleSheet = sheet;
        for (const helper of helpers) helper.styleSheet = sheet;
        return this;
    }

    /**
     * Creates a style using goober’s css function.
     *
     * Passes declarations, nested selectors and conditional rules to Goober's
     * object serializer and registers CSS with this instance's style owner.
     *
     * @param styleObj A record of CSS properties and values
     * @returns {string} Generated class name
     * @uiName Create class from style
     * @example const className = createClassFromStyle({
     *   "background-color": 'red',
     *   color: 'white',
     *   padding: '10px',
     *   "border-radius": '5px',
     * });
     */
    public createClassFromStyle(styleObj: DOMStyleMap): string {
        this.registeredStyles = true;
        return this.runWithSSRCompatibleGoober(() => this.styleSheet
            ? gooberCss.call({target: this.styleSheet}, {...styleObj})
            : gooberCss({...styleObj}))
    }

    /**
     * Creates a style using goober’s keyframes function.
     *
     * Registers a keyframe body and returns its animation name. Use the result
     * in animation/animationName, rather than as an element class.
     *
     * @returns {string} - The generated animation name (use in animation/animationName).
     * @param keyframe - The keyframe string to create.
     * @uiName Create keyframe from style
     * @example const className = createStyleKeyframe(`
     *   from {
     *     transform: rotate(0deg);
     *   }
     *   to {
     *     transform: rotate(360deg);
     *   }
     * `);
     */
    public createStyleKeyframe(keyframe: string): string {
        this.registeredStyles = true;
        return this.runWithSSRCompatibleGoober(() => this.styleSheet
            ? gooberCss.bind({target: this.styleSheet, k: 1})`${keyframe}`
            : keyframes`${keyframe}`)
    }

    /**
     * Renders helper-composed markup to a raw HTML string with extracted CSS.
     * DOM helpers accept some JSX-style aliases for compatibility, but the emitted
     * attributes and style output must remain valid HTML for production rendering.
     *
     * @param element - The HTML fragment to render.
     * @returns {string} - The final HTML string with Goober's styles.
     * @example const html = renderHTML('<div>Hello, World!</div>');
     * @uiSkip
     */
    public renderHTML(element: string): string {
        const cssText = this.styleSheet?.data ?? this.runWithSSRCompatibleGoober(() => extractCss());
        return `<style>${cssText}</style>${element}<script id="plugin-script-placeholder" nonce="plugin-script-inject"></script>`
    }

    /**
     * Creates a generic HTML element.
     * @param tag - The HTML tag name (e.g., 'div', 'button', 'p')
     * @param props - An object of attributes and legacy serialized event functions (no listeners are installed)
     * @param children - Trusted HTML child fragments. Use DOMText helpers for untrusted/user text.
     * @returns {string} - A raw HTML element string
     * @example const div = createElement('div', { className: 'container' }, 'Hello, World!');
     * @uiName Create element
     */
    public createElement(tag: string, props: Partial<Record<string, any>> = {}, ...children: any[]): string {
        const content = this.flattenChildren(children);
        const attributes = this.createAttributes(props);
        const onAttributes = this.createOnAttributes(props);
        const closeTagWithContent = `>${content.join('')}</${tag}>`
        const closeTag = this.selfCloseTag && tag !== "textarea" ? ` />` : closeTagWithContent

        let openTag;
        if (attributes && !onAttributes) {
            openTag = `<${tag} ${attributes}`;
        } else if (onAttributes && !attributes) {
            openTag = `<${tag} ${onAttributes}`;
        } else if (attributes && onAttributes) {
            openTag = `<${tag} ${attributes} ${onAttributes}`;
        } else {
            openTag = `<${tag}`;
        }

        return openTag + closeTag
    }

    /**
     * Combines properties into a single object.
     * @param defaultClass - The default class name.
     * @param options - An object containing classes, style, and disableDefaultClass.
     * @param id - An optional ID for the element.
     * @returns {Record<string, any>} - An object containing the combined properties.
     * @example const props = combineProperties('default-class', { classes: ['class1', 'class2'], style: { color: 'red' }, disableDefaultClass: false }, 'element-id');
     * @uiSkip
     */
    public combineProperties(defaultClass: string, options: Partial<DOMOptions>, id: string = ""): Record<string, any> {
        const {classes, style, disableDefaultClass} = this.mergeOptions(options);
        const defaultPropClass = disableDefaultClass ? "" : defaultClass;

        const classString = (classes || []).join(" ");
        const generatedStyle = style ? this.createClassFromStyle(style) : undefined;
        const className = [defaultPropClass, classString, generatedStyle].filter(Boolean).join(" ");
        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);

        return {id: elementID, className};
    }

    // Helper to flatten children arrays and filter out null/undefined values.
    protected flattenChildren(children: string[]): string[] {
        // If there's only one child, return it directly.
        return children.flat(Infinity).filter(child => child != null)
    }

    /**
     * Helper to build attributes of element
     * @param props - An object of attributes and legacy serialized event functions (no listeners are installed)
     * @returns {string} - A string of attributes.
     * @uiSkip
     */
    public createAttributes(props: Record<string, any>): string {
        const booleanAttrs = new Set([
            "checked", "disabled", "readonly", "required", "autoplay", "controls",
            "hidden", "multiple", "selected", "default", "open", "loop"
        ])
        const normalizedProps = this.normalizeAttributeEntries(
            Object.entries(props).filter(([key, value]) => key !== "customAttributes" && !(key.startsWith("on") && typeof value === "function"))
        );

        return Object.entries(normalizedProps)
            .map(([key, value]) => {
                if (typeof value === "boolean") {
                    return booleanAttrs.has(key)
                        ? (value ? key : "") // render as `checked` if true, skip if false
                        : `${key}="${this.escapeJSXAttributeValue(value)}"` // custom boolean-like (e.g., data-*) as string
                }
                return `${key}="${this.escapeJSXAttributeValue(value)}"`
            })
            .filter(Boolean)
            .join(" ")
            .trim()
    }

    /**
     * Helper to build On attributes of element
     * @param props - An object of attributes and legacy serialized event functions (no listeners are installed)
     * @returns {string} - A string of attributes.
     * @uiSkip
     */
    public createOnAttributes(props: Record<string, any>): string {
        return Object.entries(props)
            .filter(([key, value]) => (key.startsWith("on") && typeof value === "function"))
            .map(([key, value]) => `${this.normalizeHTMLAttributeName(key)}={${value.toString()}}`)
            .join(' ').trim();
    }

    /**
     * Handles merging options with defaults
     * @param userOptions - An object of options
     * @returns {Record<string, any>} - An object of merged options
     * @uiSkip
     */
    public mergeOptions(userOptions?: Partial<DOMOptions>): Record<string, any> {
        return {...DOM.DEFAULT_OPTIONS, ...userOptions};
    }

    /**
     * Merges user provided custom attributes into element props.
     * @param props - Existing element props.
     * @param options - Options that can include customAttributes.
     * @returns {Record<string, any>} - Merged props.
     * @uiSkip
     */
    protected applyCustomAttributes(
        props: Record<string, any>,
        options?: Partial<DOMOptions & { customAttributes?: Record<string, string> }>
    ): Record<string, any> {
        if (!options?.customAttributes) {
            return props;
        }

        const normalizedCustomAttributes = this.normalizeAttributeEntries(Object.entries(options.customAttributes));

        for (const [attr, value] of Object.entries(normalizedCustomAttributes)) {
            props[attr] = value;
        }

        return props;
    }

    /**
     * Escapes content intended for JSX text-node context.
     * @param value - Raw value to escape.
     * @returns {string} - JSX-safe escaped text.
     * @uiSkip
     */
    protected escapeJSXText(value: unknown): string {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/{/g, "&#123;")
            .replace(/}/g, "&#125;");
    }

    /**
     * Escapes values intended for quoted JSX attribute context.
     * @param value - Raw value to escape.
     * @returns {string} - JSX-safe escaped attribute value.
     * @uiSkip
     */
    protected escapeJSXAttributeValue(value: unknown): string {
        return this.escapeJSXText(value)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /**
     * Normalizes known attribute aliases into emitted HTML attribute naming.
     * Accept JSX-style aliases for compatibility, but always emit raw HTML names.
     * @param key - Raw attribute/property name.
     * @returns {string} - HTML-normalized attribute name.
     * @uiSkip
     */
    protected normalizeHTMLAttributeName(key: string): string {
        if (key === "class" || key === "className") {
            return "class";
        }
        if (key === "for" || key === "htmlFor") {
            return "for";
        }
        if (key === "readonly" || key === "readOnly") {
            return "readonly";
        }
        return key;
    }

    private normalizeAttributeEntries(entries: Array<[string, any]>): Record<string, any> {
        const normalized: Record<string, { value: any; priority: number; index: number }> = {};

        entries.forEach(([key, value], index) => {
            const normalizedKey = this.normalizeHTMLAttributeName(key);
            const priority = DOM.ATTRIBUTE_ALIAS_PRIORITY[key] ?? 0;
            const existing = normalized[normalizedKey];

            if (!existing || priority > existing.priority || (priority === existing.priority && index >= existing.index)) {
                normalized[normalizedKey] = {
                    value,
                    priority,
                    index,
                };
            }
        });

        return Object.fromEntries(
            Object.entries(normalized).map(([key, entry]) => [key, entry.value])
        );
    }
}

export default DOM
