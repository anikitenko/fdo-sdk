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

    test("flattenChildren should return a single child in an array", () => {
        const children = ["onlyChild"];
        const result = (dom as any).flattenChildren(children);

        expect(result).toStrictEqual(["onlyChild"]);
    });

    test("flattenChildren should handle empty arrays", () => {
        const children: any[] = [];
        const result = (dom as any).flattenChildren(children);

        expect(result).toEqual([]);
    });

    test("flattenChildren should filter out null and undefined but keep other falsy values", () => {
        const children = ["text", null, undefined, false, 0, ""];
        const result = (dom as any).flattenChildren(children);

        // The implementation filters out null and undefined but keeps other falsy values like false, 0, and ""
        expect(result).toEqual(["text", false, 0, ""]);
    });

    test("flattenChildren should handle complex nested structures", () => {
        const children = [
            [["level3"], [["level4"]]],
            null,
            [undefined, ["text"]],
            ["", 0, false]
        ];
        const result = (dom as any).flattenChildren(children);

        expect(result).toEqual(["level3", "level4", "text", "", 0, false]);
    });

    test("renderHTML should return HTML with extracted CSS", () => {
        const element = "<div>Hello</div>";
        const result = dom.renderHTML(element);

        // Verify extractCss was called to get the styles
        expect(extractCss).toHaveBeenCalled();

        // Check the structure of the output
        expect(result).toContain("<style>{\`mocked-css\`}</style>"); // Style tag with extracted CSS
        expect(result).toContain("<div>Hello</div>"); // Original element
        expect(result).toContain('<script id="plugin-script-placeholder" nonce="plugin-script-inject"></script>'); // Script placeholder

        // Verify the order of elements
        const styleIndex = result.indexOf("<style>");
        const elementIndex = result.indexOf("<div>");
        const scriptIndex = result.indexOf("<script");

        expect(styleIndex).toBeLessThan(elementIndex); // Style should come before the element
        expect(elementIndex).toBeLessThan(scriptIndex); // Element should come before the script

        // Verify the complete string
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

    test("createAttributes should handle boolean attributes correctly", () => {
        const props = { 
            checked: true, 
            disabled: false, 
            required: true,
            readonly: false,
            hidden: true,
            "data-custom": true
        };
        const attributes = (dom as any).createAttributes(props);

        expect(attributes).toContain("checked");
        expect(attributes).not.toContain("disabled");
        expect(attributes).toContain("required");
        expect(attributes).not.toContain("readonly");
        expect(attributes).toContain("hidden");
        expect(attributes).toContain(`data-custom="true"`); // Custom boolean attributes use string format
    });

    test("createOnAttributes should return only event handlers as stringified functions", () => {
        const mockClickHandler = jest.fn();
        const props = { onClick: mockClickHandler, onHover: jest.fn(), id: "test" };
        const eventAttributes = (dom as any).createOnAttributes(props);

        expect(eventAttributes).toContain(`onClick={${mockClickHandler.toString()}}`);
        expect(eventAttributes).toContain(`onHover={${props.onHover.toString()}}`);
        expect(eventAttributes).not.toContain("id");
    });

    test("createElement should create elements with various configurations", () => {
        // Test case 1: Element with both attributes and children
        const element1 = dom.createElement("div", { id: "test", "class": "box" }, "Content");
        expect(element1.toString()).toBe(`<div id="test" class="box">Content</div>`);

        // Test case 2: Element with no attributes
        const element2 = dom.createElement("span", {}, "Hello");
        expect(element2.toString()).toBe(`<span>Hello</span>`);

        // Test case 3: Element with event handler
        const element3 = dom.createElement("button", { onClick: () => {}}, "Content");
        expect(element3.toString()).toBe(`<button onClick={() => { }}>Content</button>`);

        // Test case 4: Element with both regular attributes and event handlers
        const element4 = dom.createElement("button", { onClick: () => {}, className: "mock"}, "Content");
        expect(element4.toString()).toBe(`<button className="mock" onClick={() => { }}>Content</button>`);
    });

    test("should create keyframe and return the generated class name", () => {
        const keyframeCSS = `
        from {
            color: red;
        }
        to {
            color: blue;
        }
        `;
        const keyframeClass = dom.createStyleKeyframe(keyframeCSS);

        // Verify the keyframes function was called
        const keyframesMock = require("goober").keyframes as jest.Mock;
        expect(keyframesMock).toHaveBeenCalled();

        // Verify the returned class name
        expect(keyframeClass).toBe("mocked-keyframe");
    });

    test("should create keyframe and use it in an element", () => {
        const keyframeCSS = `
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
        `;
        const keyframeClass = dom.createStyleKeyframe(keyframeCSS);

        // Use the keyframe class in an element
        const element = dom.createElement("button", { 
            onClick: () => {}, 
            className: keyframeClass
        }, "Content");

        // Verify the element has the keyframe class
        expect(element.toString()).toBe(`<button className="mocked-keyframe" onClick={() => { }}>Content</button>`);
    });

    test("should create keyframe with complex animation steps", () => {
        const complexKeyframe = `
        0% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 0.5; transform: scale(0.75); }
        100% { opacity: 1; transform: scale(1); }
        `;

        const keyframeClass = dom.createStyleKeyframe(complexKeyframe);

        // Verify the keyframes function was called
        const keyframesMock = require("goober").keyframes as jest.Mock;
        expect(keyframesMock).toHaveBeenCalled();
        expect(keyframeClass).toBe("mocked-keyframe");
    });

    test("createElement with no props or children (empty tag)", () => {
        const dom = new DOM(true);
        const result = dom.createElement("div");
        expect(result).toBe("<div />");
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
