import {DOMSemantic} from "../src";

describe("DOMSemantic", () => {
    let domSemantic: DOMSemantic;

    beforeEach(() => {
        jest.clearAllMocks();
        domSemantic = new DOMSemantic();
    });

    it("should be defined", () => {
        expect(domSemantic).toBeDefined();
    });

    describe("createArticle", () => {
        it("should create an article element", () => {
            const article = domSemantic.createArticle(["<h2>Title</h2>"]);
            expect(article).toContain("<article");
            expect(article).toContain("</article>");
            expect(article).toContain("<h2>Title</h2>");
        });

        it("should apply custom classes", () => {
            const article = domSemantic.createArticle([], { classes: ["custom-article"] });
            expect(article).toContain("custom-article");
        });
    });

    describe("createSection", () => {
        it("should create a section element", () => {
            const section = domSemantic.createSection(["<p>Content</p>"]);
            expect(section).toContain("<section");
            expect(section).toContain("</section>");
            expect(section).toContain("<p>Content</p>");
        });
    });

    describe("createNav", () => {
        it("should create a nav element", () => {
            const nav = domSemantic.createNav(["<a href='/'>Home</a>"]);
            expect(nav).toContain("<nav");
            expect(nav).toContain("</nav>");
            expect(nav).toContain("<a href='/'>Home</a>");
        });
    });

    describe("createHeader", () => {
        it("should create a header element", () => {
            const header = domSemantic.createHeader(["<h1>Site Title</h1>"]);
            expect(header).toContain("<header");
            expect(header).toContain("</header>");
            expect(header).toContain("<h1>Site Title</h1>");
        });
    });

    describe("createFooter", () => {
        it("should create a footer element", () => {
            const footer = domSemantic.createFooter(["<p>&copy; 2025</p>"]);
            expect(footer).toContain("<footer");
            expect(footer).toContain("</footer>");
            expect(footer).toContain("<p>&copy; 2025</p>");
        });
    });

    describe("createAside", () => {
        it("should create an aside element", () => {
            const aside = domSemantic.createAside(["<h3>Sidebar</h3>"]);
            expect(aside).toContain("<aside");
            expect(aside).toContain("</aside>");
            expect(aside).toContain("<h3>Sidebar</h3>");
        });
    });

    describe("createMain", () => {
        it("should create a main element", () => {
            const main = domSemantic.createMain(["<article>Content</article>"]);
            expect(main).toContain("<main");
            expect(main).toContain("</main>");
            expect(main).toContain("<article>Content</article>");
        });
    });

    describe("integration", () => {
        it("should create a complete semantic page structure", () => {
            const header = domSemantic.createHeader(["<h1>Title</h1>"]);
            const nav = domSemantic.createNav(["<a href='/'>Home</a>"]);
            const article = domSemantic.createArticle(["<p>Article content</p>"]);
            const aside = domSemantic.createAside(["<p>Sidebar</p>"]);
            const footer = domSemantic.createFooter(["<p>Footer</p>"]);

            expect(header).toContain("<header");
            expect(nav).toContain("<nav");
            expect(article).toContain("<article");
            expect(aside).toContain("<aside");
            expect(footer).toContain("<footer");
        });

        it("should accept custom attributes on all elements", () => {
            const section = domSemantic.createSection([], { customAttributes: { "data-test": "value" } });
            expect(section).toContain('data-test="value"');
        });
    });
});
