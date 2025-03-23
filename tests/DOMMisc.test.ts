import {DOMMisc} from "../src";

describe("DOMMisc", () => {
    let domMisc: DOMMisc;

    beforeEach(() => {
        jest.clearAllMocks();
        domMisc = new DOMMisc();
    });

    it("should be defined", () => {
        expect(domMisc).toBeDefined();
    });

    it("should create a divider with correct default options", () => {
        const divider = domMisc.divider({classes: ["test"], id: "test"});
        expect(divider.toString()).toBe(`<hr id="test" className="test go2473750146"></hr>`)
    })
})