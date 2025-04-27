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
})