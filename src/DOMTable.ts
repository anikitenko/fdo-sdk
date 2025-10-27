import {DOM} from "./DOM";

export class DOMTable extends DOM {
    /**
     * Creates a new DOMTable instance.
     * @constructor - Creates a new DOMTable instance.
     */
    constructor() {
        super();
    }

    /**
     * Creates a table element.
     * @param children - The children of the table (thead, tbody, tfoot, caption).
     * @param options - The options to apply to the table.
     * @param id - The id of the table.
     * @returns {string} - The rendered table element.
     * @uiName Create table
     * @example <caption>Create a table with headers and rows.</caption>
     * const thead = new DOMTable().createTableHead([...]);
     * const tbody = new DOMTable().createTableBody([...]);
     * const table = new DOMTable().createTable([thead, tbody]);
     */
    public createTable(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("table", props, children);
    }

    /**
     * Creates a thead element.
     * @param children - The children of the thead (typically tr elements with th).
     * @param options - The options to apply to the thead.
     * @param id - The id of the thead.
     * @returns {string} - The rendered thead element.
     * @uiName Create table head
     * @example <caption>Create a table head with header row.</caption>
     * const headerRow = new DOMTable().createTableRow([...]);
     * const thead = new DOMTable().createTableHead([headerRow]);
     */
    public createTableHead(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("thead", props, children);
    }

    /**
     * Creates a tbody element.
     * @param children - The children of the tbody (typically tr elements with td).
     * @param options - The options to apply to the tbody.
     * @param id - The id of the tbody.
     * @returns {string} - The rendered tbody element.
     * @uiName Create table body
     * @example <caption>Create a table body with data rows.</caption>
     * const row1 = new DOMTable().createTableRow([...]);
     * const row2 = new DOMTable().createTableRow([...]);
     * const tbody = new DOMTable().createTableBody([row1, row2]);
     */
    public createTableBody(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("tbody", props, children);
    }

    /**
     * Creates a tfoot element.
     * @param children - The children of the tfoot (typically tr elements).
     * @param options - The options to apply to the tfoot.
     * @param id - The id of the tfoot.
     * @returns {string} - The rendered tfoot element.
     * @uiName Create table foot
     * @example <caption>Create a table footer with summary row.</caption>
     * const footerRow = new DOMTable().createTableRow([...]);
     * const tfoot = new DOMTable().createTableFoot([footerRow]);
     */
    public createTableFoot(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("tfoot", props, children);
    }

    /**
     * Creates a tr (table row) element.
     * @param children - The children of the row (th or td elements).
     * @param options - The options to apply to the row.
     * @param id - The id of the row.
     * @returns {string} - The rendered tr element.
     * @uiName Create table row
     * @example <caption>Create a table row with cells.</caption>
     * const cell1 = new DOMTable().createTableCell(["Data 1"]);
     * const cell2 = new DOMTable().createTableCell(["Data 2"]);
     * const row = new DOMTable().createTableRow([cell1, cell2]);
     */
    public createTableRow(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("tr", props, children);
    }

    /**
     * Creates a th (table header cell) element.
     * @param children - The content of the header cell.
     * @param options - The options to apply to the header cell.
     * @param id - The id of the header cell.
     * @param otherProps - Additional properties like scope, colspan, rowspan.
     * @returns {string} - The rendered th element.
     * @uiName Create table header
     * @example <caption>Create a table header cell.</caption>
     * const header = new DOMTable().createTableHeader(["Name"], {}, undefined, { scope: "col" });
     */
    public createTableHeader(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string,
        otherProps?: Record<string, any>
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("th", {...props, ...otherProps}, children);
    }

    /**
     * Creates a td (table data cell) element.
     * @param children - The content of the data cell.
     * @param options - The options to apply to the data cell.
     * @param id - The id of the data cell.
     * @param otherProps - Additional properties like colspan, rowspan.
     * @returns {string} - The rendered td element.
     * @uiName Create table cell
     * @example <caption>Create a table data cell.</caption>
     * const cell = new DOMTable().createTableCell(["John Doe"]);
     */
    public createTableCell(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string,
        otherProps?: Record<string, any>
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("td", {...props, ...otherProps}, children);
    }

    /**
     * Creates a caption element for a table.
     * @param children - The content of the caption.
     * @param options - The options to apply to the caption.
     * @param id - The id of the caption.
     * @returns {string} - The rendered caption element.
     * @uiName Create caption
     * @example <caption>Create a table caption.</caption>
     * const caption = new DOMTable().createCaption(["Employee List"]);
     */
    public createCaption(
        children: any[],
        options: Partial<typeof DOM.DEFAULT_OPTIONS & { customAttributes?: Record<string, string> }> = DOM.DEFAULT_OPTIONS,
        id?: string
    ): string {
        const props = this.combineProperties("", options, id);

        if (options.customAttributes) {
            for (const [attr, value] of Object.entries(options.customAttributes)) {
                props[attr] = value;
            }
        }

        return this.createElement("caption", props, children);
    }
}
