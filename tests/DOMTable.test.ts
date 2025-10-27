import {DOMTable} from "../src";

describe("DOMTable", () => {
    let domTable: DOMTable;

    beforeEach(() => {
        jest.clearAllMocks();
        domTable = new DOMTable();
    });

    it("should be defined", () => {
        expect(domTable).toBeDefined();
    });

    describe("createTable", () => {
        it("should create a table element", () => {
            const table = domTable.createTable(["<thead></thead>"]);
            expect(table).toContain("<table");
            expect(table).toContain("</table>");
        });

        it("should apply custom classes and styles", () => {
            const table = domTable.createTable([], { classes: ["custom-table"] });
            expect(table).toContain("custom-table");
        });

        it("should accept custom attributes", () => {
            const table = domTable.createTable([], { customAttributes: { "data-test": "value" } });
            expect(table).toContain('data-test="value"');
        });
    });

    describe("createTableHead", () => {
        it("should create a thead element", () => {
            const thead = domTable.createTableHead(["<tr></tr>"]);
            expect(thead).toContain("<thead");
            expect(thead).toContain("</thead>");
        });
    });

    describe("createTableBody", () => {
        it("should create a tbody element", () => {
            const tbody = domTable.createTableBody(["<tr></tr>"]);
            expect(tbody).toContain("<tbody");
            expect(tbody).toContain("</tbody>");
        });
    });

    describe("createTableFoot", () => {
        it("should create a tfoot element", () => {
            const tfoot = domTable.createTableFoot(["<tr></tr>"]);
            expect(tfoot).toContain("<tfoot");
            expect(tfoot).toContain("</tfoot>");
        });
    });

    describe("createTableRow", () => {
        it("should create a tr element", () => {
            const row = domTable.createTableRow(["<td>Cell</td>"]);
            expect(row).toContain("<tr");
            expect(row).toContain("</tr>");
        });
    });

    describe("createTableHeader", () => {
        it("should create a th element", () => {
            const header = domTable.createTableHeader(["Header"]);
            expect(header).toContain("<th");
            expect(header).toContain("</th>");
            expect(header).toContain("Header");
        });

        it("should accept scope attribute", () => {
            const header = domTable.createTableHeader(["Name"], {}, undefined, { scope: "col" });
            expect(header).toContain('scope="col"');
        });
    });

    describe("createTableCell", () => {
        it("should create a td element", () => {
            const cell = domTable.createTableCell(["Data"]);
            expect(cell).toContain("<td");
            expect(cell).toContain("</td>");
            expect(cell).toContain("Data");
        });

        it("should accept colspan and rowspan", () => {
            const cell = domTable.createTableCell(["Data"], {}, undefined, { colspan: "2", rowspan: "3" });
            expect(cell).toContain('colspan="2"');
            expect(cell).toContain('rowspan="3"');
        });
    });

    describe("createCaption", () => {
        it("should create a caption element", () => {
            const caption = domTable.createCaption(["Table Caption"]);
            expect(caption).toContain("<caption");
            expect(caption).toContain("</caption>");
            expect(caption).toContain("Table Caption");
        });
    });

    describe("integration", () => {
        it("should create a complete table structure", () => {
            const header1 = domTable.createTableHeader(["Name"]);
            const header2 = domTable.createTableHeader(["Age"]);
            const headerRow = domTable.createTableRow([header1, header2]);
            const thead = domTable.createTableHead([headerRow]);

            const cell1 = domTable.createTableCell(["John"]);
            const cell2 = domTable.createTableCell(["30"]);
            const dataRow = domTable.createTableRow([cell1, cell2]);
            const tbody = domTable.createTableBody([dataRow]);

            const table = domTable.createTable([thead, tbody]);

            expect(table).toContain("<table");
            expect(table).toContain("<thead");
            expect(table).toContain("<th");
            expect(table).toContain("Name");
            expect(table).toContain("<tbody");
            expect(table).toContain("<td");
            expect(table).toContain("John");
        });
    });
});
