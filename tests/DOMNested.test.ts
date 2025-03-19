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
        const options = { id: "test-button", blueprintClasses: ["custom-class"] };

        const button = domButton.createButton(label, mockOnClick, options);
        const text = domText.createHText(1, "Hello World", {id: "test-text"});
        const nested = domNested.createNestedBlockDiv([button, text], {id: "test-div"});

        expect(nested.toString()).toBe(`<div id="test-div" className="go11"><button id="test-button" className="bp5-button custom-class go11" onClick={() => { }}>Click Me</button><h1 id="test-text" className="go11">Hello World</h1></div>`);
    });
})