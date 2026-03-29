import { FDOInterface, FDO_SDK, PluginMetadata, PluginRegistry, handleError } from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Error-safe lifecycle and handler behavior.
 * Pattern intent: deterministic fallback behavior for init/render/handler failures.
 */
export default class ErrorHandlingFixturePlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Error Handling",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for resilient error handling",
    icon: "warning-sign",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  @handleError({ errorMessage: "Fixture init failed" })
  init(): void {
    PluginRegistry.registerHandler("fixture:ok", (data: unknown) => ({ success: true, data }));
    PluginRegistry.registerHandler("fixture:fail", () => {
      throw new Error("Intentional fixture handler failure");
    });
  }

  @handleError({
    returnErrorUI: true,
    errorUIRenderer: (error: Error) => `
      <div style={{ padding: "16px", border: "1px solid #d33", color: "#a11" }}>
        <h2>Plugin Error</h2>
        <p>${error.message}</p>
      </div>
    `,
  })
  render(): string {
    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Trigger "fixture:fail" from UI/backend to validate safe fallback behavior.</p>
      </div>
    `;
  }
}

new ErrorHandlingFixturePlugin();
