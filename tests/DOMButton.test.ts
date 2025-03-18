import {DOMButton} from "../src";

describe("DOMButton", () => {
    let domButton: DOMButton;

    beforeEach(() => {
        jest.clearAllMocks();
        domButton = new DOMButton();
    });

    it("should be defined", () => {
        expect(domButton).toBeDefined();
    });

    it("should create a button element with correct properties", () => {
        const mockOnClick = () => {};
        const label = "Click Me";
        const options = { id: "test-button", blueprintClasses: ["custom-class"] };

        const button = domButton.createButton(label, mockOnClick, options);

        expect(button.toString()).toBe(`<button id="test-button" className="bp5-button custom-class go11" onClick={() => { }}>Click Me</button>`);
    });

    it("should apply default class when disableDefaultClass is not set", () => {
        const button = domButton.createButton("Default Button", () => {});
        expect(button.toString()).toContain("bp5-button");
    });

    it("should exclude default class when disableDefaultClass is true", () => {
        const button = domButton.createButton("No Default", () => {}, { disableDefaultClass: true });
        expect(button.toString()).not.toContain("bp5-button");
    });
})