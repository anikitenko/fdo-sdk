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

    it("should create a DOMNested instance", () => {
        const instance = new DOMNested();
        expect(instance).toBeInstanceOf(DOMNested);
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
    });

    it("should create block div with custom attributes", () => {
        const output = domNested.createBlockDiv(["test"], { classes: ["test-class"], customAttributes: { "data-testid": "block-div" } }, "test-id");
        expect(output).toContain(`data-testid="block-div"`);
        expect(output).toContain(`id="test-id"`);
        expect(output).toContain(`className=`);
    });

    it("should create list with custom attributes", () => {
        const output = domNested.createList(["test"], { classes: ["test-class"], customAttributes: { "data-testid": "list" } }, "test-id");
        expect(output).toContain(`data-testid="list"`);
        expect(output).toContain(`id="test-id"`);
        expect(output).toContain(`className=`);
    });

    it("should create fieldset with custom attributes", () => {
        const output = domNested.createFieldset(["test"], { classes: ["test-class"], customAttributes: { "data-testid": "fieldset" } }, "test-id");
        expect(output).toContain(`data-testid="fieldset"`);
        expect(output).toContain(`id="test-id"`);
        expect(output).toContain(`className=`);
    });

    it("should create legend with custom attributes", () => {
        const output = domNested.createLegend(["test"], { classes: ["test-class"], customAttributes: { "data-testid": "legend" } }, "test-id");
        expect(output).toContain(`data-testid="legend"`);
        expect(output).toContain(`id="test-id"`);
        expect(output).toContain(`className=`);
    });

    it("should create form with custom attributes", () => {
        const output = domNested.createForm(["test"], { classes: ["test-class"], customAttributes: { "data-testid": "form" } }, "test-id");
        expect(output).toContain(`data-testid="form"`);
        expect(output).toContain(`id="test-id"`);
        expect(output).toContain(`className=`);
    });

    it("should handle empty children arrays", () => {
        const output = domNested.createBlockDiv([]);
        expect(output).toContain("<div");
        expect(output).toContain("</div>");
    });

    it("should handle multiple custom attributes", () => {
        const output = domNested.createBlockDiv(
            ["test"], 
            { 
                customAttributes: { 
                    "data-testid": "block-div", 
                    "aria-label": "Test Div",
                    "data-value": "123"
                } 
            }, 
            "test-id"
        );
        expect(output).toContain(`data-testid="block-div"`);
        expect(output).toContain(`aria-label="Test Div"`);
        expect(output).toContain(`data-value="123"`);
    });

    describe("createOrderedList", () => {
        it("should create an ol element", () => {
            const child1 = domNested.createListItem(["First item"]);
            const child2 = domNested.createListItem(["Second item"]);
            const ol = domNested.createOrderedList([child1, child2]);
            expect(ol).toContain("<ol");
            expect(ol).toContain("</ol>");
            expect(ol).toContain("First item");
            expect(ol).toContain("Second item");
        });

        it("should apply custom classes to ordered list", () => {
            const ol = domNested.createOrderedList([], { classes: ["custom-ol"] });
            expect(ol).toContain("custom-ol");
        });

        it("should accept custom attributes on ordered list", () => {
            const ol = domNested.createOrderedList([], { customAttributes: { "data-test": "value" } });
            expect(ol).toContain('data-test="value"');
        });
    });

    describe("createDefinitionList", () => {
        it("should create a dl element", () => {
            const term = domNested.createDefinitionTerm(["API"]);
            const desc = domNested.createDefinitionDescription(["Application Programming Interface"]);
            const dl = domNested.createDefinitionList([term, desc]);
            expect(dl).toContain("<dl");
            expect(dl).toContain("</dl>");
            expect(dl).toContain("API");
            expect(dl).toContain("Application Programming Interface");
        });

        it("should apply custom classes to definition list", () => {
            const dl = domNested.createDefinitionList([], { classes: ["custom-dl"] });
            expect(dl).toContain("custom-dl");
        });
    });

    describe("createDefinitionTerm", () => {
        it("should create a dt element", () => {
            const dt = domNested.createDefinitionTerm(["Term"]);
            expect(dt).toContain("<dt");
            expect(dt).toContain("</dt>");
            expect(dt).toContain("Term");
        });

        it("should apply custom classes to definition term", () => {
            const dt = domNested.createDefinitionTerm(["Term"], { classes: ["custom-dt"] });
            expect(dt).toContain("custom-dt");
        });
    });

    describe("createDefinitionDescription", () => {
        it("should create a dd element", () => {
            const dd = domNested.createDefinitionDescription(["Description"]);
            expect(dd).toContain("<dd");
            expect(dd).toContain("</dd>");
            expect(dd).toContain("Description");
        });

        it("should apply custom classes to definition description", () => {
            const dd = domNested.createDefinitionDescription(["Description"], { classes: ["custom-dd"] });
            expect(dd).toContain("custom-dd");
        });
    });

    describe("integration - new list types", () => {
        it("should create a complete ordered list structure", () => {
            const item1 = domNested.createListItem(["Step 1"]);
            const item2 = domNested.createListItem(["Step 2"]);
            const item3 = domNested.createListItem(["Step 3"]);
            const ol = domNested.createOrderedList([item1, item2, item3]);
            
            expect(ol).toContain("<ol");
            expect(ol).toContain("<li");
            expect(ol).toContain("Step 1");
            expect(ol).toContain("Step 2");
            expect(ol).toContain("Step 3");
        });

        it("should create a complete definition list structure", () => {
            const term1 = domNested.createDefinitionTerm(["HTML"]);
            const desc1 = domNested.createDefinitionDescription(["HyperText Markup Language"]);
            const term2 = domNested.createDefinitionTerm(["CSS"]);
            const desc2 = domNested.createDefinitionDescription(["Cascading Style Sheets"]);
            const dl = domNested.createDefinitionList([term1, desc1, term2, desc2]);
            
            expect(dl).toContain("<dl");
            expect(dl).toContain("<dt");
            expect(dl).toContain("<dd");
            expect(dl).toContain("HTML");
            expect(dl).toContain("HyperText Markup Language");
            expect(dl).toContain("CSS");
            expect(dl).toContain("Cascading Style Sheets");
        });
    });
})
