import {html, render} from 'uhtml-ssr';
import { css as gooberCss, extractCss, setup } from 'goober';

// Set up goober for SSR. The first parameter is a pragma (which is optional here),
// and the second parameter is the target for style injection.
// For SSR, we don't need a target, so we pass undefined.
setup(null);

export class DOM {
    // Define a private static readonly type reference for UI options
    protected static readonly DEFAULT_OPTIONS = {
        blueprintClasses: [] as string[],
        style: {} as Record<string, string>,
        disableDefaultClass: false,
        id: ""
    };

    /**
     * Handles merging options with defaults
     */
    protected mergeOptions(userOptions?: Partial<typeof DOM.DEFAULT_OPTIONS>) {
        return {...DOM.DEFAULT_OPTIONS, ...userOptions};
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
    protected createStyle(styleObj: Record<string, string>): string {
        // Convert the style object into a CSS string.
        const cssString = Object.entries(styleObj)
            .map(([prop, value]) => `${prop}: ${value};`)
            .join(" ");
        // Use goober's css function to generate a class name.
        return gooberCss`${cssString}`;
    }

    // Helper to flatten children arrays and filter out null/undefined values.
    protected flattenChildren(children: any[]): any {
        const flattened = children.flat(Infinity).filter(child => child != null);
        // If there's only one child, return it directly.
        return flattened.length === 1 ? flattened[0] : flattened;
    }

    /**
     * Renders an element to an HTML string.
     * @param element - The uhtml element to render.
     * @returns {string} - The final HTML string with Emotion's styles.
     */
    public renderHTML(element: any) {
        // First, render the element to a string using uhtml's render method.
        const rawHtml = render(String, element);
        const cssText = extractCss();
        return `<style>{\`${cssText}\`}</style>${rawHtml}`
    }

    /**
     * Creates a generic HTML element.
     * @param tag - The HTML tag name (e.g., 'div', 'button', 'p')
     * @param props - An object of attributes and event listeners
     * @param children - Nested elements or text content
     * @returns A virtual DOM element
     */
    protected createElement(tag: string, props: Partial<string, any> = {}, ...children: any[]): HTMLElement {
        const content = this.flattenChildren(children);
        const attributes = Object.entries(props)
            .filter(([key, value]) => !(key.startsWith("on") && typeof value === "function")) // Exclude event handlers
            .map(([key, value]) => html` ${key}=\"${value}\" `);
        const onAttributes = Object.entries(props)
            .filter(([key, value]) => (key.startsWith("on") && typeof value === "function")) // Exclude event handlers
            .map(([key, value]) => html` ${key}={${value.toString()}} `);
        return html`<${tag} ${attributes} ${onAttributes}>${content}</${tag}>`
    }
}

export default DOM