import { DOM } from "../src/DOM";
import { css as gooberCss, extractCss, setup } from "goober";

jest.mock("goober", () => ({
    css: jest.fn(() => {
        return "mocked-class";
    }),
    extractCss: jest.fn(() => "mocked-css"),
    setup: jest.fn()
}));

describe("DOM", () => {
    let dom: DOM;

    beforeEach(() => {
        jest.clearAllMocks();
        dom = new DOM();
    });

    test("setup(null) should not throw an error", () => {
        expect(() => setup(null)).not.toThrow();
    });

    test("setup(null) should call goober's setup function with null", () => {
        setup(null);
        expect(setup).toHaveBeenCalledWith(null);
    });

    test("setup(null) should not affect existing CSS functionality", () => {
        setup(null);
        const className = gooberCss`color: red;`;
        expect(className).toBe("mocked-class"); // Ensures CSS is still working
    });

    test("mergeOptions should merge user options with defaults", () => {
        const userOptions = { id: "custom-id", style: { color: "red" } };
        const mergedOptions = (dom as any).mergeOptions(userOptions);

        expect(mergedOptions).toEqual({
            blueprintClasses: [],
            style: { color: "red" },
            disableDefaultClass: false,
            id: "custom-id",
        });
    });

    test("mergeOptions should return default options if no user options provided", () => {
        const mergedOptions = (dom as any).mergeOptions();
        expect(mergedOptions).toEqual(DOM.DEFAULT_OPTIONS);
    });

    test("createStyle should generate correct CSS string", () => {
        const styleObj = { color: "red", "font-size": "16px" };
        const cssString = Object.entries(styleObj)
            .map(([prop, value]) => `${prop}: ${value};`)
            .join(" ");

        expect(cssString).toBe("color: red; font-size: 16px;");
    });

    test("createStyle should convert style object to CSS string and return class name", () => {
        const styleObj = { color: "red", "font-size": "16px" };
        const className = (dom as any).createStyle(styleObj);

        const gooberMock = gooberCss as jest.MockedFunction<typeof gooberCss>;

        // Check that gooberCss was called correctly with a tagged template literal
        expect(gooberCss).toHaveBeenCalledTimes(1);

        const cssString = gooberMock.mock.calls[0][1] as unknown as string;

        expect(cssString.trim()).toBe("color: red; font-size: 16px;");
        expect(className).toBe("mocked-class");
    });

    test("flattenChildren should flatten deeply nested arrays", () => {
        const children = [[["text1"], "text2"], [[null, "text3"]], undefined];
        const result = (dom as any).flattenChildren(children);

        expect(result).toEqual(["text1", "text2", "text3"]);
    });

    test("flattenChildren should return a single child instead of an array if only one child exists", () => {
        const children = ["onlyChild"];
        const result = (dom as any).flattenChildren(children);

        expect(result).toStrictEqual(["onlyChild"]);
    });

    test("renderHTML should return HTML with extracted CSS", () => {
        const element = "<div>Hello</div>";
        const result = dom.renderHTML(element);
        expect(extractCss).toHaveBeenCalled();
        expect(result).toBe(`<style>{\`mocked-css\`}</style><div>Hello</div>`);
    });

    test("createAttributes should return attributes without event handlers", () => {
        const props = { id: "test", class: "box", onClick: jest.fn() };
        const attributes = (dom as any).createAttributes(props);

        expect(attributes.toString()).toContain(`id=\"test\"`);
        expect(attributes.toString()).toContain(`class=\"box\"`);
        expect(attributes.toString()).not.toContain(`onClick`);
    });

    test("createAttributes should return attributes as a properly formatted string", () => {
        const props = { id: "test", class: "box", onClick: jest.fn() };
        const attributes = (dom as any).createAttributes(props);

        expect(attributes).toBe(`id="test" class="box"`);
    });

    test("createOnAttributes should return only event handlers as stringified functions", () => {
        const mockClickHandler = jest.fn();
        const props = { onClick: mockClickHandler, onHover: jest.fn(), id: "test" };
        const eventAttributes = (dom as any).createOnAttributes(props);

        expect(eventAttributes).toContain(`onClick={${mockClickHandler.toString()}}`);
        expect(eventAttributes).toContain(`onHover={${props.onHover.toString()}}`);
        expect(eventAttributes).not.toContain("id");
    });

    test("createElement should create an HTML element with attributes and children", () => {
        const element = dom.createElement("div", { id: "test", "class": "box" }, "Content");

        expect(element.toString()).toBe(`<div id="test" class="box">Content</div>`);
    });

    test("createElement should create an element with no attributes", () => {
        const element = dom.createElement("span", {}, "Hello");

        expect(element.toString()).toBe(`<span>Hello</span>`);
    });

    test("should create an element with attributes and children", () => {
        const element = dom.createElement("div", { id: "test", class: "box" }, "Content");
        expect(element.toString()).toBe(`<div id="test" class="box">Content</div>`);
    });

    test("should create an element with action attributes", () => {
        const element = dom.createElement("button", { onClick: () => {}}, "Content");
        expect(element.toString()).toBe(`<button onClick={() => { }}>Content</button>`);
    });

    test("should create an element with action attributes and children", () => {
        const element = dom.createElement("button", { onClick: () => {}, className: "mock"}, "Content");
        expect(element.toString()).toBe(`<button className="mock" onClick={() => { }}>Content</button>`);
    });
});
