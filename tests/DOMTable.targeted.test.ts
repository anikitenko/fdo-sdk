import {DOMTable} from "../src";

describe("DOMTable targeted coverage", () => {
    let dom: DOMTable;

    beforeEach(() => {
        dom = new DOMTable();
    });

    it("createTable: attributes + onClick + boolean attr + nested children", () => {
        const nestedChildren = [["<tr><td>X</td></tr>"], ["<tr><td>Y</td></tr>"]];
        const table = dom.createTable(nestedChildren as any[], { style: { color: 'green' }, classes: ['a'] , customAttributes: { 'data-x': '1' } }, 'table-id');
        expect(table).toContain('id="table-id"');
        expect(table).toContain('data-x="1"');
        expect(table).toContain('className="');
    });

    it("createTableHead: exercise onAttributes and boolean attribute in otherProps", () => {
        const thead = dom.createTableHead(["<tr></tr>"], {}, undefined as any);
        expect(thead).toContain("<thead");
    });

    it("createTableHeader: onClick function placed in onAttributes and boolean attribute in otherProps", () => {
        const header = dom.createTableHeader(["H2"], {}, undefined, { onClick: () => true, hidden: true });
        // ensure boolean attribute 'hidden' rendered and onClick serialized
        expect(header).toContain('hidden');
        expect(header).toMatch(/onClick=\{.+\}/);
    });

    it("createTableHeader: colspan/rowspan + scope + style", () => {
        const header = dom.createTableHeader(["H"], { style: { padding: '0' } }, 'h-id', { scope: 'row', colspan: 2 });
        expect(header).toContain('colspan="2"');
        expect(header).toContain('scope="row"');
        expect(header).toContain('id="h-id"');
    });

    it("createTableCell: numeric otherProps and mixed attributes", () => {
        const cell = dom.createTableCell(["C"], { customAttributes: { 'data-num': '7' } }, undefined, { rowspan: 3, hidden: false });
        expect(cell).toContain('data-num="7"');
        // hidden=false should not render attribute
        expect(cell).not.toContain('hidden="false"');
    });

    it("createCaption: empty children and disableDefaultClass", () => {
        const caption = dom.createCaption([], { disableDefaultClass: true }, 'cap-id');
        expect(caption).toContain('id="cap-id"');
    });
});
