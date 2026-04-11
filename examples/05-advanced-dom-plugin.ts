import {
  DOMInput,
  DOMLink,
  DOMNested,
  DOMSemantic,
  DOMTable,
  DOMText,
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
} from "@anikitenko/fdo-sdk";

/**
 * Example 5: Advanced DOM composition with table + semantic layout + forms.
 * This version is intentionally API-accurate to serve as a CI-safe reference.
 */
export default class AdvancedDOMPlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Advanced DOM Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates advanced composition with DOM helper classes",
    icon: "widget",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  init(): void {
    this.info("AdvancedDOMPlugin initialized", { plugin: this._metadata.name });
  }

  render(): string {
    try {
      const text = new DOMText();
      const nested = new DOMNested();
      const semantic = new DOMSemantic();
      const table = new DOMTable();
      const link = new DOMLink("docs-link", { style: { color: "#0b65d8", textDecoration: "none" } });

    const tableHeader = table.createTableHead([
      table.createTableRow([
        table.createTableHeader([text.createStrongText("Environment")]),
        table.createTableHeader([text.createStrongText("Status")]),
        table.createTableHeader([text.createStrongText("Latency")]),
      ]),
    ]);

    const tableBody = table.createTableBody([
      table.createTableRow([
        table.createTableCell(["Production"]),
        table.createTableCell([text.createSpanText("Healthy", { style: { color: "#1f8a3d", fontWeight: "600" } })]),
        table.createTableCell(["42ms"]),
      ]),
      table.createTableRow([
        table.createTableCell(["Staging"]),
        table.createTableCell([text.createSpanText("Degraded", { style: { color: "#b06d00", fontWeight: "600" } })]),
        table.createTableCell(["190ms"]),
      ]),
    ]);

    const dataTable = table.createTable(
      [
        table.createCaption([text.createStrongText("Runtime Health Snapshot")]),
        tableHeader,
        tableBody,
      ],
      {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "12px",
        },
      },
      "health-table"
    );

      const configurationSection = nested.createBlockDiv(
      [
        text.createPText(
          "This section demonstrates DOM helper composition for labeled fields without introducing interactive iframe form behavior.",
          { style: { color: "#667085" } }
        ),
        text.createLabelText("Operator name", "username-input", {
          style: { display: "block", marginBottom: "6px", fontWeight: "600" },
        }),
        new DOMInput(
          "username-input",
          {
            style: {
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              width: "280px",
            },
          },
          { defaultValue: "platform-team", readOnly: true }
        ).createInput("text"),
        nested.createBlockDiv(
          [
            text.createSmallText(
              "The advanced DOM helpers are useful for structured UI composition. For interactive handler wiring, see example 02."
            ),
          ],
          { style: { marginTop: "8px" } }
        ),
      ],
      {
        style: {
          padding: "12px",
          border: "1px solid #d9e2ef",
          borderRadius: "6px",
          marginTop: "14px",
        },
      }
    );

      const content = semantic.createMain(
        [
          semantic.createHeader([
            text.createHText(1, this._metadata.name),
            text.createPText(this._metadata.description, { style: { color: "#667085" } }),
          ]),
          semantic.createSection(
            [
              text.createHText(2, "Health Table"),
              dataTable,
            ],
            { style: { marginTop: "14px" } }
          ),
          semantic.createSection(
            [
              text.createHText(2, "Operator Form"),
              configurationSection,
            ],
            { style: { marginTop: "18px" } }
          ),
          semantic.createFooter(
            [
              text.createPText("Need more details?"),
              link.createLink("Open plugin author docs", "https://docs.sdk.fdo.alexvwan.me"),
            ],
            {
              style: {
                marginTop: "20px",
                paddingTop: "10px",
                borderTop: "1px solid #e5e7eb",
              },
            }
          ),
        ],
        {
          style: {
            padding: "20px",
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
            lineHeight: "1.5",
          },
        }
      );

      return semantic.renderHTML(content);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      const safeMessage = normalizedError.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      this.error(normalizedError);
      return `
        <div style="padding:20px;color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:6px;">
          <h2 style="margin-top:0;">Error rendering plugin</h2>
          <p>Advanced DOM example failed to render. Check plugin logs for details.</p>
          <p><strong>Reason:</strong> ${safeMessage}</p>
        </div>
      `;
    }
  }
}

new AdvancedDOMPlugin();
