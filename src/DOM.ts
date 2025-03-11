export class DOM {
    // Define a private static readonly type reference for UI options
    protected static readonly DEFAULT_OPTIONS = {
        blueprintClasses: [] as string[],
        style: {} as Record<string, string>,
        disableDefaultClass: false,
    };
    private static css: any
    private static html: any
    private static render: any

    constructor() {
        this.setupImports()
    }

    private setupImports() {
        import("@emotion/css").then((mod) => {
            DOM.css = mod.css;
        });
        import("lighterhtml").then((mod) => {
            DOM.html = mod.html;
            DOM.render = mod.render;
        });
    }

    /**
     * Handles merging options with defaults
     */
    protected mergeOptions(userOptions?: Partial<typeof DOM.DEFAULT_OPTIONS>) {
        return { ...DOM.DEFAULT_OPTIONS, ...userOptions };
    }

    public createStyle(styleObj: Record<string, string>) {
        return DOM.css(styleObj);
    }

    /**
     * Creates a generic HTML element.
     * @param tag - The HTML tag name (e.g., 'div', 'button', 'p')
     * @param props - An object of attributes and event listeners
     * @param children - Nested elements or text content
     * @returns A virtual DOM element
     */
    public createElement(tag: string, props: Record<string, any> = {}, ...children: any[]) {
        return DOM.html`
            <${tag} ...${props}>${children}</${tag}>`;
    }

    /**
     * Mounts a component to the DOM.
     * @param target - The HTML element where the component will be rendered
     * @param component - The component to be mounted
     */
    public mount(target: HTMLElement, component: any) {
        DOM.render(target, component);
    }
}

export default DOM