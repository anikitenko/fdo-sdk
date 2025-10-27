import {DOMMedia} from "../src";

describe("DOMMedia", () => {
    let domMedia: DOMMedia;

    beforeEach(() => {
        jest.clearAllMocks();
        domMedia = new DOMMedia();
    });

    it("should be defined", () => {
        expect(domMedia).toBeDefined();
    });

    describe("createImage", () => {
        it("should create an img element with src and alt", () => {
            const img = domMedia.createImage("/path/to/image.png", "Description");
            expect(img).toContain("<img");
            expect(img).toContain('src="/path/to/image.png"');
            expect(img).toContain('alt="Description"');
            expect(img).toContain(" />");
        });

        it("should apply custom classes and styles", () => {
            const img = domMedia.createImage("/image.png", "Alt text", { classes: ["custom-img"] });
            expect(img).toContain("custom-img");
        });

        it("should accept width and height attributes", () => {
            const img = domMedia.createImage("/image.png", "Alt text", {}, undefined, { width: "300", height: "200" });
            expect(img).toContain('width="300"');
            expect(img).toContain('height="200"');
        });

        it("should accept loading attribute", () => {
            const img = domMedia.createImage("/image.png", "Alt text", {}, undefined, { loading: "lazy" });
            expect(img).toContain('loading="lazy"');
        });

        it("should be self-closing", () => {
            const img = domMedia.createImage("/image.png", "Alt text");
            expect(img).toContain(" />");
            expect(img).not.toContain("</img>");
        });

        it("should accept custom attributes", () => {
            const img = domMedia.createImage("/image.png", "Alt text", { customAttributes: { "data-test": "value" } });
            expect(img).toContain('data-test="value"');
        });
    });
});
