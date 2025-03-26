import {DOMLink} from "../src";

describe("DOMLink", () => {
    let domLink: DOMLink;

    beforeEach(() => {
        jest.clearAllMocks();
        domLink = new DOMLink("link");
    });

    it("should be defined", () => {
        expect(domLink).toBeDefined();
    });

    it("should create a link", () => {
        const link = domLink.createLink("test", "https://google.com");
        expect(link).toBe(`<a id="link" className="go11" href="https://google.com">test</a>`)
    });

    it("should create a link with a class", () => {
        domLink = new DOMLink("link", {classes: ["test-class"]});
        const link = domLink.createLink("test", "https://google.com");
        expect(link).toBe(`<a id="link" className="test-class go11" href="https://google.com">test</a>`)
    });

    it("should create a link with a class and an id and a target", () => {
        domLink = new DOMLink("link", {classes: ["test-class"]}, {target: "_blank"});
        const link = domLink.createLink("test", "https://google.com");
        expect(link).toBe(`<a id="link" className="test-class go11" href="https://google.com" target="_blank">test</a>`)
    });

    it("should create a link with a class and an id and a target and a rel", () => {
        domLink = new DOMLink("link", {classes: ["test-class"]}, {target: "_blank", rel: "noopener"});
        const link = domLink.createLink("test", "https://google.com");
        expect(link).toBe(`<a id="link" className="test-class go11" href="https://google.com" target="_blank" rel="noopener">test</a>`)
    });

    it("should create a link with a class and an id and a target and a rel and a title", () => {
        domLink = new DOMLink("link", {classes: ["test-class"]}, {target: "_blank", rel: "noopener", title: "test-title"});
        const link = domLink.createLink("test", "https://google.com");
        expect(link).toBe(`<a id="link" className="test-class go11" href="https://google.com" target="_blank" rel="noopener" title="test-title">test</a>`)
    });
})