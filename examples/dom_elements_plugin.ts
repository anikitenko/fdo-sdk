import { FDO_SDK, FDOInterface, PluginMetadata, DOMTable, DOMMedia, DOMSemantic, DOMNested, DOMInput } from "@anikitenko/fdo-sdk";

/**
 * Example plugin demonstrating the new DOM element creation capabilities.
 * This plugin showcases tables, media elements, semantic HTML5 structures,
 * ordered/definition lists, and select dropdowns.
 */
export default class DOMElementsExamplePlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "DOM Elements Example",
        version: "1.0.0",
        author: "FDO SDK Team",
        description: "Example plugin demonstrating new DOM element creation capabilities",
        icon: "dom-icon.png"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.log("DOM Elements Example Plugin initialized!");
    }

    render(): string {
        const domTable = new DOMTable();
        const domMedia = new DOMMedia();
        const domSemantic = new DOMSemantic();
        const domNested = new DOMNested();
        const domInput = new DOMInput("example-select", {});

        const tableHeader1 = domTable.createTableHeader(["Name"], {}, undefined, { scope: "col" });
        const tableHeader2 = domTable.createTableHeader(["Age"], {}, undefined, { scope: "col" });
        const tableHeader3 = domTable.createTableHeader(["Role"], {}, undefined, { scope: "col" });
        const headerRow = domTable.createTableRow([tableHeader1, tableHeader2, tableHeader3]);
        const thead = domTable.createTableHead([headerRow]);

        const cell1 = domTable.createTableCell(["John Doe"]);
        const cell2 = domTable.createTableCell(["30"]);
        const cell3 = domTable.createTableCell(["Developer"]);
        const dataRow1 = domTable.createTableRow([cell1, cell2, cell3]);

        const cell4 = domTable.createTableCell(["Jane Smith"]);
        const cell5 = domTable.createTableCell(["28"]);
        const cell6 = domTable.createTableCell(["Designer"]);
        const dataRow2 = domTable.createTableRow([cell4, cell5, cell6]);

        const tbody = domTable.createTableBody([dataRow1, dataRow2]);
        const caption = domTable.createCaption(["Employee Directory"]);
        const table = domTable.createTable([caption, thead, tbody], { classes: ["employee-table"] });

        const image = domMedia.createImage(
            "/assets/logo.png",
            "Company Logo",
            { classes: ["logo-image"] },
            undefined,
            { width: "200", height: "100", loading: "lazy" }
        );

        const header = domSemantic.createHeader(["<h1>Welcome to FDO SDK</h1>"]);
        const nav = domSemantic.createNav([
            "<a href='/'>Home</a>",
            "<a href='/docs'>Documentation</a>",
            "<a href='/examples'>Examples</a>"
        ]);
        const article = domSemantic.createArticle([
            "<h2>New DOM Elements</h2>",
            "<p>This plugin demonstrates the new DOM element creation capabilities.</p>"
        ]);
        const aside = domSemantic.createAside(["<h3>Quick Links</h3><ul><li>API Reference</li></ul>"]);
        const footer = domSemantic.createFooter(["<p>&copy; 2025 FDO SDK</p>"]);

        const listItem1 = domNested.createListItem(["Install the SDK"]);
        const listItem2 = domNested.createListItem(["Create your plugin"]);
        const listItem3 = domNested.createListItem(["Build and test"]);
        const orderedList = domNested.createOrderedList([listItem1, listItem2, listItem3], { classes: ["steps-list"] });

        const term1 = domNested.createDefinitionTerm(["FDO"]);
        const desc1 = domNested.createDefinitionDescription(["FlexDevOps - A desktop application framework"]);
        const term2 = domNested.createDefinitionTerm(["SDK"]);
        const desc2 = domNested.createDefinitionDescription(["Software Development Kit"]);
        const definitionList = domNested.createDefinitionList([term1, desc1, term2, desc2], { classes: ["glossary"] });

        const option1 = new DOMInput("", {}).createOption("Select an option", "", true);
        const option2 = new DOMInput("", {}).createOption("Option A", "a");
        const option3 = new DOMInput("", {}).createOption("Option B", "b");
        const option4 = new DOMInput("", {}).createOption("Option C", "c");
        const select = domInput.createSelect([option1, option2, option3, option4], () => {
            console.log("Selection changed");
        });

        const groupOpt1 = new DOMInput("", {}).createOption("Item 1", "1");
        const groupOpt2 = new DOMInput("", {}).createOption("Item 2", "2");
        const optgroup1 = new DOMInput("", {}).createOptgroup("Group 1", [groupOpt1, groupOpt2]);

        const groupOpt3 = new DOMInput("", {}).createOption("Item 3", "3");
        const groupOpt4 = new DOMInput("", {}).createOption("Item 4", "4");
        const optgroup2 = new DOMInput("", {}).createOptgroup("Group 2", [groupOpt3, groupOpt4]);

        const groupedSelect = new DOMInput("grouped-select", {}).createSelect([optgroup1, optgroup2]);

        const mainContent = domSemantic.createMain([
            header,
            nav,
            "<h2>Example 1: Data Table</h2>",
            table,
            "<h2>Example 2: Image</h2>",
            image,
            "<h2>Example 3: Semantic Structure</h2>",
            article,
            aside,
            "<h2>Example 4: Ordered List</h2>",
            orderedList,
            "<h2>Example 5: Definition List</h2>",
            definitionList,
            "<h2>Example 6: Select Dropdown</h2>",
            select,
            "<h2>Example 7: Grouped Select</h2>",
            groupedSelect,
            footer
        ]);

        return mainContent;
    }
}
