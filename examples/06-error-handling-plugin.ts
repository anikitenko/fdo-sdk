/**
 * Example 6: Error handling with @handleError and runtime-safe render fallback.
 *
 * This example demonstrates how to use the SDK error-handling decorator without
 * mixing backend error logic, iframe event wiring, and DOM-helper composition.
 *
 * Compatible with SDK v1.x
 *
 * Learning Objectives:
 * - Use `@handleError()` on `init()`, backend handlers, and `render()`
 * - Keep handler failures inside structured backend responses
 * - Trigger backend handlers from iframe UI via `UI_MESSAGE`
 * - Provide a render fallback that remains safe in mixed host/runtime conditions
 * - Understand the difference between a handled backend error and a render failure
 *
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Display controls to trigger a successful and a failing backend handler
 * 2. Show handler results in the UI without crashing the plugin
 * 3. Demonstrate that `@handleError()` converts backend failures into structured responses
 * 4. Provide a render fallback if the render path itself throws
 * 5. Log the underlying error details through the SDK logger
 */

import {
  FDO_SDK,
  FDOInterface,
  PluginMetadata,
  PluginRegistry,
  handleError,
} from "@anikitenko/fdo-sdk";

declare global {
  interface Window {
    createBackendReq: (type: string, data?: any) => Promise<any>;
  }
}

/**
 * ErrorHandlingPlugin demonstrates runtime-safe error handling patterns.
 */
export default class ErrorHandlingPlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Error Handling Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates @handleError usage across init, render, and backend handlers",
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
    errorUIRenderer: (error: Error) => `
      <div
        style={{
          padding: "16px",
          border: "1px solid #d22",
          borderRadius: "6px",
          backgroundColor: "#fff7f7"
        }}
      >
        <h2>Plugin Error</h2>
        <p>${error.message}</p>
      </div>
    `,
  })
  render(): string {
    return `
      <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
        <h1>${this._metadata.name}</h1>
        <p>${this._metadata.description}</p>

        <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
          <h3>Backend Handler Outcomes</h3>
          <p>Use these buttons to trigger a successful handler and a failing handler protected by <code>@handleError()</code>.</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            <button
              id="trigger-success-handler"
              type="button"
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #1f8a3d",
                color: "#1f8a3d",
                backgroundColor: "#eefaf2",
                cursor: "pointer"
              }}
            >
              Trigger Success Handler
            </button>
            <button
              id="trigger-error-handler"
              type="button"
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #b32020",
                color: "#b32020",
                backgroundColor: "#fff2f2",
                cursor: "pointer"
              }}
            >
              Trigger Error Handler
            </button>
          </div>
          <pre
            id="error-handling-result"
            style={{
              marginTop: "16px",
              whiteSpace: "pre-wrap",
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              padding: "12px",
              borderRadius: "6px"
            }}
          ></pre>
        </div>

        <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff7ed", borderRadius: "6px" }}>
          <h3>What This Example Teaches</h3>
          <ul>
            <li><strong>init():</strong> register handlers under decorator protection</li>
            <li><strong>backend handlers:</strong> return structured success or handled error responses</li>
            <li><strong>render():</strong> stay synchronous and provide a safe fallback path</li>
            <li><strong>iframe UI:</strong> use <code>UI_MESSAGE</code> for handler invocation</li>
          </ul>
        </div>
      </div>
    `;
  }

  renderOnLoad(): string {
    return `
      () => {
        const callHandler = (handler, content = {}) =>
          window.createBackendReq("UI_MESSAGE", { handler, content });

        const successButton = document.getElementById("trigger-success-handler");
        const errorButton = document.getElementById("trigger-error-handler");
        const output = document.getElementById("error-handling-result");
        if (!successButton || !errorButton || !output) return;

        const runHandler = async (handler, content = {}) => {
          output.textContent = "Running...";
          try {
            const result = await callHandler(handler, content);
            output.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            output.textContent = JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }, null, 2);
          }
        };

        successButton.addEventListener("click", () => {
          void runHandler("simulateSuccess", { source: "ui" });
        });

        errorButton.addEventListener("click", () => {
          void runHandler("simulateError", {});
        });
      }
    `;
  }
}

new ErrorHandlingPlugin();
