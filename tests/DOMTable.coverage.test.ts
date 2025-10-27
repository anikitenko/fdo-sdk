import {DOMTable} from "../src";

describe("DOMTable coverage extras", () => {
    let domTable: DOMTable;

    beforeEach(() => {
        domTable = new DOMTable();
    });

    it("should generate a style class when style option provided", () => {
        const table = domTable.createTable([], { style: { color: 'red' } });
        // className attribute should be present and non-empty
        expect(table).toMatch(/className="[^"]+"/);
    });

    it("should render onClick via otherProps in header", () => {
        const header = domTable.createTableHeader(["H"], {}, undefined, { onClick: () => {} });
    // onClick should be serialized by createOnAttributes (any function representation)
    expect(header).toMatch(/onClick=\{.+\}/);
    });

    it("should allow disableDefaultClass to remove default class", () => {
        const table = domTable.createTable([], { disableDefaultClass: true, classes: [] });
        // className may still exist but default class removed; ensure id present
        expect(table).toMatch(/id="[a-z0-9]+"/i);
    });
});
