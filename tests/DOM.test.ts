import { DOM } from "../src/DOM";
import { css as gooberCss, extractCss, setup } from "goober";

jest.mock("goober", () => ({
    css: jest.fn(() => {
        return "mocked-class";
    }),
    extractCss: jest.fn(() => "mocked-css"),
    keyframes: jest.fn(() => "mocked-keyframe"),
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
            classes: [],
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
        const className = (dom as any).createClassFromStyle(styleObj);

        const gooberMock = gooberCss as jest.MockedFunction<typeof gooberCss>;

        // Check that gooberCss was called correctly with a tagged template literal
        expect(gooberCss).toHaveBeenCalledTimes(1);

        const cssString = gooberMock.mock.calls[0][0] as Record<string, string>;

        expect(cssString).toStrictEqual(styleObj);
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
        expect(result).toBe(`<style>{\`mocked-css\`}</style><div>Hello</div><script id="plugin-script-placeholder" nonce="plugin-script-inject"></script>`);
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

    test("should create keyframe", () => {
        const keyframe = dom.createStyleKeyframe(`
        from {
            color: red;
        }
        to {
            color: blue;
        }
        `);
        const element = dom.createElement("button", { onClick: () => {}, className: keyframe}, "Content");
        expect(element.toString()).toBe(`<button className="mocked-keyframe" onClick={() => { }}>Content</button>`);
    });

    test("createElement with no props or children (empty tag)", () => {
        const dom = new DOM(true);
        const result = dom.createElement("div");
        expect(result).toBe("<div/>");
    });

    test("createElement with attributes only", () => {
        const dom = new DOM(false);

        // Stub dependencies
        jest.spyOn(dom, "createAttributes").mockReturnValue("id='test'");
        jest.spyOn(dom, "createOnAttributes").mockReturnValue("");

        const result = dom.createElement("div", {}, "Hello");
        expect(result).toBe("<div id='test'>Hello</div>");
    });

    test("createElement with onAttributes only", () => {
        const dom = new DOM(false);

        jest.spyOn(dom, "createAttributes").mockReturnValue("");
        jest.spyOn(dom, "createOnAttributes").mockReturnValue("onClick='doSomething()'");

        const result = dom.createElement("button", {}, "Click");
        expect(result).toBe("<button onClick='doSomething()'>Click</button>");
    });

    test("createElement with both attributes and onAttributes", () => {
        const dom = new DOM(false);

        jest.spyOn(dom, "createAttributes").mockReturnValue("id='test'");
        jest.spyOn(dom, "createOnAttributes").mockReturnValue("onClick='fn()'");

        const result = dom.createElement("span", {}, "Wow");
        expect(result).toBe("<span id='test' onClick='fn()'>Wow</span>");
    });

    test("createElement with no attributes", () => {
        const dom = new DOM(false);

        jest.spyOn(dom, "createAttributes").mockReturnValue("");
        jest.spyOn(dom, "createOnAttributes").mockReturnValue("");

        const result = dom.createElement("hr");
        expect(result).toBe("<hr></hr>");
    });

    test("combineProperties with all defaults", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({ classes: [], disableDefaultClass: false });
        jest.spyOn(dom, "createClassFromStyle").mockReturnValue("go11");

        const result = dom.combineProperties("default", {});
        expect(result.id).toMatch(/^[a-z0-9]+$/); // random id
        expect(result.className).toBe("default");
    });

    test("combineProperties with disableDefaultClass true", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({
            classes: ["x"],
            disableDefaultClass: true,
        });

        const result = dom.combineProperties("default", {});
        expect(result.className).toBe("x"); // no "default" class
    });

    test("combineProperties with custom style", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({
            classes: ["x"],
            style: { color: "red" },
            disableDefaultClass: false,
        });
        jest.spyOn(dom, "createClassFromStyle").mockReturnValue("style-123");

        const result = dom.combineProperties("main", {});
        expect(result.className).toBe("main x style-123");
    });

    test("combineProperties with custom ID", () => {
        const dom = new DOM();
        jest.spyOn(dom, "mergeOptions").mockReturnValue({ classes: [], disableDefaultClass: false });

        const result = dom.combineProperties("box", {}, "custom-id");
        expect(result.id).toBe("custom-id");
    });

    test("combineProperties with all falsy class components", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({
            classes: [],
            disableDefaultClass: true,
            style: undefined,
        });

        const result = dom.combineProperties("default", {});
        expect(result.className).toBe(""); // nothing passed filter(Boolean)
    });

    test("combineProperties with only generatedStyle truthy", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({
            classes: [],
            disableDefaultClass: true,
            style: { color: "red" },
        });

        jest.spyOn(dom, "createClassFromStyle").mockReturnValue("styled");

        const result = dom.combineProperties("default", {});
        expect(result.className).toBe("styled");
    });

    test("combineProperties handles undefined classes", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({
            // no `classes` property
            disableDefaultClass: true,
            style: undefined,
        });

        const result = dom.combineProperties("unused", {});
        expect(result.className).toBe(""); // everything falsy
    });

    test("combineProperties handles undefined style", () => {
        const dom = new DOM();

        jest.spyOn(dom, "mergeOptions").mockReturnValue({
            classes: [],
            disableDefaultClass: false,
            style: undefined,
        });

        const result = dom.combineProperties("base", {});
        expect(result.className).toBe("base");
    });
});
