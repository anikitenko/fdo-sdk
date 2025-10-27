import {DOMTable} from "../src";

describe("DOMTable coverage extras 2", () => {
    let domTable: DOMTable;

    beforeEach(() => {
        domTable = new DOMTable();
    });

    it("should flatten nested children arrays", () => {
        const nested = [["<tr><td>A</td></tr>"], [["<tr><td>B</td></tr>"]], null];
        const table = domTable.createTable(nested as any[]);
        expect(table).toContain("<table");
        expect(table).toContain("<tr>");
        expect(table).toContain("<td>A</td>");
        expect(table).toContain("<td>B</td>");
    });

    it("should accept explicit id parameter", () => {
        const id = 'my-table-id';
        const table = domTable.createTable([], {}, id);
        expect(table).toContain(`id="${id}"`);
    });
});
