import {DOMInput} from "../src";

describe("DOMInput", () => {
    let domInput: DOMInput;

    beforeEach(() => {
        jest.clearAllMocks();
        domInput = new DOMInput("input");
    });

    it("should be defined", () => {
        expect(domInput).toBeDefined();
    });

    it("should be an instance of DOMInput", () => {
        expect(domInput).toBeInstanceOf(DOMInput);
    });

    it("should crate an input", () => {
        const input = domInput.createInput("text");
        expect(input).toBe(`<input id="input" className="go11" type="text" />`)
    })

    it("should create an input with a value", () => {
        const withValue = new DOMInput("input", {}, {value: "value"})
        const input = withValue.createInput("text");
        expect(input).toBe(`<input id="input" className="go11" type="text" value="value" />`)
    })

    it("should create a textarea", () => {
        const textarea = domInput.createTextarea();
        expect(textarea).toBe(`<textarea id="input" className="go11" />`)
    })

    describe("createSelect", () => {
        it("should create a select element", () => {
            const option1 = new DOMInput("", {}).createOption("Option 1", "val1");
            const option2 = new DOMInput("", {}).createOption("Option 2", "val2");
            const select = new DOMInput("my-select", {}).createSelect([option1, option2]);
            expect(select).toContain("<select");
            expect(select).toContain("</select>");
            expect(select).toContain("Option 1");
            expect(select).toContain("Option 2");
        });

        it("should accept onChange handler", () => {
            const mockOnChange = () => {};
            const select = new DOMInput("my-select", {}).createSelect([], mockOnChange);
            expect(select).toContain("onChange");
        });

        it("should apply custom classes to select", () => {
            const select = new DOMInput("my-select", { classes: ["custom-select"] }).createSelect([]);
            expect(select).toContain("custom-select");
        });
    });

    describe("createOption", () => {
        it("should create an option element", () => {
            const option = new DOMInput("", {}).createOption("Label", "value1");
            expect(option).toContain("<option");
            expect(option).toContain("</option>");
            expect(option).toContain('value="value1"');
            expect(option).toContain("Label");
        });

        it("should mark option as selected", () => {
            const option = new DOMInput("", {}).createOption("Label", "value1", true);
            expect(option).toContain("selected");
        });

        it("should not mark option as selected by default", () => {
            const option = new DOMInput("", {}).createOption("Label", "value1");
            expect(option).not.toContain("selected");
        });

        it("should accept additional properties", () => {
            const option = new DOMInput("", {}).createOption("Label", "value1", false, { disabled: true });
            expect(option).toContain("disabled");
        });
    });

    describe("createOptgroup", () => {
        it("should create an optgroup element", () => {
            const option1 = new DOMInput("", {}).createOption("Sub 1", "val1");
            const option2 = new DOMInput("", {}).createOption("Sub 2", "val2");
            const optgroup = new DOMInput("", {}).createOptgroup("Group Label", [option1, option2]);
            expect(optgroup).toContain("<optgroup");
            expect(optgroup).toContain("</optgroup>");
            expect(optgroup).toContain('label="Group Label"');
            expect(optgroup).toContain("Sub 1");
            expect(optgroup).toContain("Sub 2");
        });

        it("should accept additional properties", () => {
            const optgroup = new DOMInput("", {}).createOptgroup("Group", [], { disabled: true });
            expect(optgroup).toContain("disabled");
        });
    });

    describe("integration - select with options", () => {
        it("should create a complete select dropdown", () => {
            const option1 = new DOMInput("", {}).createOption("Choose One", "", true);
            const option2 = new DOMInput("", {}).createOption("Option A", "a");
            const option3 = new DOMInput("", {}).createOption("Option B", "b");
            const select = new DOMInput("dropdown", {}).createSelect([option1, option2, option3]);
            
            expect(select).toContain("<select");
            expect(select).toContain("<option");
            expect(select).toContain("Choose One");
            expect(select).toContain("Option A");
            expect(select).toContain("Option B");
        });

        it("should create a select with optgroups", () => {
            const opt1 = new DOMInput("", {}).createOption("Item 1", "1");
            const opt2 = new DOMInput("", {}).createOption("Item 2", "2");
            const group1 = new DOMInput("", {}).createOptgroup("Group 1", [opt1, opt2]);
            
            const opt3 = new DOMInput("", {}).createOption("Item 3", "3");
            const opt4 = new DOMInput("", {}).createOption("Item 4", "4");
            const group2 = new DOMInput("", {}).createOptgroup("Group 2", [opt3, opt4]);
            
            const select = new DOMInput("grouped-select", {}).createSelect([group1, group2]);
            
            expect(select).toContain("<select");
            expect(select).toContain("<optgroup");
            expect(select).toContain('label="Group 1"');
            expect(select).toContain('label="Group 2"');
            expect(select).toContain("Item 1");
            expect(select).toContain("Item 4");
        });
    });
})
