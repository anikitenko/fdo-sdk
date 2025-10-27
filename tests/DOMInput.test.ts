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

    describe("style and class handling", () => {
        it("should handle custom styles", () => {
            const select = new DOMInput("test-id", {
                style: {
                    color: 'red',
                    backgroundColor: 'blue'
                }
            }).createSelect([]);
            expect(select).toMatch(/className="[^"]*go[^"]*"/);
        });

        it("should handle custom classes", () => {
            const select = new DOMInput("test-id", {
                classes: ['custom-class-1', 'custom-class-2']
            }).createSelect([]);
            expect(select).toContain('custom-class-1 custom-class-2');
        });

        it("should handle both custom styles and classes", () => {
            const select = new DOMInput("test-id", {
                style: { color: 'red' },
                classes: ['custom-class']
            }).createSelect([]);
            expect(select).toContain('custom-class');
            expect(select).toMatch(/className="[^"]*go[^"]*"/);
        });

        it("should handle disabled default class", () => {
            const select = new DOMInput("test-id", {
                disableDefaultClass: true,
                classes: ['custom-class']
            }).createSelect([]);
            expect(select).toContain('custom-class');
            expect(select).not.toContain('go11');
        });
    });

    describe("createSelect", () => {
        describe("attribute combinations", () => {
            it("should create a select with neither attributes nor onChange", () => {
                // We can't really get a select with no attributes since DOM base class adds some,
                // but we can verify that it doesn't have onChange
                const select = new DOMInput("", {}, {}).createSelect([]);
                expect(select).not.toContain('onChange=');
            });

            it("should create a select with only regular attributes", () => {
                const select = new DOMInput("test-id", {}, { 'data-testid': 'test' }).createSelect([]);
                expect(select).toContain('data-testid="test"');
                expect(select).not.toContain('onChange=');
            });

            it("should create a select with only onChange handler", () => {
                const mockOnChange = () => {};
                const select = new DOMInput("", {}, {}).createSelect([], mockOnChange);
                expect(select).toContain('onChange=');
            });

            it("should create a select with both regular attributes and onChange", () => {
                const mockOnChange = () => {};
                const select = new DOMInput("test-id", {}, { 'data-testid': 'test' })
                    .createSelect([], mockOnChange);
                expect(select).toContain('data-testid="test"');
                expect(select).toContain('onChange=');
            });

            it("should merge props correctly with onChange", () => {
                const mockOnChange = () => {};
                const select = new DOMInput("test-id", {}, { 
                    required: true,
                    'aria-label': 'Select option'
                }).createSelect([], mockOnChange);
                expect(select).toContain('required');
                expect(select).toContain('aria-label="Select option"');
                expect(select).toContain('onChange=');
            });

            it("should handle undefined props with onChange", () => {
                const mockOnChange = () => {};
                const select = new DOMInput("test-id").createSelect([], mockOnChange);
                expect(select).toContain('onChange=');
            });

            it("should handle empty options object", () => {
                const select = new DOMInput("test-id", {}, undefined).createSelect([]);
                expect(select).toContain('id="test-id"');
            });

            it("should handle boolean attributes correctly", () => {
                const select = new DOMInput("test-id", {}, {
                    required: true,
                    disabled: false,
                    multiple: true,
                    'data-boolean': true,  // custom boolean-like attribute
                    open: false
                }).createSelect([]);
                
                // Standard boolean attributes
                expect(select).toContain('required'); // true -> attribute present without value
                expect(select).toContain('multiple'); // true -> attribute present without value
                expect(select).not.toContain('disabled'); // false -> attribute omitted
                expect(select).not.toContain('open'); // false -> attribute omitted
                
                // Custom boolean-like attribute
                expect(select).toContain('data-boolean="true"'); // non-standard -> value included
            });

            it("should handle mixed attribute types", () => {
                const mockOnChange = () => {};
                const select = new DOMInput("test-id", {}, {
                    required: true,
                    'aria-required': "true",
                    'data-custom': true,
                    selected: false,
                    placeholder: "Choose an option",
                }).createSelect([], mockOnChange);
                
                // Standard boolean
                expect(select).toContain('required');
                expect(select).not.toContain('selected');
                
                // String attributes
                expect(select).toContain('aria-required="true"');
                expect(select).toContain('placeholder="Choose an option"');
                
                // Custom boolean as string
                expect(select).toContain('data-custom="true"');
                
                // Event handler
                expect(select).toContain('onChange=');
            });
        });

        it("should create a select element with options", () => {
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

        it("should create a select with custom props", () => {
            const select = new DOMInput("my-select", {}, { 
                required: true, 
                'data-testid': 'test-select'
            }).createSelect([]);
            expect(select).toContain('required');
            expect(select).toContain('data-testid="test-select"');
        });

        it("should handle empty array children", () => {
            const select = new DOMInput("my-select", {}).createSelect([]);
            expect(select).toBe('<select id="my-select" className="go11"></select>');
        });

        it("should create select with onChange handler and no other attributes", () => {
            const mockOnChange = () => {};
            const select = new DOMInput("", {}, {}).createSelect([], mockOnChange);
            expect(select).toContain('onChange');
        });

        it("should create select with both regular attributes and onChange handler", () => {
            const mockOnChange = () => {};
            const select = new DOMInput("test-select", {}, { 'data-testid': 'combined-select' })
                .createSelect([], mockOnChange);
            expect(select).toContain('data-testid="combined-select"');
            expect(select).toContain('onChange');
        });

        it("should create select with neither regular nor event attributes", () => {
            // Create a DOMInput instance with minimal props that won't generate attributes
            const select = new DOMInput("", {}, {}).createSelect([]);
            expect(select).toMatch(/<select[^>]*><\/select>/);
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

        it("should create an option with minimal attributes", () => {
            const option = new DOMInput("", {}).createOption("Plain Option", "plain");
            expect(option).toMatch(/<option [^>]*value="plain"[^>]*>Plain Option<\/option>/);
        });

        it("should handle option with custom class", () => {
            const option = new DOMInput("test-id", {
                classes: ["custom-option"]
            }).createOption("Styled Option", "styled", false);
            expect(option).toContain("custom-option");
        });

        it("should handle option with multiple custom properties", () => {
            const option = new DOMInput("", {}).createOption(
                "Custom Option", 
                "custom",
                true,
                {
                    disabled: true,
                    'data-testid': 'test-option',
                    'aria-label': 'Custom option'
                }
            );
            expect(option).toContain('selected');
            expect(option).toContain('disabled');
            expect(option).toContain('data-testid="test-option"');
            expect(option).toContain('aria-label="Custom option"');
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

        it("should create an optgroup with minimal attributes", () => {
            const optgroup = new DOMInput("", {}).createOptgroup("Group", []);
            expect(optgroup).toMatch(/<optgroup [^>]*label="Group"[^>]*><\/optgroup>/);
        });

        it("should handle empty children array", () => {
            const optgroup = new DOMInput("test-id", {}).createOptgroup("Empty Group", []);
            expect(optgroup).toBe('<optgroup id="test-id" className="go11" label="Empty Group"></optgroup>');
        });

        it("should handle optgroup with custom class", () => {
            const optgroup = new DOMInput("test-id", {
                classes: ["custom-group"]
            }).createOptgroup("Styled Group", []);
            expect(optgroup).toContain("custom-group");
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
