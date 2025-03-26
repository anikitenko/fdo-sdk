import {DOMText} from "../src";

describe("DOMText", () => {
    let domText: DOMText;

    beforeEach(() => {
        jest.clearAllMocks();
        domText = new DOMText();
    });

    it("should be defined", () => {
        expect(domText).toBeDefined();
    });

    it("should create a blockquote", () => {
        const blockquote = domText.createBlockQuoteText("Hello World", {}, "hello");
        expect(blockquote).toBe(`<blockquote id="hello" className="go11">Hello World</blockquote>`);
    })

    it("should create a code", () => {
        const code = domText.createCodeText("Hello World", {}, "hello");
        expect(code).toBe(`<code id="hello" className="go11">Hello World</code>`);
    })

    it("should create a div", () => {
        const div = domText.createDivText("Hello World", {}, "hello");
        expect(div).toBe(`<div id="hello" className="go11">Hello World</div>`);
    })

    it("should create a h1", () => {
        const h1 = domText.createHText(1, "Hello World", {}, "hello");
        expect(h1).toBe(`<h1 id="hello" className="go11">Hello World</h1>`);
    })

    it("should create a h2", () => {
        const h2 = domText.createHText(2, "Hello World", {}, "hello");
        expect(h2).toBe(`<h2 id="hello" className="go11">Hello World</h2>`);
    })

    it("should create a h3", () => {
        const h3 = domText.createHText(3, "Hello World", {}, "hello");
        expect(h3).toBe(`<h3 id="hello" className="go11">Hello World</h3>`);
    })

    it("should create a h4", () => {
        const h4 = domText.createHText(4, "Hello World", {}, "hello");
        expect(h4).toBe(`<h4 id="hello" className="go11">Hello World</h4>`);
    })

    it("should create a h5", () => {
        const h5 = domText.createHText(5, "Hello World", {}, "hello");
        expect(h5).toBe(`<h5 id="hello" className="go11">Hello World</h5>`);
    })

    it("should create a h6", () => {
        const h6 = domText.createHText(6, "Hello World", {}, "hello");
        expect(h6).toBe(`<h6 id="hello" className="go11">Hello World</h6>`);
    })

    it("should create a p", () => {
        const p = domText.createPText("Hello World", {}, "hello");
        expect(p).toBe(`<p id="hello" className="go11">Hello World</p>`);
    })

    it("should create a span", () => {
        const span = domText.createSpanText("Hello World", {}, "hello");
        expect(span).toBe(`<span id="hello" className="go11">Hello World</span>`);
    })

    it("should create a strong", () => {
        const strong = domText.createStrongText("Hello World", {}, "hello");
        expect(strong).toBe(`<strong id="hello" className="go11">Hello World</strong>`);
    })

    it("should create a text", () => {
        const text = domText.createText("Hello World", {}, "hello");
        expect(text).toBe(`<span id="hello" className="go11">Hello World</span>`);
    })

    it("should create a text with auto assigned id", () => {
        const text = domText.createText("Hello World", {});
        expect(text).toContain("id")
    })

    it("should create a label", () => {
        const label = domText.createLabelText("Hello World", "test", {}, "hello");
        expect(label).toBe(`<label id="hello" className="go11" htmlFor="test">Hello World</label>`);
    })

    it("should create an em", () => {
        const em = domText.createEmText("Hello World", {}, "hello");
        expect(em).toBe(`<em id="hello" className="go11">Hello World</em>`);
    })

    it("should create an i", () => {
        const i = domText.createIText("Hello World", {}, "hello");
        expect(i).toBe(`<i id="hello" className="go11">Hello World</i>`);
    })

    it("should create an u", () => {
        const u = domText.createUText("Hello World", {}, "hello");
        expect(u).toBe(`<u id="hello" className="go11">Hello World</u>`);
    })

    it("should create an s", () => {
        const s = domText.createSText("Hello World", {}, "hello");
        expect(s).toBe(`<s id="hello" className="go11">Hello World</s>`);
    })

    it("should create an abbr", () => {
        const abbr = domText.createAbbrText("Hello", "Hello World", {}, "hello");
        expect(abbr).toBe(`<abbr id="hello" className="go11" title="Hello World">Hello</abbr>`);
    })

    it("should create an abbr with no title", () => {
        const abbr = domText.createAbbrText("Hello", "", {}, "hello");
        expect(abbr).toBe(`<abbr id="hello" className="go11" title="">Hello</abbr>`);
    })

    it("should create a bold text", () => {
        const bold = domText.createBText("Hello World", {}, "hello");
        expect(bold).toBe(`<b id="hello" className="go11">Hello World</b>`);
    })

    it("should create a cite text", () => {
        const cite = domText.createCiteText("Hello World", {}, "hello");
        expect(cite).toBe(`<cite id="hello" className="go11">Hello World</cite>`);
    })

    it("should create a pre text", () => {
        const pre = domText.createPreText("Hello World", {}, "hello");
        expect(pre).toBe(`<pre id="hello" className="go11">Hello World</pre>`);
    })

    it("should create a ins text", () => {
        const ins = domText.createInsText("Hello World", {}, "hello");
        expect(ins).toBe(`<ins id="hello" className="go11">Hello World</ins>`);
    })

    it("should create a kbd text", () => {
        const kbd = domText.createKbdText("Hello World", {}, "hello");
        expect(kbd).toBe(`<kbd id="hello" className="go11">Hello World</kbd>`);
    })

    it("should create a mark text", () => {
        const mark = domText.createMarkText("Hello World", {}, "hello");
        expect(mark).toBe(`<mark id="hello" className="go11">Hello World</mark>`);
    })

    it("should create a small text", () => {
        const small = domText.createSmallText("Hello World", {}, "hello");
        expect(small).toBe(`<small id="hello" className="go11">Hello World</small>`);
    })

    test("createTextElement with no options and defaultClass fallback", () => {
        const result = (domText as any).createTextElement("span", "Hello");
        expect(result).toContain("<span");
    });

    test("createTextElement with empty options object", () => {
        const result = (domText as any).createTextElement("span", "Text", undefined, {}, false, "text-class");
        expect(result).toContain("class");
    });

    test("createTextElement with disableDefaultClass true in options", () => {
        const result = (domText as any).createTextElement("div", "Yo", undefined, { disableDefaultClass: true }, false, "bp-divider");
        expect(result).not.toContain("bp-divider");
    });

    test("createTextElement with disableDefaultClassOpt true", () => {
        const result = (domText as any).createTextElement("div", "Yo", undefined, {}, true, "bp-divider");
        expect(result).not.toContain("bp-divider");
    });

    test("createTextElement with extraProps", () => {
        const result = (domText as any).createTextElement("p", "Extra", undefined, {}, false, "text-class", { role: "status" });
        expect(result).toContain('role="status"');
    });

    test("createTextElement with options explicitly undefined", () => {
        const result = (domText as any).createTextElement("span", "Hi", undefined, undefined, false, "default-class");
        expect(result).toContain("default-class");
    });

    it("should run createTextElement with undefined options", () => {
        const output = (domText as any).createTextElement("div", "Hello", undefined, undefined, false, "class-a");
        expect(output).toContain("class-a");
    });

    it("should run createTextElement with empty options object", () => {
        const output = (domText as any).createTextElement("div", "Hello", undefined, {}, false, "class-b");
        expect(output).toContain("class-b");
    });

})