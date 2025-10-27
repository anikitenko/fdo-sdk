import {DOM} from "./DOM";

export class DOMMedia extends DOM {
    /**
     * Creates a new DOMMedia instance.
     * @constructor - Creates a new DOMMedia instance for self-closing media elements.
     */
    constructor() {
        super(true); // Media elements like img are self-closing
    }

    /**
     * Creates an img element.
     * @param src - The source URL of the image.
     * @param alt - The alternative text for the image.
     * @param options - The options to apply to the image.
     * @param id - The id of the image.
     * @param otherProps - Additional properties like width, height, loading.
     * @returns {string} - The rendered img element.
     * @uiName Create image
     * @example <caption>Create an image with alt text and dimensions.</caption>
     * const img = new DOMMedia().createImage("/path/to/image.png", "Description", {}, undefined, { width: "300", height: "200", loading: "lazy" });
     */
    public createImage(
        src: string,
        alt: string,
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string,
        otherProps?: Record<string, any>
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("img", {...props, src, alt, ...otherProps});
    }
}
