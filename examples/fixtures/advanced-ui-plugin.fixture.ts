import {
  DOMButton,
  DOMNested,
  DOMSemantic,
  DOMTable,
  DOMText,
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Advanced UI composition.
 * Pattern intent: semantic layout + table + action controls with DOM helper classes.
 */
export default class AdvancedUIFixturePlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Advanced UI",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for advanced DOM-helper UI composition",
    icon: "layout",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  init(): void {
    this.info("Advanced UI fixture initialized");
  }

  render(): string {
    try {
      const text = new DOMText();
      const semantic = new DOMSemantic();
      const nested = new DOMNested();
      const table = new DOMTable();
      const button = new DOMButton();

    const statusTable = table.createTable(
      [
        table.createTableHead([
          table.createTableRow([
            table.createTableHeader(["Signal"]),
            table.createTableHeader(["Value"]),
          ]),
        ]),
        table.createTableBody([
          table.createTableRow([table.createTableCell(["Plugin"]), table.createTableCell([this._metadata.name])]),
          table.createTableRow([table.createTableCell(["Status"]), table.createTableCell(["Healthy"])]),
        ]),
      ],
      {
        style: {
          width: "100%",
          borderCollapse: "collapse",
        },
      }
    );

      return semantic.createMain(
        [
          semantic.createHeader([
            text.createHText(1, this._metadata.name),
            text.createPText(this._metadata.description),
          ]),
          semantic.createSection([statusTable], { style: { marginTop: "12px" } }),
          semantic.createFooter(
            [
              nested.createBlockDiv(
                [
                  button.createButton("Refresh", () => {}, {
                    style: {
                      padding: "8px 12px",
                      border: "1px solid #2c5cc5",
                      color: "#2c5cc5",
                      borderRadius: "4px",
                      cursor: "pointer",
                    },
                  }),
                ],
                { style: { marginTop: "12px" } }
              ),
            ],
            { style: { marginTop: "8px" } }
          ),
        ],
        { style: { padding: "16px" } }
      );
    } catch (error) {
      this.error(error as Error);
      return `
        <div style="padding:16px;color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:6px;">
          <h2 style="margin-top:0;">Fixture render fallback</h2>
          <p>Advanced UI fixture failed to render. Check plugin logs for details.</p>
        </div>
      `;
    }
  }
}

new AdvancedUIFixturePlugin();
