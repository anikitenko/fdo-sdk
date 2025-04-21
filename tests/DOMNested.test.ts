import {DOMNested, DOMButton, DOMText} from "../src";

describe("DOMNested", () => {
    let domNested: DOMNested;
    let domButton: DOMButton;
    let domText: DOMText;

    beforeEach(() => {
        jest.clearAllMocks();
        domNested = new DOMNested();
        domButton = new DOMButton();
        domText = new DOMText();
    });

    it("should be defined", () => {
        expect(domNested).toBeDefined();
    });

    it("should create a div element with nested button", () => {
        const mockOnClick = () => {};
        const label = "Click Me";
        const options = { classes: ["custom-class"] };

        const button = domButton.createButton(label, mockOnClick, options, "test-button");
        const text = domText.createHText(1, "Hello World", {}, "test-text");
        const nested = domNested.createBlockDiv([button, text], {}, "test-div");

        expect(nested.toString()).toBe(`<div id="test-div" className="go11"><button id="test-button" className="pure-button custom-class go11" onClick={() => { }}>Click Me</button><h1 id="test-text" className="go11">Hello World</h1></div>`);
    });

    test("createBlockDiv with no options", () => {
        const output = domNested.createBlockDiv(["Hello"]);
        expect(output).toContain("<div");
    });

    test("createBlockDiv with custom options", () => {
        const output = domNested.createBlockDiv(["World"], { disableDefaultClass: true });
        expect(output).toContain("<div");
    });

    it("should create a ul element with li child", () => {
        const child1 = domNested.createListItem(["Hello"], {}, "hello");
        const child2 = domNested.createListItem(["World"], {}, "world");
        const list = domNested.createList([child1, child2], {}, "list");
        expect(list.toString()).toBe(`<ul id="list" className="go11"><li id="hello" className="go11">Hello</li><li id="world" className="go11">World</li></ul>`);
    });

    test("ul element with no options", () => {
        const output = domNested.createList(["li"]);
        expect(output).toContain("<ul");
    });

    test("ul element with custom options", () => {
        const output = domNested.createList(["li"], { disableDefaultClass: true });
        expect(output).toContain("<ul");
    });

    test("li element with no options", () => {
        const output = domNested.createListItem(["test"]);
        expect(output).toContain("<li");
    });

    test("li element with custom options", () => {
        const output = domNested.createListItem(["test"], { disableDefaultClass: true });
        expect(output).toContain("<li");
    });

    it("should create a fieldset", () => {
        const legend = domNested.createLegend(["Legend"], {}, "legend");
        const fieldset = domNested.createFieldset([legend], {}, "fieldset");
        expect(fieldset.toString()).toBe(`<fieldset id="fieldset" className="go11"><legend id="legend" className="go11">Legend</legend></fieldset>`);
    });

    test("fieldset element with no options", () => {
        const output = domNested.createFieldset(["test"]);
        expect(output).toContain("<fieldset");
    });

    test("fieldset element with custom options", () => {
        const output = domNested.createFieldset(["test"], { disableDefaultClass: true });
        expect(output).toContain("<fieldset");
    });

    test("legend element with no options", () => {
        const output = domNested.createLegend(["test"]);
        expect(output).toContain("<legend");
    });

    test("legend element with custom options", () => {
        const output = domNested.createLegend(["test"], { disableDefaultClass: true });
        expect(output).toContain("<legend");
    });

    it("should create a form", () => {
        const form = domNested.createForm([], {}, "form");
        expect(form.toString()).toBe(`<form id="form" className="go11"></form>`);
    })

    test("form element with no options", () => {
        const output = domNested.createForm([]);
        expect(output).toContain("<form");
    });

    test("form element with custom options", () => {
        const output = domNested.createForm([], { disableDefaultClass: true });
        expect(output).toContain("<form");
    });

    it("should create list item with custom attributes", () => {
        const output = domNested.createListItem(["test"], { classes: ["test-class"], customAttributes: { "data-static": "true" } }, "test-id");
        expect(output).toContain(`data-static="true"`);
    })

})