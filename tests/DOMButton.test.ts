import {DOMButton} from "../src";

describe("DOMButton", () => {
    let domButton: DOMButton;

    beforeEach(() => {
        vi.clearAllMocks();
        domButton = new DOMButton();
    });

    it("should be defined", () => {
        expect(domButton).toBeDefined();
    });

    it("should create a button element with correct properties", () => {
        const mockOnClick = () => {};
        const label = "Click Me";
        const options = { classes: ["custom-class"] };

        const button = domButton.createButton(label, mockOnClick, options, "test-button");

        expect(button.toString()).toBe(`<button id="test-button" class="pure-button custom-class go11" onClick={() => {}}>Click Me</button>`);
    });

    it("should apply default class when disableDefaultClass is not set", () => {
        const button = domButton.createButton("Default Button", () => {});
        expect(button.toString()).toContain("pure-button");
    });

    it("should exclude default class when disableDefaultClass is true", () => {
        const button = domButton.createButton("No Default", () => {}, { disableDefaultClass: true });
        expect(button.toString()).not.toContain("pure-button");
    });

    it("should create a static button without inline onClick handler", () => {
        const button = domButton.createStaticButton(
            "Run",
            { disableDefaultClass: true, classes: ["custom-action"] },
            "run-button",
            { type: "button" }
        );

        expect(button.toString()).toContain('id="run-button"');
        expect(button.toString()).toContain('class="custom-action');
        expect(button.toString()).toContain('type="button"');
        expect(button.toString()).toContain(">Run</button>");
        expect(button.toString()).not.toContain("onClick=");
    });
})
