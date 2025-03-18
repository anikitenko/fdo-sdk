import {DOMNested, DOMButton} from "../src";

describe("DOMNested", () => {
    let domNested: DOMNested;
    let domButton: DOMButton;

    beforeEach(() => {
        jest.clearAllMocks();
        domNested = new DOMNested();
        domButton = new DOMButton();
    });

    it("should be defined", () => {
        expect(domNested).toBeDefined();
    });

    it("should create a div element with nested button", () => {
        const mockOnClick = () => {};
        const label = "Click Me";
        const options = { id: "test-button", blueprintClasses: ["custom-class"] };

        const button = domButton.createButton(label, mockOnClick, options);
        const nested = domNested.createNestedBlockDiv([button], {id: "test-div"});

        expect(nested.toString()).toBe(`<div id="test-div" className="go11"><button id="test-button" className="bp5-button custom-class go11" onClick={() => { }}>Click Me</button></div>`);
    });
})