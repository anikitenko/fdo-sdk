import {css as gooberCss, extractCss, setup} from 'goober';

// Set up goober for SSR. The first parameter is a pragma (which is optional here),
// and the second parameter is the target for style injection.
// For SSR, we don't need a target, so we pass undefined.
setup(null);

export class DOM {
    // Define a private static readonly type reference for UI options
    static readonly DEFAULT_OPTIONS = {
        classes: [] as string[],
        style: {} as Record<string, string>,
        disableDefaultClass: false,
        id: ""
    };

    /**
     * Handles merging options with defaults
     */
    private mergeOptions(userOptions?: Partial<typeof DOM.DEFAULT_OPTIONS>) {
        return {...DOM.DEFAULT_OPTIONS, ...userOptions};
    }

    protected combineProperties(defaultClass: string, options: Partial<typeof DOM.DEFAULT_OPTIONS>): Record<string, any> {
        const { classes, style, disableDefaultClass, id } = this.mergeOptions(options);
        const defaultPropClass = disableDefaultClass ? "" : defaultClass;

        const classString = (classes || []).join(" ");
        const generatedStyle = style ? this.createClassFromStyle(style) : undefined;
        const className = [defaultPropClass, classString, generatedStyle].filter(Boolean).join(" ");
        const elementID = id !== "" ? id : (Math.random() + 1).toString(36).substring(2);

        return { id: elementID, className};
    }

    /**
     * Creates a style using goober’s css function.
     *
     * This function converts the style object into a CSS string and passes it
     * to goober’s css tagged template literal to generate a class name.
     *
     * @param styleObj - A record of CSS properties and values.
     * @returns {string} - The generated class name.
     */
    public createClassFromStyle(styleObj: Record<string, string>): string {
        return gooberCss({...styleObj})
    }

    /**
     * Renders an element to an HTML string with CSS.
     * @param element - The html element to render.
     * @returns {string} - The final HTML string with Goober's styles.
     */
    public renderHTML(element: string): string {
        const cssText = extractCss();
        return `<style>{\`${cssText}\`}</style>${element}<script id="plugin-script-placeholder" nonce="plugin-script-inject"></script>`
    }

    // Helper to flatten children arrays and filter out null/undefined values.
    protected flattenChildren(children: string[]): string[] {
        // If there's only one child, return it directly.
        return children.flat(Infinity).filter(child => child != null)
    }

    // Helper to build attributes without event handlers
    protected createAttributes(props: Record<string, any>): string {
        return Object.entries(props)
            .filter(([key, value]) => !(key.startsWith("on") && typeof value === "function"))
            .map(([key, value]) => `${key}="${value}"` )
            .join(' ').trim();
    }

    // Helper to build attributes of event handlers
    protected createOnAttributes(props: Record<string, any>): string {
        return Object.entries(props)
            .filter(([key, value]) => (key.startsWith("on") && typeof value === "function"))
            .map(([key, value]) => `${key}={${value.toString()}}`)
            .join(' ').trim();
    }

    /**
     * Creates a generic HTML element.
     * @param tag - The HTML tag name (e.g., 'div', 'button', 'p')
     * @param props - An object of attributes and event listeners
     * @param children - Nested elements or text content
     * @returns A virtual DOM element
     */
    public createElement(tag: string, props: Partial<Record<string, any>> = {}, ...children: any[]): string {
        const content = this.flattenChildren(children);
        const attributes = this.createAttributes(props);
        const onAttributes = this.createOnAttributes(props);

        if (attributes && !onAttributes) {
            return `<${tag} ${attributes}>${content.join('')}</${tag}>`;
        } else if (onAttributes && !attributes) {
            return `<${tag} ${onAttributes}>${content.join('')}</${tag}>`;
        } else if (attributes && onAttributes) {
            return `<${tag} ${attributes} ${onAttributes}>${content.join('')}</${tag}>`;
        } else {
            return `<${tag}>${content.join('')}</${tag}>`;
        }
    }
}

export default DOM