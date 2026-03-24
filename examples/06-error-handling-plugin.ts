import {
  DOMButton,
  DOMNested,
  DOMText,
  FDO_SDK,
  FDOInterface,
  PluginMetadata,
  PluginRegistry,
  handleError,
} from "@anikitenko/fdo-sdk";

declare global {
  interface Window {
    fdoSDK: {
      sendMessage: (handler: string, data: any) => Promise<any>;
    };
  }
}

/**
 * Example 6: Error handling with @handleError and runtime-safe render fallback.
 */
export default class ErrorHandlingPlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Error Handling Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates @handleError usage across init/render/handlers",
    icon: "warning-sign",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  @handleError({
    errorMessage: "Plugin initialization failed",
  })
  init(): void {
    this.info("ErrorHandlingPlugin initialized");

    PluginRegistry.registerHandler("simulateSuccess", (data: unknown) => this.handleSuccess(data));
    PluginRegistry.registerHandler("simulateError", () => this.handleFailure());
  }

  @handleError()
  private handleSuccess(data: unknown): unknown {
    return {
      ok: true,
      received: data,
      at: new Date().toISOString(),
    };
  }

  @handleError({
    errorMessage: "Simulated backend handler failure",
  })
  private handleFailure(): never {
    throw new Error("Intentional handler exception for demo");
  }

  @handleError({
    returnErrorUI: true,
    errorUIRenderer: (error: Error) => {
      const text = new DOMText();
      const nested = new DOMNested();
      return nested.createBlockDiv(
        [
          text.createHText(2, "Plugin Error"),
          text.createPText(error.message),
        ],
        {
          style: {
            padding: "16px",
            border: "1px solid #d22",
            borderRadius: "6px",
            backgroundColor: "#fff7f7",
          },
        }
      );
    },
  })
  render(): string {
    const text = new DOMText();
    const nested = new DOMNested();
    const button = new DOMButton();

    return nested.createBlockDiv(
      [
        text.createHText(1, this._metadata.name),
        text.createPText(this._metadata.description),
        nested.createBlockDiv(
          [
            button.createButton(
              "Trigger Success Handler",
              () => {
                void window.fdoSDK.sendMessage("simulateSuccess", { source: "ui" });
              },
              {
                style: {
                  marginRight: "8px",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #1f8a3d",
                  color: "#1f8a3d",
                  backgroundColor: "#eefaf2",
                  cursor: "pointer",
                },
              }
            ),
            button.createButton(
              "Trigger Error Handler",
              () => {
                void window.fdoSDK.sendMessage("simulateError", {});
              },
              {
                style: {
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "1px solid #b32020",
                  color: "#b32020",
                  backgroundColor: "#fff2f2",
                  cursor: "pointer",
                },
              }
            ),
          ],
          { style: { marginTop: "12px" } }
        ),
      ],
      {
        style: {
          padding: "20px",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        },
      }
    );
  }
}

new ErrorHandlingPlugin();
