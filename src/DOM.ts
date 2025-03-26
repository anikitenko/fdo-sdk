import {css as gooberCss, extractCss, keyframes, setup} from 'goober';


// Set up goober for SSR. The first parameter is a pragma (which is optional here),
// and the second parameter is the target for style injection.
// For SSR, we don't need a target, so we pass undefined.
setup(null);

export class DOM {
    private readonly selfCloseTag: boolean
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

    /**
     * Creates a style using goober’s css function.
     *
     * This function converts the style object into a CSS string and passes it
     * to goober’s css tagged template literal to generate a class name.
     *
     * @param styleObj A record of CSS properties and values
     * @returns {string} Generated class name
     * @uiName Create class from style
     * @example const class = createClassFromStyle({
     *   "background-color": 'red',
     *   color: 'white',
     *   padding: '10px',
     *   "border-radius": '5px',
     * });
     */
    public createClassFromStyle(styleObj: Record<string, string>): string {
        return gooberCss({...styleObj})
    }

    /**
     * Creates a style using goober’s keyframes function.
     *
     * This function converts the style object into a CSS string and passes it
     * to goober’s keyframes tagged template literal to generate a class name.
     *
     * @returns {string} - The generated class name.
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
        return keyframes`${keyframe}`
    }

    /**
     * Renders an element to an HTML string with CSS.
     * @param element - The html element to render.
     * @returns {string} - The final HTML string with Goober's styles.
     * @example const html = renderHTML('<div>Hello, World!</div>');
     * @uiSkip
     */
    public renderHTML(element: string): string {
        const cssText = extractCss();
        return `<style>{\`${cssText}\`}</style>${element}<script id="plugin-script-placeholder" nonce="plugin-script-inject"></script>`
    }

    /**
     * Creates a generic HTML element.
     * @param tag - The HTML tag name (e.g., 'div', 'button', 'p')
     * @param props - An object of attributes and event listeners
     * @param children - Nested elements or text content
     * @returns {string} - A virtual DOM element
     * @example const div = createElement('div', { className: 'container' }, 'Hello, World!');
     * @uiName Create element
     */
    public createElement(tag: string, props: Partial<Record<string, any>> = {}, ...children: any[]): string {
        const content = this.flattenChildren(children);
        const attributes = this.createAttributes(props);
        const onAttributes = this.createOnAttributes(props);
        const closeTagWithContent = `>${content.join('')}</${tag}>`
        const closeTag = this.selfCloseTag ? "/>" : closeTagWithContent

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
    public combineProperties(defaultClass: string, options: Partial<typeof DOM.DEFAULT_OPTIONS>, id: string = ""): Record<string, any> {
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
     * @param props - An object of attributes and event listeners
     * @returns {string} - A string of attributes.
     * @uiSkip
     */
    public createAttributes(props: Record<string, any>): string {
        return Object.entries(props)
            .filter(([key, value]) => !(key.startsWith("on") && typeof value === "function"))
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ').trim();
    }

    /**
     * Helper to build On attributes of element
     * @param props - An object of attributes and event listeners
     * @returns {string} - A string of attributes.
     * @uiSkip
     */
    public createOnAttributes(props: Record<string, any>): string {
        return Object.entries(props)
            .filter(([key, value]) => (key.startsWith("on") && typeof value === "function"))
            .map(([key, value]) => `${key}={${value.toString()}}`)
            .join(' ').trim();
    }

    /**
     * Handles merging options with defaults
     * @param userOptions - An object of options
     * @returns {Record<string, any>} - An object of merged options
     * @uiSkip
     */
    public mergeOptions(userOptions?: Partial<typeof DOM.DEFAULT_OPTIONS>): Record<string, any> {
        return {...DOM.DEFAULT_OPTIONS, ...userOptions};
    }
}

export default DOM